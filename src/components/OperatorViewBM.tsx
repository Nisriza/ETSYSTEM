import React, { useState, useEffect } from 'react';
import { User, Station, Holiday } from '../types.ts';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, RefreshCw, CheckCircle2, ChevronRight, 
  Calendar, Clock, AlertCircle, Loader2, 
  User as UserIcon, LogOut, Sparkles, AlertTriangle, CalendarDays, Download
} from 'lucide-react';

interface OperatorViewProps {
  user: User;
  token: string;
}

export default function OperatorViewBM({ user, token }: OperatorViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'predict' | 'profile' | 'reports'>('analytics');

  // Analytics states
  const [analyticsData, setAnalyticsData] = useState<{
    routesAnalytics: { name: string; ridership: number }[];
    peakHours: { hour: string; passengers: number }[];
    busiestRoutes: { name: string; ridership: number }[];
  } | null>(null);

  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Prediction states
  const [stations, setStations] = useState<Station[]>([]);
  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [travelTime, setTravelTime] = useState('08:00');
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<{
    predictedRidership: number;
    demandLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  } | null>(null);
  const [routeStatus, setRouteStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [suggestions, setSuggestions] = useState<Station[]>([]);
  const [step, setStep] = useState(1);

  // Holidays state
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);

  // Reports state
  const [selMonth, setSelMonth] = useState<number>(new Date().getMonth() + 1);
  const [selYear, setSelYear] = useState<number>(new Date().getFullYear());
  const [loadingReport, setLoadingReport] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [reportError, setReportError] = useState<string | null>(null);

  // Profile states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchStations();
    fetchHolidays();
    fetchAvailableYears();
  }, []);

  const handleSessionError = (res: Response) => {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('user_token');
      window.location.href = '/';
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const d = new Date();
      const res = await fetch(`/api/operator/analytics?month=${d.getMonth() + 1}&year=${d.getFullYear()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchStations = async () => {
    try {
      const res = await fetch('/api/stations');
      if (res.ok) setStations(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/holidays?scope=year');
      if (res.ok) {
        const all: Holiday[] = await res.json();
        const today = new Date();
        const nearest = all
          .filter((h) => new Date(h.date) >= today)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 2);
        setUpcomingHolidays(nearest);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAvailableYears = async () => {
    try {
      const res = await fetch('/api/operator/report-months', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data: { month: number; year: number }[] = await res.json();
        const years = [...new Set(data.map((r) => r.year))].sort((a, b) => b - a);
        setAvailableYears(years);
        if (years.length > 0) setSelYear(years[0]);
      }
    } catch (e) { console.error(e); }
  };

  const downloadReport = async () => {
    setLoadingReport(true);
    setReportError(null);
    try {
      const res = await fetch(`/api/operator/report-csv?month=${selMonth}&year=${selYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Muat turun gagal' }));
        throw new Error(err.error || 'Muat turun gagal');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-penumpang-${selMonth}-${selYear}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) { setReportError(e.message || 'Muat turun gagal'); console.error(e); }
    finally { setLoadingReport(false); }
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => { setSuccessMsg(null); }, 4500);
  };

  const getMonthName = (m: number) => {
    const list = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
      'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
    return list[m - 1];
  };

  // Route check & prediction
  const handleCheckRoute = async () => {
    if (!originId || !destId) return;
    if (originId === destId) { setRouteStatus('unavailable'); return; }
    setRouteStatus('checking');
    try {
      const res = await fetch(`/api/routes/check?origin_id=${originId}&destination_id=${destId}`);
      const data = await res.json();
      if (data.available) {
        setRouteStatus('available');
        setSuggestions([]);
      } else {
        setSuggestions(data.suggestions || []);
        setRouteStatus('unavailable');
      }
    } catch { setRouteStatus('unavailable'); }
  };

  const handleContinueToPredict = () => {
    setStep(2);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTravelDate(tomorrow.toISOString().split('T')[0]);
  };

  const runPrediction = async () => {
    if (!travelDate || !travelTime) return;
    setPredicting(true);
    setPredictError(null);
    const originName = stations.find(s => s.id === parseInt(originId))?.name || '';
    const destName = stations.find(s => s.id === parseInt(destId))?.name || '';
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ origin: originName, destination: destName, date: travelDate, time: travelTime + ":00" })
      });
      if (res.ok) {
        setPredictionResult(await res.json());
        setStep(3);
      } else {
        const data = await res.json();
        if (res.status === 403 || res.status === 401) { handleSessionError(res); return; }
        setPredictError(data.error || 'Ramalan gagal. Cuba lagi.');
      }
    } catch (e) { setPredictError('Ralat rangkaian.'); }
    finally { setPredicting(false); }
  };

  const resetSearch = () => {
    setOriginId('');
    setDestId('');
    setRouteStatus('idle');
    setStep(1);
    setPredictionResult(null);
  };

  const getDemandColor = (level: string | null) => {
    switch (level) {
      case 'Low': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Very High': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getDemandBarColor = (level: string) => {
    switch (level) {
      case 'Low': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'High': return '#f97316';
      case 'Very High': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  // Compute state-level analytics from route data

  const stationState: Record<string, string> = {
    'Butterworth': 'Penang', 'Penang Sentral': 'Penang',
    'Ipoh': 'Perak', 'Taiping': 'Perak', 'Teluk Intan': 'Perak',
    'KL Sentral': 'Kuala Lumpur', 'KL': 'Kuala Lumpur',
    'Padang Besar': 'Perlis', 'Arau': 'Perlis',
    'Gemas': 'Negeri Sembilan', 'Seremban': 'Negeri Sembilan',
    'Pulau Sebang/Tampin': 'Melaka',
    'JB Sentral': 'Johor', 'Johor Bahru': 'Johor',
    'Kuantan': 'Pahang',
    'Alor Setar': 'Kedah',
    'Kota Bharu': 'Kelantan',
    'Kuala Terengganu': 'Terengganu',
  };
  const getStateFromStation = (name: string) => {
    const station = stations.find(s => s.name === name);
    if (station?.state) return station.state;
    return stationState[name] || null;
  };
  const getStateAnalytics = () => {
    if (!analyticsData) return [];
    const allStates = new Set<string>();
    for (const s of stations) { if (s.state) allStates.add(s.state); }
    for (const v of Object.values(stationState)) allStates.add(v);
    if (allStates.size === 0) return [];
    const stateMap: Record<string, number> = {};
    for (const state of allStates) stateMap[state] = 0;
    analyticsData.routesAnalytics.forEach(route => {
      const originName = route.name.split(' → ')[0];
      const state = getStateFromStation(originName);
      if (state && stateMap[state] !== undefined) stateMap[state] += route.ridership;
    });
    return Object.entries(stateMap).map(([state, ridership]) => ({ state, ridership }));
  };

  // Password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);
    if (newPassword !== confirmPassword) { setPassError('Kata laluan baru dan pengesahan tidak sepadan.'); return; }
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    if (newPassword.length < 8 || !hasLowercase || !hasUppercase || !hasNumber || !hasSymbol) {
      setPassError('Kata laluan mesti sekurang-kurangnya 8 aksara dengan huruf kecil, huruf besar, nombor, dan simbol.');
      return;
    }
    setChangingPass(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPassSuccess('Kata laluan telah dikemas kini dengan selamat!');
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        showToast('Bukti kelayakan keselamatan dikemas kini.');
      } else {
        if (res.status === 403 || res.status === 401) { handleSessionError(res); return; }
        setPassError(data.error || 'Gagal mengemas kini kata laluan.');
      }
    } catch { setPassError('Ralat rangkaian.'); }
    finally { setChangingPass(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword })
      });
      if (res.ok) { localStorage.removeItem('token'); window.location.href = '/'; }
      else { alert('Gagal memadam akaun.'); setDeletingAccount(false); }
    } catch { setDeletingAccount(false); alert('Ralat rangkaian.'); }
  };

  return (
    <div className="w-full" id="operator-dashboard">
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-2 animate-bounce max-w-sm" id="toast-op">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Dashboard Mini-menu */}
      <div className="bg-white border-b border-[#e2e8f0] sticky top-0 z-10 px-4 md:px-8 py-3" id="op-nav-menu">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-2.5 bg-[#4f46e5]/10 border border-[#4f46e5]/20 rounded-xl text-[#4f46e5]">
              <BarChart3 className="h-4.5 w-4.5" />
            </span>
            <div id="welcome-op">
              <p className="text-[10px] font-extrabold text-[#64748b] tracking-wider leading-none">{'KONSOL PENGENDALI'}</p>
              <h2 className="text-sm font-bold text-[#1e293b] font-display mt-0.5">{'Selamat kembali, '}{user.username}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2" id="op-tab-select">
            <button
              id="subtab-btn-analytics"
              onClick={() => { setActiveSubTab('analytics'); fetchAnalytics(); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'analytics' 
                  ? 'bg-[#4f46e5] text-white shadow-sm border border-[#4338ca]' 
                  : 'text-[#64748b] bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]'
              }`}
            >
              {'Laman/Analitis'}
            </button>
            <button
              id="subtab-btn-predict"
              onClick={() => setActiveSubTab('predict')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'predict' 
                  ? 'bg-[#4f46e5] text-white shadow-sm border border-[#4338ca]' 
                  : 'text-[#64748b] bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]'
              }`}
            >
              {'Ramal Permintaan'}
            </button>
            <button
              id="subtab-btn-profile"
              onClick={() => setActiveSubTab('profile')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'profile' 
                  ? 'bg-[#4f46e5] text-white shadow-sm border border-[#4338ca]' 
                  : 'text-[#64748b] bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]'
              }`}
            >
              {'Tetapan Profil'}
            </button>
            <button
              id="subtab-btn-reports"
              onClick={() => { setActiveSubTab('reports'); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'reports' 
                  ? 'bg-[#4f46e5] text-white shadow-sm border border-[#4338ca]' 
                  : 'text-[#64748b] bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]'
              }`}
            >
              {'Laporan'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto" id="operator-viewport">
        {/* ==================== ANALYTICS VIEW ==================== */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-8" id="analytics-grid">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="analytics-header">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-extrabold text-slate-800 text-lg">{'Trend Permintaan Perjalanan Dinamik'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{'Ramalan penumpang merentas semua laluan transit dan waktu puncak.'}</p>
                </div>
                <button
                  id="btn-op-refresh"
                  onClick={fetchAnalytics}
                  disabled={loadingAnalytics}
                  className="p-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 inline ${loadingAnalytics ? 'animate-spin' : ''}`} /> {'Segerakkan'}
                </button>
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-semibold">{'Memuatkan data penumpang...'}</p>
              </div>
            ) : analyticsData ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="op-charts-row">
                  {/* CHART 1: Bar chart of ridership by state */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm" id="chart-routes-wrapper">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-indigo-500" /> {'Penumpang mengikut Negeri'}
                    </h4>
                    <div className="h-72 w-full" id="routes-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getStateAnalytics()} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="state" tick={{ fontSize: 9 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                          <Tooltip wrapperStyle={{ fontSize: 11, fontFamily: 'sans-serif' }} />
                          <Bar dataKey="ridership" name={'Jumlah Penumpang'} fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CHART 2: Peak demand periods */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm" id="chart-hours-wrapper">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-indigo-500" /> {'Beban Perjalanan Harian'}
                    </h4>
                    <div className="h-72 w-full" id="hours-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.peakHours} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                          <Tooltip wrapperStyle={{ fontSize: 11, fontFamily: 'sans-serif' }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Line type="monotone" dataKey="passengers" name={'Anggaran Penumpang'} stroke="#d97706" strokeWidth={2.5} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Busiest Routes Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm" id="table-busiest-wrapper">
                  <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider">
                    {'Kedudukan Transit mengikut Negeri'}
                  </h4>
                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                          <th className="p-3">{'Kedudukan'}</th>
                          <th className="p-3">{'Negeri'}</th>
                          <th className="p-3">{'Jumlah Penumpang'}</th>
                          <th className="p-3 text-right">{'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                        {getStateAnalytics().sort((a, b) => b.ridership - a.ridership).map((state, i) => (
                          <tr key={state.state} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-slate-400">#{i + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{state.state}</td>
                            <td className="p-3 font-mono">{state.ridership.toLocaleString()} {'penumpang'}</td>
                            <td className="p-3 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                state.ridership > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-200'
                              }`}>
                                {state.ridership > 0 ? 'Aktif' : 'Tiada Data'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-slate-100 shadow-sm">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">{'Tidak dapat mengira trend model. Klik Segerakkan untuk mencuba lagi.'}</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== PREDICT DEMAND TAB ==================== */}
        {activeSubTab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="predict-grid">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8" id="predict-flow-card">
              <div className="mb-6" id="predict-header">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">{'Diagnostik Berkuasa ML'}</span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-2">{'Perancang Ramalan Permintaan Laluan'}</h3>
                <p className="text-xs text-slate-500 mt-1">{'Pilih asal, destinasi, tarikh dan masa untuk menganggar tahap permintaan.'}</p>
              </div>

              {/* STEP 1: Select stations */}
              {step >= 1 && (
                <div className="space-y-4 border-l-2 border-slate-100 pl-4 py-1" id="step-1-block">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-4">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full inline-flex items-center justify-center text-xs">1</span>
                    {'Pilih Stesen'}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Stesen Asal'}</label>
                      <select
                        id="select-origin"
                        disabled={step > 1}
                        className="w-full py-2 px-3 border border-slate-250 bg-white rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                        value={originId}
                        onChange={(e) => { setOriginId(e.target.value); setRouteStatus('idle'); }}
                      >
                        <option value="">{'Pilih asal...'}</option>
                        {Array.from(new Set(stations.map(s => s.state || 'Other'))).map(stateName => (
                          <optgroup key={stateName} label={`${stateName}`} className="font-bold text-slate-800 bg-slate-50 text-xs">
                            {stations.filter(s => (s.state || 'Other') === stateName).map(s => (
                              <option key={s.id} value={s.id} className="font-normal text-slate-700 bg-white text-sm">{s.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Stesen Destinasi'}</label>
                      <select
                        id="select-destination"
                        disabled={step > 1}
                        className="w-full py-2 px-3 border border-slate-250 bg-white rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                        value={destId}
                        onChange={(e) => { setDestId(e.target.value); setRouteStatus('idle'); }}
                      >
                        <option value="">{'Pilih destinasi...'}</option>
                        {Array.from(new Set(stations.map(s => s.state || 'Other'))).map(stateName => (
                          <optgroup key={stateName} label={`${stateName}`} className="font-bold text-slate-800 bg-slate-50 text-xs">
                            {stations.filter(s => (s.state || 'Other') === stateName).map(s => (
                              <option key={s.id} value={s.id} className="font-normal text-slate-700 bg-white text-sm">{s.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>

                  {step === 1 && originId && destId && (
                    <button
                      id="btn-verify-route"
                      onClick={handleCheckRoute}
                      disabled={routeStatus === 'checking'}
                      className="mt-2 bg-indigo-600 text-white rounded-xl px-4 py-2 text-xs font-medium hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1"
                    >
                      {routeStatus === 'checking' ? 'Mengesahkan laluan...' : 'Sahkan Ketersediaan Laluan'}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}

                  {routeStatus === 'available' && step === 1 && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center justify-between" id="alert-valid-route">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold">{'Laluan aktif ditemui dalam jadual stesen!'}</span>
                      </div>
                      <button
                        id="btn-confirm-continue"
                        onClick={handleContinueToPredict}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1 rounded-lg transition"
                      >
                        {'Teruskan ke Ramalan'}
                      </button>
                    </div>
                  )}

                  {routeStatus === 'unavailable' && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl" id="alert-invalid-route">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="font-semibold">{'Laluan tidak tersedia secara langsung.'}</span>
                      </div>
                      {suggestions.length > 0 && (
                        <div className="ml-6">
                          <p className="font-semibold text-amber-800 mb-1">{'Cuba destinasi bersambung ini:'}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {suggestions.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => { setDestId(String(s.id)); setRouteStatus('idle'); setSuggestions([]); }}
                                className="text-xs bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer"
                              >
                                {s.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Date & time */}
              {step >= 2 && (
                <div className="mt-8 border-l-2 border-indigo-200 pl-4 py-1" id="step-2-block">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-4">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full inline-flex items-center justify-center text-xs">2</span>
                    {'Masukkan Tarikh & Masa Berlepas'}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Tarikh Perjalanan'}</label>
                      <input
                        id="input-travel-date"
                        disabled={step > 2}
                        type="date"
                        className="w-full py-2 px-3 border border-slate-250 bg-white rounded-xl text-sm focus:outline-none focus:border-indigo-600"
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Anggaran Masa Perjalanan'}</label>
                      <input
                        id="input-travel-time"
                        disabled={step > 2}
                        type="time"
                        className="w-full py-2 px-3 border border-slate-250 bg-white rounded-xl text-sm focus:outline-none focus:border-indigo-600"
                        value={travelTime}
                        onChange={(e) => setTravelTime(e.target.value)}
                      />
                    </div>
                  </div>

                  {predictError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl flex items-center gap-2 text-xs" id="predict-error">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                      <span className="font-semibold">{predictError}</span>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="mt-4 flex gap-2">
                      <button
                        id="btn-run-prediction"
                        onClick={runPrediction}
                        disabled={predicting || !travelDate}
                        className="bg-indigo-600 text-white rounded-xl px-5 py-2 text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {predicting ? 'Memproses model...' : 'Kira Ramalan Permintaan'}
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id="btn-back-step1"
                        onClick={resetSearch}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-4 py-2 text-xs font-semibold transition"
                      >
                        {'Tukar Laluan'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Results Display */}
              {step === 3 && predictionResult && (
                <div className="mt-8 border-l-2 border-emerald-500 pl-4 py-1" id="step-3-block">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-4">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full inline-flex items-center justify-center text-xs">3</span>
                    {'Laporan Diagnostik & Anggaran'}
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl md:flex items-center justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'Ramalan Penumpang'}</p>
                      <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                        {predictionResult.predictedRidership} <span className="text-sm font-sans font-medium text-slate-500">{'penumpang/kereta api'}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {stations.find(s => s.id === parseInt(originId))?.name}{' ➔ '}{stations.find(s => s.id === parseInt(destId))?.name}{' pada '}{travelDate}{' ('}{travelTime}{')'}
                      </p>
                    </div>

                    <div className="mt-4 md:mt-0 text-center md:text-right">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">{'Beban Penumpang'}</p>
                      <span className={`inline-flex items-center px-4 py-1 border text-sm font-bold rounded-full ${getDemandColor(predictionResult.demandLevel)}`}>
                        {({ Low: 'Rendah', Medium: 'Sederhana', High: 'Tinggi', 'Very High': 'Sangat Tinggi' } as Record<string, string>)[predictionResult.demandLevel] || predictionResult.demandLevel}{' Permintaan'}
                      </span>
                    </div>
                  </div>

                  {/* Demand Level Visualization for the selected date */}
                  <div className="mt-6 p-6 bg-white border border-slate-100 rounded-2xl" id="demand-visualization">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-indigo-500" /> {'Visualisasi Tahap Permintaan untuk '}{travelDate}
                    </h4>
                    <div className="h-48 w-full" id="demand-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Rendah', threshold: 50, current: predictionResult.demandLevel === 'Low' ? predictionResult.predictedRidership : 0 },
                          { name: 'Sederhana', threshold: 100, current: predictionResult.demandLevel === 'Medium' ? predictionResult.predictedRidership : 0 },
                          { name: 'Tinggi', threshold: 250, current: predictionResult.demandLevel === 'High' ? predictionResult.predictedRidership : 0 },
                          { name: 'Sangat Tinggi', threshold: 650, current: predictionResult.demandLevel === 'Very High' ? predictionResult.predictedRidership : 0 }
                        ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#64748b" domain={[0, 700]} />
                          <Tooltip wrapperStyle={{ fontSize: 11, fontFamily: 'sans-serif' }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Bar dataKey="threshold" name={'Ambang Permintaan'} fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="current" name={'Ramalan Penumpang'} fill={getDemandBarColor(predictionResult.demandLevel)} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
                      {'Tahap permintaan diramal: '}{({ Low: 'Rendah', Medium: 'Sederhana', High: 'Tinggi', 'Very High': 'Sangat Tinggi' } as Record<string, string>)[predictionResult.demandLevel] || predictionResult.demandLevel}{' pada '}{travelDate}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2" id="predict-actions">
                    <button
                      id="predict-btn-new"
                      onClick={resetSearch}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      {'Mulakan Pertanyaan Baru'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6" id="predict-sidebar">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm p-5" id="holidays-card">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-amber-600" />
                  <h4 className="font-display font-bold text-sm text-amber-800">{'Cuti Akan Datang'}</h4>
                </div>
                <p className="text-[11px] text-amber-700/80 leading-relaxed">
                  {'Cuti umum yang akan datang di Malaysia.'}
                </p>
                <div className="mt-3 space-y-1.5 text-xs">
                  {upcomingHolidays.length === 0 ? (
                    <p className="text-amber-500 italic">{'Tiada cuti akan datang dijumpai.'}</p>
                  ) : (
                    upcomingHolidays.map((h) => (
                      <div key={h.id} className="flex items-center justify-between">
                        <span className="font-semibold text-amber-900">{h.name}</span>
                        <span className="text-amber-600 font-mono">{new Date(h.date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="demand-legend-card">
                <h5 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">{'Panduan Tahap Permintaan'}</h5>
                <div className="space-y-2">
                  {[
                    { level: 'Rendah', color: 'bg-emerald-500', desc: '<= 50 penumpang' },
                    { level: 'Sederhana', color: 'bg-amber-500', desc: '51 - 100 penumpang' },
                    { level: 'Tinggi', color: 'bg-orange-500', desc: '101 - 250 penumpang' },
                    { level: 'Sangat Tinggi', color: 'bg-red-500', desc: '> 250 penumpang' }
                  ].map((item) => (
                    <div key={item.level} className="flex items-center gap-2 text-xs">
                      <span className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="font-bold text-slate-700">{item.level}</span>
                      <span className="text-slate-400">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== REPORTS TAB ==================== */}
        {activeSubTab === 'reports' && (
          <div className="max-w-2xl" id="reports-component">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-5 h-5 text-indigo-500" />
                <h3 className="font-display text-lg font-bold text-slate-800">{'Muat Turun Laporan Penumpang'}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6">{'Pilih bulan dan tahun untuk memuat turun CSV dengan jumlah penumpang setiap tarikh.'}</p>

              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Bulan'}</label>
                  <select
                    value={selMonth}
                    onChange={(e) => setSelMonth(parseInt(e.target.value))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-400"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Tahun'}</label>
                  <select
                    value={selYear}
                    onChange={(e) => setSelYear(parseInt(e.target.value))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-400"
                  >
                    {availableYears.length > 0 ? availableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    )) : (
                      <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                    )}
                  </select>
                </div>
                <button
                  onClick={downloadReport}
                  disabled={loadingReport}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loadingReport ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {'Menjana...'}</>
                  ) : (
                    <><Download className="h-3.5 w-3.5" /> {'Muat Turun CSV'}</>
                  )}
                </button>
                {reportError && (
                  <div className="mt-3 flex items-center gap-2 text-red-600 text-xs font-medium">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{reportError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== PROFILE SETTINGS TAB ==================== */}
        {activeSubTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="profile-component">
            {/* Left Box: Account Context */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between" id="profile-details-wrapper">
              <div>
                <span className="bg-indigo-50 border border-indigo-100 text-[#4f46e5] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                  {'Sesi Aktif'}
                </span>
                <h3 className="font-display text-lg font-bold text-slate-800 mt-2">{'Kelayakan Identiti'}</h3>
                <p className="text-xs text-slate-500 mt-1">{'Semak status keselamatan aktif & skop pendaftaran akaun.'}</p>

                <div className="mt-6 space-y-4" id="profile-stats">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{'Nama Penuh'}</span>
                    <span className="text-sm font-bold text-slate-700">{user.full_name}</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{'ID Nama Pengguna'}</span>
                    <span className="text-sm font-bold text-slate-700">{user.username}</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{'Peranan Keistimewaan Diberi'}</span>
                    <span className="text-xs font-bold bg-[#e0e7ff] text-[#4f46e5] px-2 py-0.5 rounded-full inline-block uppercase tracking-wide mt-1">
                      {user.role}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{'Status Perisai Keselamatan'}</span>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-block uppercase tracking-wide mt-1">
                      {user.status || 'Aktif'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>{'Disulitkan dengan standard setara SHA-256'}</span>
              </div>
            </div>

            {/* Right Box: Change Password Form */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8" id="profile-password-form">
              <div className="mb-6">
                <span className="bg-red-50 border border-red-100 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-red-600">
                  {'Kawalan Kriptografi'}
                </span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-2">{'Kemas Kini Kata Laluan Akaun'}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {'Tingkatkan keselamatan dengan mengemas kini bukti kelayakan log masuk anda.'}
                </p>
              </div>

              {passSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center gap-3 text-xs" id="pass-success-alert">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="font-semibold">{passSuccess}</div>
                </div>
              )}

              {passError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-800 rounded-xl flex items-center gap-3 text-xs" id="pass-error-alert">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="font-semibold">{passError}</div>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4" id="form-change-pass">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="old-password">
                    {'Kata Laluan Semasa'}
                  </label>
                  <input
                    id="old-password"
                    type="password"
                    required
                    className="w-full py-2 px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                    placeholder={'Masukkan kata laluan aktif semasa'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="new-password">
                      {'Kata Laluan Kuat Baru'}
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      required
                      className="w-full py-2 px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                      placeholder={'Sekurang-kurangnya 8 aksara kompleks'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="confirm-password">
                      {'Sahkan Kata Laluan Baru'}
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      className="w-full py-2 px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                      placeholder={'Masukkan semula kata laluan selamat baru'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6" id="pass-hardness-guide">
                  <h4 className="text-xs font-bold text-slate-700 mb-2">{'Keperluan Penyulitan Diperlukan'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${newPassword.length >= 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {newPassword.length >= 8 ? '\u2713' : '\u2022'}
                      </span>
                      <span className={newPassword.length >= 8 ? 'text-emerald-700' : 'text-slate-500'}>{'Minimum 8 aksara'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[^A-Za-z0-9]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[^A-Za-z0-9]/.test(newPassword) ? '\u2713' : '\u2022'}
                      </span>
                      <span className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>{'Sekurang-kurangnya satu simbol (cth., @, #, $, !)'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[A-Z]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[A-Z]/.test(newPassword) ? '\u2713' : '\u2022'}
                      </span>
                      <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>{'Sekurang-kurangnya satu huruf besar (A-Z)'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[a-z]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[a-z]/.test(newPassword) ? '\u2713' : '\u2022'}
                      </span>
                      <span className={/[a-z]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>{'Sekurang-kurangnya satu huruf kecil (a-z)'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[0-9]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[0-9]/.test(newPassword) ? '\u2713' : '\u2022'}
                      </span>
                      <span className={/[0-9]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>{'Sekurang-kurangnya satu digit angka (0-9)'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    id="btn-submit-change-pass"
                    type="submit"
                    disabled={changingPass}
                    className="bg-slate-900 border-b-2 border-black hover:bg-slate-800 text-white rounded-xl px-6 py-2.5 text-xs font-extrabold transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {changingPass ? 'Menukar bukti kelayakan...' : 'Laksanakan Perubahan Kata Laluan'}
                  </button>
                </div>
              </form>
            </div>

            {/* Delete Account Section */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-red-100 shadow-sm p-6 md:p-8 mt-4">
              <h3 className="font-display font-extrabold text-red-700 text-base mb-2">{'Zon Bahaya'}</h3>
              <p className="text-xs text-slate-500 mb-4">{'Padamkan akaun anda secara kekal dan semua data yang berkaitan. Tindakan ini tidak boleh dibatalkan.'}</p>
              {!showDeleteConfirm ? (
                <button
                  id="btn-delete-account"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-2.5 text-xs font-bold transition cursor-pointer"
                >
                  {'Padam Akaun Saya'}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-red-700">{'Masukkan kata laluan anda untuk mengesahkan pemadaman akaun:'}</p>
                  <input
                    type="password"
                    id="delete-password-input"
                    className="w-full max-w-xs py-2 px-3 border border-red-200 rounded-xl text-xs focus:outline-none focus:border-red-400"
                    placeholder={'Kata laluan semasa anda'}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      id="btn-confirm-delete"
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      {deletingAccount ? 'Memadam...' : 'Sahkan Padam'}
                    </button>
                    <button
                      id="btn-cancel-delete"
                      onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-6 py-2.5 text-xs font-bold transition cursor-pointer"
                    >
                      {'Batal'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
