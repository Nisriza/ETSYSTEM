import React, { useState, useEffect } from 'react';
import { User, Station, Holiday } from '../types.ts';
import { t } from '../lib/i18n.tsx';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, RefreshCw, CheckCircle2, ChevronRight, 
  Calendar, Clock, AlertCircle, Loader2, 
  User as UserIcon, LogOut, Sparkles, AlertTriangle, CalendarDays, Download
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';

interface OperatorViewProps {
  user: User;
  token: string;
}

export default function OperatorView({ user, token }: OperatorViewProps) {
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
      const res = await apiFetch(`/api/operator/analytics?month=${d.getMonth() + 1}&year=${d.getFullYear()}`, {
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
      const res = await apiFetch('/api/stations');
      if (res.ok) setStations(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await apiFetch('/api/holidays?scope=year');
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
      const res = await apiFetch('/api/operator/report-months', { headers: { 'Authorization': `Bearer ${token}` } });
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
      const res = await apiFetch(`/api/operator/report-csv?month=${selMonth}&year=${selYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(err.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ridership-report-${selMonth}-${selYear}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) { setReportError(e.message || 'Download failed'); console.error(e); }
    finally { setLoadingReport(false); }
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => { setSuccessMsg(null); }, 4500);
  };

  const getMonthName = (m: number) => {
    const list = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return list[m - 1];
  };

  // Route check & prediction
  const handleCheckRoute = async () => {
    if (!originId || !destId) return;
    if (originId === destId) { setRouteStatus('unavailable'); return; }
    setRouteStatus('checking');
    try {
      const res = await apiFetch(`/api/routes/check?origin_id=${originId}&destination_id=${destId}`);
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
      const res = await apiFetch('/api/predict', {
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
        setPredictError(data.error || 'Prediction failed. Try again.');
      }
    } catch (e) { setPredictError('Network error.'); }
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
    if (newPassword !== confirmPassword) { setPassError('New password and confirmation do not match.'); return; }
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    if (newPassword.length < 8 || !hasLowercase || !hasUppercase || !hasNumber || !hasSymbol) {
      setPassError('Password must be at least 8 characters with lowercase, uppercase, number, and symbol.');
      return;
    }
    setChangingPass(true);
    try {
      const res = await apiFetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPassSuccess('Password has been securely updated!');
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        showToast('Security credentials updated.');
      } else {
        if (res.status === 403 || res.status === 401) { handleSessionError(res); return; }
        setPassError(data.error || 'Failed to update password.');
      }
    } catch { setPassError('Network error.'); }
    finally { setChangingPass(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeletingAccount(true);
    try {
      const res = await apiFetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword })
      });
      if (res.ok) { localStorage.removeItem('token'); window.location.href = '/'; }
      else { alert('Failed to delete account.'); setDeletingAccount(false); }
    } catch { setDeletingAccount(false); alert('Network error.'); }
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
              <p className="text-[10px] font-extrabold text-[#64748b] tracking-wider leading-none">{'OPERATOR CONSOLE'}</p>
              <h2 className="text-sm font-bold text-[#1e293b] font-display mt-0.5">{'Welcome back, '}{user.username}</h2>
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
              {'Home/Analytics'}
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
              {'Predict Demand'}
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
              {'Profile Settings'}
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
              {'Reports'}
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
                  <h3 className="font-display font-extrabold text-slate-800 text-lg">{'Dynamic Travel Demand Trends'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{'Ridership predictions across all transit routes and peak hours.'}</p>
                </div>
                <button
                  id="btn-op-refresh"
                  onClick={fetchAnalytics}
                  disabled={loadingAnalytics}
                  className="p-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 inline ${loadingAnalytics ? 'animate-spin' : ''}`} /> {'Sync'}
                </button>
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-semibold">{'Loading ridership data...'}</p>
              </div>
            ) : analyticsData ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="op-charts-row">
                  {/* CHART 1: Bar chart of ridership by state */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm" id="chart-routes-wrapper">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-indigo-500" /> {'Ridership by State'}
                    </h4>
                    <div className="h-72 w-full" id="routes-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getStateAnalytics()} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="state" tick={{ fontSize: 9 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                          <Tooltip wrapperStyle={{ fontSize: 11, fontFamily: 'sans-serif' }} />
                          <Bar dataKey="ridership" name={'Total Ridership'} fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CHART 2: Peak demand periods */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm" id="chart-hours-wrapper">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-indigo-500" /> {'Diurnal Commute Load Demands'}
                    </h4>
                    <div className="h-72 w-full" id="hours-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.peakHours} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                          <Tooltip wrapperStyle={{ fontSize: 11, fontFamily: 'sans-serif' }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Line type="monotone" dataKey="passengers" name={'Estimated Passengers'} stroke="#d97706" strokeWidth={2.5} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Busiest Routes Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm" id="table-busiest-wrapper">
                  <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider">
                    {'Ranked Transit by State'}
                  </h4>
                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                          <th className="p-3">{'Rank'}</th>
                          <th className="p-3">{'State'}</th>
                          <th className="p-3">{'Total Ridership'}</th>
                          <th className="p-3 text-right">{'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                        {getStateAnalytics().sort((a, b) => b.ridership - a.ridership).map((state, i) => (
                          <tr key={state.state} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-slate-400">#{i + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{state.state}</td>
                            <td className="p-3 font-mono">{state.ridership.toLocaleString()} {'passengers'}</td>
                            <td className="p-3 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                state.ridership > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-200'
                              }`}>
                                {state.ridership > 0 ? 'Active' : 'No Data'}
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
                <p className="text-xs text-slate-500 mt-2">{'Could not compute model trends. Click Sync to retry.'}</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== PREDICT DEMAND TAB ==================== */}
        {activeSubTab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="predict-grid">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8" id="predict-flow-card">
              <div className="mb-6" id="predict-header">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">{'ML-Powered Diagnostic'}</span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-2">{'Route Demand Prediction Planner'}</h3>
                <p className="text-xs text-slate-500 mt-1">{'Select origin, destination, date and time to estimate demand level.'}</p>
              </div>

              {/* STEP 1: Select stations */}
              {step >= 1 && (
                <div className="space-y-4 border-l-2 border-slate-100 pl-4 py-1" id="step-1-block">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-4">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full inline-flex items-center justify-center text-xs">1</span>
                    {'Choose Station Nodes'}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Origin Station'}</label>
                      <select
                        id="select-origin"
                        disabled={step > 1}
                        className="w-full py-2 px-3 border border-slate-250 bg-white rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                        value={originId}
                        onChange={(e) => { setOriginId(e.target.value); setRouteStatus('idle'); }}
                      >
                        <option value="">{'Select origin...'}</option>
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
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Destination Station'}</label>
                      <select
                        id="select-destination"
                        disabled={step > 1}
                        className="w-full py-2 px-3 border border-slate-250 bg-white rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                        value={destId}
                        onChange={(e) => { setDestId(e.target.value); setRouteStatus('idle'); }}
                      >
                        <option value="">{'Select destination...'}</option>
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
                      {routeStatus === 'checking' ? 'Validating itinerary...' : 'Verify Route Availability'}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}

                  {routeStatus === 'available' && step === 1 && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center justify-between" id="alert-valid-route">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold">{'Active route found in stations table!'}</span>
                      </div>
                      <button
                        id="btn-confirm-continue"
                        onClick={handleContinueToPredict}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1 rounded-lg transition"
                      >
                        {'Continue to Predict'}
                      </button>
                    </div>
                  )}

                  {routeStatus === 'unavailable' && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl" id="alert-invalid-route">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="font-semibold">{'Route not available directly.'}</span>
                      </div>
                      {suggestions.length > 0 && (
                        <div className="ml-6">
                          <p className="font-semibold text-amber-800 mb-1">{'Try these connected destinations instead:'}</p>
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
                    {'Input Departure Date & Time Frame'}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Travel Date'}</label>
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
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Estimated Travel Time'}</label>
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
                        {predicting ? 'Processing model...' : 'Calculate Predicted Demand'}
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id="btn-back-step1"
                        onClick={resetSearch}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-4 py-2 text-xs font-semibold transition"
                      >
                        {'Change Route'}
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
                    {'Diagnostic Report & Estimations'}
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl md:flex items-center justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'Ridership Forecast'}</p>
                      <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                        {predictionResult.predictedRidership} <span className="text-sm font-sans font-medium text-slate-500">{'passengers/train'}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {stations.find(s => s.id === parseInt(originId))?.name}{' \u2192 '}{stations.find(s => s.id === parseInt(destId))?.name}{' on '}{travelDate}{' ('}{travelTime}{')'}
                      </p>
                    </div>

                    <div className="mt-4 md:mt-0 text-center md:text-right">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">{'Ridership Load'}</p>
                      <span className={`inline-flex items-center px-4 py-1 border text-sm font-bold rounded-full ${getDemandColor(predictionResult.demandLevel)}`}>
                        {predictionResult.demandLevel}{' Demand'}
                      </span>
                    </div>
                  </div>

                  {/* Demand Level Visualization for the selected date */}
                  <div className="mt-6 p-6 bg-white border border-slate-100 rounded-2xl" id="demand-visualization">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-indigo-500" /> {'Demand Level Visualization for '}{travelDate}
                    </h4>
                    <div className="h-48 w-full" id="demand-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Low', threshold: 50, current: predictionResult.demandLevel === 'Low' ? predictionResult.predictedRidership : 0 },
                          { name: 'Medium', threshold: 100, current: predictionResult.demandLevel === 'Medium' ? predictionResult.predictedRidership : 0 },
                          { name: 'High', threshold: 250, current: predictionResult.demandLevel === 'High' ? predictionResult.predictedRidership : 0 },
                          { name: 'Very High', threshold: 650, current: predictionResult.demandLevel === 'Very High' ? predictionResult.predictedRidership : 0 }
                        ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#64748b" domain={[0, 700]} />
                          <Tooltip wrapperStyle={{ fontSize: 11, fontFamily: 'sans-serif' }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Bar dataKey="threshold" name={'Demand Threshold'} fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="current" name={'Predicted Ridership'} fill={getDemandBarColor(predictionResult.demandLevel)} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
                      {'Predicted demand level: '}{predictionResult.demandLevel}{' on '}{travelDate}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2" id="predict-actions">
                    <button
                      id="predict-btn-new"
                      onClick={resetSearch}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      {'Start New Query'}
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
                  <h4 className="font-display font-bold text-sm text-amber-800">{'Upcoming Holidays'}</h4>
                </div>
                <p className="text-[11px] text-amber-700/80 leading-relaxed">
                  {'Upcoming public holidays in Malaysia.'}
                </p>
                <div className="mt-3 space-y-1.5 text-xs">
                  {upcomingHolidays.length === 0 ? (
                    <p className="text-amber-500 italic">{'No upcoming holidays found.'}</p>
                  ) : (
                    upcomingHolidays.map((h) => (
                      <div key={h.id} className="flex items-center justify-between">
                        <span className="font-semibold text-amber-900">{h.name}</span>
                        <span className="text-amber-600 font-mono">{new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="demand-legend-card">
                <h5 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">{'Demand Level Guide'}</h5>
                <div className="space-y-2">
                  {[
                    { level: 'Low', color: 'bg-emerald-500', desc: '<= 50 passengers' },
                    { level: 'Medium', color: 'bg-amber-500', desc: '51 - 100 passengers' },
                    { level: 'High', color: 'bg-orange-500', desc: '101 - 250 passengers' },
                    { level: 'Very High', color: 'bg-red-500', desc: '> 250 passengers' }
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
                <h3 className="font-display text-lg font-bold text-slate-800">{'Download Ridership Report'}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6">{'Select a month and year to download a CSV with total ridership per date.'}</p>

              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Month'}</label>
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Year'}</label>
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
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {'Generating...'}</>
                  ) : (
                    <><Download className="h-3.5 w-3.5" /> {'Download CSV'}</>
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
                  {'Active Session'}
                </span>
                <h3 className="font-display text-lg font-bold text-slate-800 mt-2">{'Identity Credentials'}</h3>
                <p className="text-xs text-slate-500 mt-1">{'Review active security state & account registration scopes.'}</p>

                <div className="mt-6 space-y-4" id="profile-stats">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{'Full Name'}</span>
                    <span className="text-sm font-bold text-slate-700">{user.full_name}</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{'Username ID'}</span>
                    <span className="text-sm font-bold text-slate-700">{user.username}</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{'Assigned Privilege Role'}</span>
                    <span className="text-xs font-bold bg-[#e0e7ff] text-[#4f46e5] px-2 py-0.5 rounded-full inline-block uppercase tracking-wide mt-1">
                      {user.role}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{'Security Shield Status'}</span>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-block uppercase tracking-wide mt-1">
                      {user.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>{'Encrypted with SHA-256 equivalent standard'}</span>
              </div>
            </div>

            {/* Right Box: Change Password Form */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8" id="profile-password-form">
              <div className="mb-6">
                <span className="bg-red-50 border border-red-100 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-red-600">
                  {'Cryptographic Control'}
                </span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-2">{'Update Account Password'}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {'Enhance security by updating your sign-in credentials.'}
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
                    {'Current Password'}
                  </label>
                  <input
                    id="old-password"
                    type="password"
                    required
                    className="w-full py-2 px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                    placeholder={'Enter current active password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="new-password">
                      {'New Strong Password'}
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      required
                      className="w-full py-2 px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                      placeholder={'At least 8 complex characters'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="confirm-password">
                      {'Confirm New Password'}
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      className="w-full py-2 px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                      placeholder={'Re-enter new secure password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6" id="pass-hardness-guide">
                  <h4 className="text-xs font-bold text-slate-700 mb-2">{'Required Encryption Requirements'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${newPassword.length >= 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {newPassword.length >= 8 ? '✓' : '•'}
                      </span>
                      <span className={newPassword.length >= 8 ? 'text-emerald-700' : 'text-slate-500'}>{'Minimum 8 characters'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[^A-Za-z0-9]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[^A-Za-z0-9]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>{'At least one symbol (e.g., @, #, $, !)'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[A-Z]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[A-Z]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>{'At least one uppercase letter (A-Z)'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[a-z]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[a-z]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/[a-z]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>{'At least one lowercase letter (a-z)'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[0-9]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[0-9]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/[0-9]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>{'At least one numeric digit (0-9)'}</span>
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
                    {changingPass ? 'Changing credentials...' : 'Commit Password Change'}
                  </button>
                </div>
              </form>
            </div>

            {/* Delete Account Section */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-red-100 shadow-sm p-6 md:p-8 mt-4">
              <h3 className="font-display font-extrabold text-red-700 text-base mb-2">{'Danger Zone'}</h3>
              <p className="text-xs text-slate-500 mb-4">{'Permanently delete your account and all associated data. This action cannot be undone.'}</p>
              {!showDeleteConfirm ? (
                <button
                  id="btn-delete-account"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-2.5 text-xs font-bold transition cursor-pointer"
                >
                  {'Delete My Account'}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-red-700">{'Enter your password to confirm account deletion:'}</p>
                  <input
                    type="password"
                    id="delete-password-input"
                    className="w-full max-w-xs py-2 px-3 border border-red-200 rounded-xl text-xs focus:outline-none focus:border-red-400"
                    placeholder={'Your current password'}
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
                      {deletingAccount ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      id="btn-cancel-delete"
                      onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-6 py-2.5 text-xs font-bold transition cursor-pointer"
                    >
                      {'Cancel'}
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
