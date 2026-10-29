import React, { useState, useEffect } from 'react';
import { User, Station, SavedTrip, Feedback, Holiday, Recommendation } from '../types.ts';
import {
  Train, Search, Calendar, Clock, Bookmark, MessageSquare, MapPin, 
   Trash2, Edit, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Star,
  ArrowRight, User as UserIcon, LogOut, ChevronRight, BookmarkPlus, HelpCircle
} from 'lucide-react';

interface PassengerViewProps {
  user: User;
  token: string;
}

type TabType = 'search' | 'trips' | 'feedback' | 'recommendations' | 'profile';

export default function PassengerViewBM({ user, token }: PassengerViewProps) {
  const isGuest = user.role === 'guest';
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [stations, setStations] = useState<Station[]>([]);
  
  // Search prediction states
  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [routeStatus, setRouteStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [step, setStep] = useState(1); // 1 = select stations, 2 = select date/time, 3 = show prediction
  
  const [travelDate, setTravelDate] = useState('');
  const [travelTime, setTravelTime] = useState('08:00');
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{
    predictedRidership: number;
    demandLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  } | null>(null);

  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Note Modal States
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [tripNote, setTripNote] = useState('');
  const [savingTrip, setSavingTrip] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Trips States
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  // Feedback States
  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);
  const [fbOrigin, setFbOrigin] = useState('');
  const [fbDest, setFbDest] = useState('');
  const [fbDate, setFbDate] = useState('');
  const [fbCrowd, setFbCrowd] = useState<'Low' | 'Medium' | 'High' | 'Very High'>('Medium');
  const [fbComfort, setFbComfort] = useState(5);
  const [fbDelay, setFbDelay] = useState(false);
  const [fbDelayMins, setFbDelayMins] = useState(0);
  const [fbComment, setFbComment] = useState('');
  const [submittingFb, setSubmittingFb] = useState(false);
  const [editingFbId, setEditingFbId] = useState<number | null>(null);
  const [connectedDestinations, setConnectedDestinations] = useState<Station[]>([]);

  // Holiday State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [suggestions, setSuggestions] = useState<Station[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<{ origin: string; destination: string; ridership: number; trips: number; level: string }[]>([]);

  const fetchPopularRoutes = async () => {
    try {
      const res = await fetch('/api/routes/popular');
      if (res.ok) setPopularRoutes(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchStations();
    fetchSavedTrips();
    fetchFeedbackHistory();
    fetchHolidaysAndRecs();
    fetchUpcomingHolidays();
    fetchPopularRoutes();
  }, []);

  // Tutorial kali pertama: auto-papar sekali untuk penumpang; tetamu pilih melalui gesaan log masuk
  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem('token');
        window.location.href = '/';
      } else {
        alert(data.error || 'Gagal memadam akaun.');
        setDeletingAccount(false);
      }
    } catch {
      setDeletingAccount(false);
      alert('Ralat rangkaian. Sila cuba lagi.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPassword !== confirmPassword) {
      setPassError('Kata laluan baru dan pengesahan tidak sepadan.');
      return;
    }

    // Client-side strength check
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    const hasMinLength = newPassword.length >= 8;

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      setPassError('Kata laluan mesti sekurang-kurangnya 8 aksara dan mengandungi: satu huruf besar, satu huruf kecil, satu nombor, dan satu simbol/aksara khas.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setPassSuccess('Kata laluan anda telah dikemas kini dengan selamat!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Bukti kelayakan keselamatan berjaya dikemas kini.');
      } else {
        setPassError(data.error || 'Gagal mengemas kini kata laluan.');
      }
    } catch (e) {
      setPassError('Ralat rangkaian atau pelayan tidak dapat dicapai.');
    } finally {
      setChangingPass(false);
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

  const fetchSavedTrips = async () => {
    if (isGuest) return;
    try {
      const res = await fetch('/api/saved-trips', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSavedTrips(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFeedbackHistory = async () => {
    if (isGuest) return;
    try {
      const res = await fetch('/api/feedback/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setFeedbackHistory(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHolidaysAndRecs = async () => {
    setLoadingRecs(true);
    try {
      const resHolidays = await fetch('/api/holidays?scope=year');
      if (resHolidays.ok) setHolidays(await resHolidays.json());

      const resRecs = await fetch('/api/recommendations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRecs.ok) setRecommendations(await resRecs.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecs(false);
    }
  };

  const fetchUpcomingHolidays = async () => {
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

  // Route verify
  const handleCheckRoute = async () => {
    if (!originId || !destId) return;
    if (originId === destId) {
      setRouteStatus('unavailable');
      return;
    }

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
    } catch (e) {
      setRouteStatus('unavailable');
    }
  };

  const handleContinueToPredict = () => {
    setStep(2);
    // Set default tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTravelDate(tomorrow.toISOString().split('T')[0]);
  };

  const runPrediction = async () => {
    if (!travelDate || !travelTime) return;
    setPredicting(true);

    const originName = stations.find(s => s.id === parseInt(originId))?.name || '';
    const destName = stations.find(s => s.id === parseInt(destId))?.name || '';

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          origin: originName,
          destination: destName,
          date: travelDate,
          time: travelTime + ":00"
        })
      });

      if (res.ok) {
        setPredictionResult(await res.json());
        setStep(3);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPredicting(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!predictionResult) return;
    setSavingTrip(true);
    try {
      const res = await fetch('/api/saved-trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          origin: predictionResult.origin,
          destination: predictionResult.destination,
          date: travelDate,
          time: travelTime,
          predicted_ridership: predictionResult.predictedRidership,
          demand_level: predictionResult.demandLevel,
          note: tripNote
        })
      });

      if (res.ok) {
        showToast('Itinerari perjalanan berjaya disimpan!');
        fetchSavedTrips();
        setShowNoteModal(false);
        setTripNote('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingTrip(false);
    }
  };

  const handleBookKTMB = () => {
    if (!predictionResult) return;
    const from = encodeURIComponent(predictionResult.origin);
    const to = encodeURIComponent(predictionResult.destination);
    const date = travelDate;
    window.open(`https://online.ktmb.com.my/?from=${from}&to=${to}&date=${date}`, '_blank');
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // TRIP CRUD OPERATIONS
  const deleteTrip = async (id: number) => {
    if (!window.confirm('Adakah anda pasti mahu memadam perjalanan yang disimpan ini?')) return;
    try {
      const res = await fetch(`/api/saved-trips/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedTrips(savedTrips.filter(t => t.id !== id));
        showToast('Perjalanan disimpan telah dikeluarkan dari pangkalan data.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // CROWD FEEDBACK SUBMISSION
  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbOrigin || !fbDest || !fbDate) {
      alert('Asal, destinasi dan tarikh perjalanan diperlukan.');
      return;
    }

    setSubmittingFb(true);
    try {
      const method = editingFbId ? 'PUT' : 'POST';
      const endpoint = editingFbId ? `/api/feedback/${editingFbId}` : '/api/feedback';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          origin: fbOrigin,
          destination: fbDest,
          date: fbDate,
          crowd_level: fbCrowd,
          comfort_rating: fbComfort,
          delay_reported: fbDelay,
          delay_minutes: fbDelay ? fbDelayMins : 0,
          comment: fbComment
        })
      });

      if (res.ok) {
        showToast(editingFbId ? 'Rekod maklum balas diubah.' : 'Maklum balas dihantar! Terima kasih kerana menyokong perjalanan pintar.');
        setEditingFbId(null);
        setFbOrigin('');
        setFbDest('');
        setConnectedDestinations([]);
        setFbDate('');
        setFbCrowd('Medium');
        setFbComfort(5);
        setFbDelay(false);
        setFbDelayMins(0);
        setFbComment('');
        fetchFeedbackHistory();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal menghantar maklum balas.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFb(false);
    }
  };

  const startEditFeedback = (fb: Feedback) => {
    setEditingFbId(fb.id);
    setFbOrigin(fb.origin);
    setFbDest(fb.destination);
    setFbDate(fb.travel_date);
    setFbCrowd(fb.crowd_level);
    setFbComfort(fb.comfort_rating);
    setFbDelay(fb.delay_reported);
    setFbDelayMins(fb.delay_minutes);
    setFbComment(fb.comment);
  };

  const deleteFeedback = async (id: number) => {
    if (!window.confirm('Padam entri maklum balas ini?')) return;
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFeedbackHistory(feedbackHistory.filter(f => f.id !== id));
        showToast('Maklum balas dipadamkan.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConnectedDestinations = async (originName: string) => {
    if (!originName) { setConnectedDestinations([]); return; }
    const station = stations.find(s => s.name === originName);
    if (!station) { setConnectedDestinations([]); return; }
    try {
      const res = await fetch(`/api/routes/from/${station.id}`);
      if (res.ok) setConnectedDestinations(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const resetSearch = () => {
    setOriginId('');
    setDestId('');
    setRouteStatus('idle');
    setStep(1);
    setPredictionResult(null);
    setTripNote('');
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

  const getCrowdName = (level: string) => {
    switch (level) {
      case 'Low': return 'Kosong / Sunyi (Rendah)';
      case 'Medium': return 'Tempat Duduk Sederhana (Sederhana)';
      case 'High': return 'Sesak (Tinggi)';
      case 'Very High': return 'Penuh / Berdiri (Sangat Tinggi)';
      default: return level;
    }
  };

  return (
    <div className="w-full" id="passenger-dashboard">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-2 animate-bounce max-w-sm" id="toast-success">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Dashboard Mini-menu */}
      <div className="bg-white border-b border-[#e2e8f0] sticky top-0 z-10 px-4 md:px-8 py-3" id="dash-menu">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-2.5 bg-[#4f46e5]/10 border border-[#4f46e5]/20 rounded-xl text-[#4f46e5]">
              <Train className="h-4.5 w-4.5" />
            </span>
            <div id="welcome-text">
              <p className="text-[10px] font-extrabold text-[#64748b] tracking-wider leading-none">{'KONSOL PENUMPANG'}</p>
              <h2 className="text-sm font-bold text-[#1e293b] font-display mt-1">{'Selamat kembali, '}{user.username}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2" id="tab-nav">
            {(isGuest
              ? (['search', 'recommendations'] as const)
              : (['search', 'trips', 'feedback', 'recommendations', 'profile'] as const)
            ).map((tab) => (
              <button
                key={tab}
                id={`tab-btn-${tab}`}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'trips') fetchSavedTrips();
                  if (tab === 'feedback') fetchFeedbackHistory();
                  if (tab === 'recommendations') fetchHolidaysAndRecs();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-[#4f46e5] text-white shadow-sm border border-[#4338ca]' 
                    : 'text-[#64748b] bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]'
                }`}
              >
                {tab === 'search' ? 'Laman/Carian' : 
                 tab === 'trips' ? 'Perjalanan Disimpan' : 
                 tab === 'feedback' ? 'Maklum Balas' : 
                 tab === 'recommendations' ? 'Cuti & Cadangan' : 'Tetapan Profil'}
              </button>
            ))}          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto" id="passenger-viewport">
        {/* ==================== HOME / SEARCH TAB ==================== */}
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="search-grid">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8" id="predictive-flow-card">
              <div className="mb-6" id="search-flow-header">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">{'Diagnostik Berkuasa ML'}</span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-2">{'Perancang Ramalan Permintaan Laluan'}</h3>
                <p className="text-xs text-slate-500 mt-1">{'Pilih titik perjalanan anda untuk menganggarkan jumlah penumpang dan tahap permintaan.'}</p>
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
                        onChange={(e) => {
                          setOriginId(e.target.value);
                          setRouteStatus('idle');
                        }}
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
                        onChange={(e) => {
                          setDestId(e.target.value);
                          setRouteStatus('idle');
                        }}
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
                                onClick={() => {
                                  setDestId(String(s.id));
                                  setRouteStatus('idle');
                                  setSuggestions([]);
                                }}
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

                  {step === 2 && (
                    <div className="mt-4 flex gap-2">
                      <button
                        id="btn-run-prediction"
                        onClick={runPrediction}
                        disabled={predicting || !travelDate}
                        className="bg-indigo-600 text-white rounded-xl px-5 py-2 text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {predicting ? 'Memproses model Random Forest...' : 'Kira Ramalan Permintaan'}
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
                <div className="mt-8 border-l-2 border-emerald-500 pl-4 py-1" id="step-3-block animate-fade-in">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-4">
                    <span className="w-5 h-5 bg-emerald-505 bg-slate-900 text-white rounded-full inline-flex items-center justify-center text-xs">3</span>
                    {'Laporan Diagnostik & Anggaran'}
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl md:flex items-center justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'Ramalan Penumpang'}</p>
                      <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                        {predictionResult.predictedRidership} <span className="text-sm font-sans font-medium text-slate-500">{'penumpang/kereta api'}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {'Ang. untuk '}{predictionResult.origin}{' ➔ '}{predictionResult.destination}{' pada '}{predictionResult.date}{' ('}{predictionResult.time}{')'}
                      </p>
                    </div>

                    <div className="mt-4 md:mt-0 text-center md:text-right">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">{'Beban Penumpang'}</p>
                      <span className={`inline-flex items-center px-4 py-1 border text-sm font-bold rounded-full ${getDemandColor(predictionResult.demandLevel)}`}>
                        {({ Low: 'Rendah', Medium: 'Sederhana', High: 'Tinggi', 'Very High': 'Sangat Tinggi' } as Record<string, string>)[predictionResult.demandLevel] || predictionResult.demandLevel}{' Permintaan'}
                      </span>
                    </div>
                  </div>

                  {/* Actions (Step 4) */}
                  <div className="mt-6 flex flex-wrap gap-2" id="report-actions bg-slate-50">
                    <button
                      id="predict-btn-save"
                      onClick={() => isGuest ? showToast('Sila log masuk atau daftar untuk menyimpan perjalanan.') : setShowNoteModal(true)}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                        isGuest
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      {'Simpan Perjalanan'}
                    </button>

                    <button
                      id="predict-btn-ktmb"
                      onClick={handleBookKTMB}
                      className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {'Tempah Tiket di KTMB'}
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                      id="predict-btn-new"
                      onClick={resetSearch}
                      className="text-slate-500 hover:text-slate-800 text-xs font-medium px-4 py-2 transition"
                    >
                      {'Mulakan Pertanyaan Baru'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sideline Details */}
            <div className="space-y-6" id="search-sidebar">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm p-5" id="upcoming-holidays-card">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <h4 className="font-display font-bold text-sm text-amber-800">{'Cuti Akan Datang'}</h4>
                </div>
                <p className="text-[11px] text-amber-700/80 leading-relaxed">
                  {'Sesuaikan perjalanan anda sebelum musim cuti. Rancang lebih awal untuk perjalanan yang lebih lancar.'}
                </p>
                {upcomingHolidays.length === 0 ? (
                  <p className="text-[11px] text-amber-500 italic mt-2">{'Tiada cuti akan datang dijumpai.'}</p>
                ) : (
                  <div className="mt-3 space-y-1.5">
                    {upcomingHolidays.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-900">{h.name}</span>
                        <span className="text-amber-600 font-mono">{h.date}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 pt-2 border-t border-amber-200/60 text-[11px] text-amber-700">
                  <span className="font-semibold">{'Tip:'}</span>{' Tempah awal — laluan popular cepat penuh semasa cuti umum.'}
                </div>
              </div>

              {/* Popular routes from Ridership dataset */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="popular-routes-card">
                <h4 className="font-display font-semibold text-slate-800 text-xs uppercase tracking-wider mb-3">{'Titik Transit Popular'}</h4>
                <div className="space-y-2 text-xs text-slate-600">
                  {popularRoutes.length === 0 ? (
                    <p className="text-slate-400 italic p-2">{'Tiada data laluan dalam set data Ridership lagi.'}</p>
                  ) : (
                    popularRoutes.map((r, i) => {
                      const levelColors: Record<string, string> = {
                        Low: 'bg-emerald-50 text-emerald-700',
                        Medium: 'bg-amber-50 text-amber-700',
                        High: 'bg-orange-50 text-orange-700',
                        'Very High': 'bg-red-50 text-red-700',
                      };
                      const colorClass = levelColors[r.level] || 'bg-slate-50 text-slate-700';
                      return (
                        <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition">
                          <span>{r.origin} ↔ {r.destination}</span>
                          <span className={`${colorClass} px-2 py-0.5 rounded text-[10px] font-bold`}>
                            {r.level} Beban ({r.ridership})
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== Note Option Modal ==================== */}
        {showNoteModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
              <h3 className="font-display font-bold text-lg text-slate-800">{'Tambah Nota pada Perjalanan Disimpan'}</h3>
              <p className="text-xs text-slate-500 mt-1">{'Tandakan perjalanan ini untuk rujukan kemudian (cth. "Percutian keluarga", "Persidangan perniagaan").'}</p>
              
              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-500 block mb-1">{'Nota/Memoir Pilihan'}</label>
                <input
                  id="modal-note-input"
                  type="text"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600"
                  placeholder={'cth. Balik kampung, Minggu Merdeka'}
                  value={tripNote}
                  onChange={(e) => setTripNote(e.target.value)}
                />
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <button
                  id="modal-note-btn-cancel"
                  className="px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs rounded-xl transition font-medium cursor-pointer"
                  onClick={() => setShowNoteModal(false)}
                >
                  {'Batal'}
                </button>
                <button
                  id="modal-note-btn-save"
                  disabled={savingTrip}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl transition font-bold cursor-pointer"
                  onClick={handleSaveTrip}
                >
                  {savingTrip ? 'Menyimpan...' : 'Sahkan Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SAVED TRIPS TAB ==================== */}
        {activeTab === 'trips' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="saved-trips-component">
            <div className="mb-6">
              <h3 className="font-display text-xl font-bold text-slate-800">{'Itinerari Perjalanan Saya'}</h3>
              <p className="text-xs text-slate-500 mt-1">{'Semak penunjuk ramalan atau teruskan ke pembayaran.'}</p>
            </div>

            {savedTrips.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-display text-base font-semibold text-slate-700 mt-3">{'Tiada perjalanan disimpan'}</h4>
                <p className="text-xs text-slate-400 mt-1">{'Pergi ke Laman/Carian dan simpan ramalan itinerari untuk memulakan.'}</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition cursor-pointer"
                >
                  {'Rancang Sekarang'}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="p-3">{'Laluan Perjalanan'}</th>
                      <th className="p-3">{'Tarikh Berlepas'}</th>
                      <th className="p-3">{'Masa Anggaran'}</th>
                      <th className="p-3">{'Ramalan Beban'}</th>
                      <th className="p-3">{'Nota Memo'}</th>
                      <th className="p-3 text-right">{'Tindakan'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {savedTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-800 font-bold flex items-center gap-1.5">
                          <Train className="h-3.5 w-3.5 text-indigo-600" />
                          <span>{trip.origin} ➔ {trip.destination}</span>
                        </td>
                        <td className="p-3">
                          {trip.travel_date}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {trip.travel_time.substring(0, 5)}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 border text-[10px] font-bold rounded-full ${getDemandColor(trip.demand_level)}`}>
                            {trip.demand_level || 'Mengira...'} ({trip.predicted_ridership || 0})
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-500 italic">{trip.note || '-'}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              id={`btn-book-saved-${trip.id}`}
                              onClick={() => {
                                window.open(`https://online.ktmb.com.my/?from=${encodeURIComponent(trip.origin)}&to=${encodeURIComponent(trip.destination)}&date=${trip.travel_date}`, '_blank');
                              }}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-[10px] transition"
                            >
                              {'Tempah di KTMB'}
                            </button>
                            <button
                              id={`btn-delete-saved-${trip.id}`}
                              onClick={() => deleteTrip(trip.id)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== CROWD FEEDBACK TAB ==================== */}
        {activeTab === 'feedback' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="feedback-component">
            {/* Feedback Submission Form */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="feedback-form-wrapper">
              <div className="mb-4">
                <span className="bg-amber-50 border border-amber-100 text-amber-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">{'Penilaian Langsung'}</span>
                <h3 className="font-display text-lg font-bold text-slate-800 mt-2">{'Tinjauan Orang Ramai Transit'}</h3>
                <p className="text-xs text-slate-500 mt-1">{'Beritahu pengendali dan penumpang tentang beban sebenar dalam perjalanan kereta api baru-baru ini.'}</p>
              </div>

              <form onSubmit={submitFeedback} className="space-y-4" id="fb-form">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="fb-origin">{'Stesen Asal'}</label>
                    <select
                      id="fb-origin"
                      required
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-sans"
                      value={fbOrigin}
                      onChange={(e) => { setFbOrigin(e.target.value); setFbDest(''); fetchConnectedDestinations(e.target.value); }}
                    >
                      <option value="">{'Pilih asal...'}</option>
                      {Array.from(new Set(stations.map(s => s.state || 'Other'))).map(stateName => (
                        <optgroup key={stateName} label={`${stateName}`} className="font-bold text-slate-800 bg-slate-50 text-xs">
                          {stations.filter(s => (s.state || 'Other') === stateName).map(s => (
                            <option key={s.id} value={s.name} className="font-normal text-slate-700 bg-white text-sm">{s.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="fb-dest">{'Stesen Destinasi'}</label>
                    <select
                      id="fb-dest"
                      required
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-sans"
                      value={fbDest}
                      onChange={(e) => setFbDest(e.target.value)}
                    >
                      <option value="">{'Pilih destinasi...'}</option>
                      {(connectedDestinations.length > 0 ? connectedDestinations : stations).map(s => (
                        <option key={s.id} value={s.name} className="font-normal text-slate-700 bg-white text-sm">{s.name}</option>
                      ))}
                    </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="fb-date">{'Tarikh Perjalanan'}</label>
                  <input
                    id="fb-date"
                    type="date"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                    value={fbDate}
                    onChange={(e) => setFbDate(e.target.value)}
                  />
                </div>

                {/* Crowd Level Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{'Tahap Orang Ramai'}</label>
                  <div className="grid grid-cols-4 gap-1.5" id="crowd-sel-grid">
                    {(['Low', 'Medium', 'High', 'Very High'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        id={`btn-fb-crowd-${level}`}
                        className={`py-2 px-1 border text-center rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          fbCrowd === level
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-500 bg-white'
                        }`}
                        onClick={() => setFbCrowd(level)}
                      >
                        <span className="text-sm">
                          {level === 'Low' ? '🟢' : level === 'Medium' ? '🟡' : level === 'High' ? '🟠' : '🔴'}
                        </span>
                        <span className="text-[9px] font-bold">{level}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">{getCrowdName(fbCrowd)}</p>
                </div>

                {/* Comfort Star Rating */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Penilaian Keselesaan (1-5)'}</label>
                  <div className="flex gap-1" id="fb-comfort-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        id={`star-btn-${star}`}
                        onClick={() => setFbComfort(star)}
                        className="p-1 focus:outline-none cursor-pointer"
                      >
                        <Star className={`h-6 w-6 transition ${star <= fbComfort ? 'fill-amber-400 text-amber-400 font-extrabold scale-110' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delay toggle */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{'Laporan Kereta Api Lewat?'}</span>
                    <button
                      type="button"
                      id="btn-fb-delay-toggle"
                      onClick={() => setFbDelay(!fbDelay)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        fbDelay ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {fbDelay ? 'Ya (Lewat)' : 'Tidak (Tepat Masa)'}
                    </button>
                  </div>
                  {fbDelay && (
                    <div className="animate-scale-up" id="fb-delay-picker">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">{'Anggaran masa kelewatan (Minit)'}</label>
                      <input
                        id="fb-delay-mins"
                        type="number"
                        min="1"
                        max="240"
                        className="py-1 px-2 border border-slate-200 rounded text-xs w-24 focus:outline-none focus:border-indigo-600"
                        value={fbDelayMins}
                        onChange={(e) => setFbDelayMins(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="fb-comment">{'Kotak Komen'}</label>
                  <textarea
                    id="fb-comment"
                    rows={2}
                    maxLength={300}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-white"
                    placeholder={'Masukkan ulasan transit ringkas (pilihan)'}
                    value={fbComment}
                    onChange={(e) => setFbComment(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    id="btn-submit-fb"
                    disabled={submittingFb}
                    type="submit"
                    className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-800 transition shadow-md shadow-slate-100 cursor-pointer text-center"
                  >
                    {submittingFb ? 'Menyimpan rekod...' : editingFbId ? 'Ubah Maklum Balas' : 'Hantar Maklum Balas'}
                  </button>
                  {editingFbId && (
                    <button
                      id="btn-cancel-edit-fb"
                      type="button"
                      onClick={() => {
                        setEditingFbId(null);
                        setFbOrigin('');
                        setFbDest('');
                        setFbDate('');
                        setFbCrowd('Medium');
                        setFbComfort(5);
                        setFbDelay(false);
                        setFbDelayMins(0);
                        setFbComment('');
                        setConnectedDestinations([]);
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-250 text-slate-600 text-xs font-medium rounded-xl transition"
                    >
                      {'Batal'}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Private submission history */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="feedback-history-list">
              <h3 className="font-display font-bold text-lg text-slate-800 mb-4">{'Buku Log Komuter Masa Nyata Saya'}</h3>

              {feedbackHistory.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 mt-2 font-medium">{'Anda belum menghantar tinjauan maklum balas perjalanan lagi!'}</p>
                </div>
              ) : (
                <div className="space-y-4" id="fb-hist">
                  {feedbackHistory.map((fb) => {
                    return (
                      <div key={fb.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-800">
                              {fb.origin}{' ➔ '}{fb.destination}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">
                              {'Tarikh Perjalanan: '}{fb.travel_date}
                            </span>
                          </div>

                          <div className="flex gap-1">
                            <span className={`inline-flex px-2 py-0.5 border text-[9px] font-bold rounded-full ${getDemandColor(fb.crowd_level)}`}>
                              {'Orang Ramai: '}{fb.crowd_level}
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 border border-slate-200 bg-white rounded-full text-[9px] text-amber-500 font-extrabold">
                              ⭐ {fb.comfort_rating}{'/5'}
                            </span>
                          </div>
                        </div>

                        {fb.comment && (
                          <p className="text-xs text-slate-600 mt-2 bg-white p-2 rounded-lg border border-slate-100 font-medium whitespace-pre-wrap">{fb.comment}</p>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <div>
                            {fb.delay_reported ? (
                              <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                                {'Lewat: +'}{fb.delay_minutes}{' min'}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                {'Kereta api tepat masa'}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              id={`btn-edit-fb-${fb.id}`}
                              onClick={() => startEditFeedback(fb)}
                              className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                            >
                              {'Edit'}
                            </button>
                            <button
                              id={`btn-delete-fb-${fb.id}`}
                              onClick={() => deleteFeedback(fb.id)}
                              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                            >
                              {'Padam'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== HOLIDAY & RECOMMENDATIONS TAB ==================== */}
        {activeTab === 'recommendations' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="recommendations-component">
            <div className="mb-6">
              <h3 className="font-display text-xl font-bold text-slate-800">{'Cuti & Cadangan'}</h3>
              <p className="text-xs text-slate-500 mt-1">{'Semua cuti umum Malaysia tahun ini, dengan nasihat perjalanan pintar yang disesuaikan dengan laluan kerap anda.'}</p>
            </div>

            {/* All holidays list */}
            {holidays.length > 0 && (
              <div className="mb-8">
                <h4 className="font-display font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  {'Semua Cuti Tahun Ini'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {holidays.map((h) => {
                    const d = new Date(h.date);
                    const isPast = d < new Date(new Date().toDateString());
                    return (
                      <div
                        key={h.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
                          isPast ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-150'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPast ? 'bg-slate-300' : 'bg-indigo-400'}`} />
                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${isPast ? 'text-slate-400' : 'text-slate-700'}`}>{h.name}</p>
                          <p className={`text-[10px] font-mono ${isPast ? 'text-slate-300' : 'text-slate-500'}`}>{h.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommendations header */}
            {recommendations.length > 0 && (
              <h4 className="font-display font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {'Nasihat Perjalanan Pintar'}
              </h4>
            )}

            {loadingRecs ? (
              <div className="text-center py-20">
                <p className="text-slate-500 text-xs font-semibold">{'Memproses data perjalanan cuti...'}</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
                <Calendar className="w-10 h-10 text-slate-350 mx-auto" />
                <p className="text-xs text-slate-400 mt-2">{'Tiada cuti atau peta cadangan ditakrifkan untuk penjejakan.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="recs-list">
                {recommendations.map((rec) => {
                  const isHigh = rec.demandLevel === 'High' || rec.demandLevel === 'Very High';
                  const daysRemaining = Math.ceil(
                    (new Date(rec.holidayDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const levelBar =
                    rec.demandLevel === 'Low' ? 'w-1/4 bg-emerald-400' :
                    rec.demandLevel === 'Medium' ? 'w-2/4 bg-amber-400' :
                    rec.demandLevel === 'High' ? 'w-3/4 bg-orange-400' :
                    'w-full bg-red-400';
                  return (
                    <div
                      key={rec.holidayId}
                      className={`p-5 rounded-2xl border transition relative overflow-hidden ${
                        isHigh ? 'border-orange-200 bg-gradient-to-br from-orange-50/60 to-white' : 'border-slate-150 bg-white'
                      }`}
                    >
                      {/* Countdown badge */}
                      <div className="absolute top-3 right-3">
                        <div className={`text-center px-2 py-1 rounded-lg ${daysRemaining <= 7 ? 'bg-red-50 border border-red-200' : daysRemaining <= 30 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                          <span className={`text-xs font-bold block leading-none ${daysRemaining <= 7 ? 'text-red-600' : daysRemaining <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {daysRemaining > 0 ? `${daysRemaining}h` : 'Hari Ini!'}
                          </span>
                          <span className={`text-[8px] font-semibold ${daysRemaining <= 7 ? 'text-red-400' : daysRemaining <= 30 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {'lagi'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{'Acara Awam Malaysia'}</span>
                          <h4 className="font-display font-extrabold text-slate-800 mt-1.5 text-base">{rec.holidayName}</h4>
                          <h5 className="text-[11px] font-mono font-bold text-indigo-600 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {rec.holidayDate}
                          </h5>
                        </div>
                      </div>

                      {/* Demand level bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>{'Ramalan Permintaan'}</span>
                           <span className={`font-bold ${isHigh ? 'text-orange-600' : 'text-emerald-600'}`}>{({ Low: 'Rendah', Medium: 'Sederhana', High: 'Tinggi', 'Very High': 'Sangat Tinggi' } as Record<string, string>)[rec.demandLevel] || rec.demandLevel}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${levelBar}`} />
                        </div>
                      </div>

                      {/* Route */}
                      <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {rec.origin} <ArrowRight className="h-3 w-3 text-slate-300" /> {rec.destination}
                      </div>

                      {/* Recommendation */}
                      <div className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed ${
                        isHigh ? 'bg-red-50/60 border-red-100' : 'bg-emerald-50/60 border-emerald-100'
                      }`}>
                        <div className="flex items-start gap-1.5">
                          {isHigh ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-slate-700 font-medium">{rec.recommendation}</p>
                            {rec.recommendedDate && (
                              <div className="mt-1.5 inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-200/60">
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                <span className="text-[10px] font-bold text-amber-700">{'Terbaik untuk tempah sekitar: '}{rec.recommendedDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          id={`rec-btn-book-${rec.holidayId}`}
                          onClick={() => {
                            window.open(`https://online.ktmb.com.my/?from=${encodeURIComponent(rec.origin)}&to=${encodeURIComponent(rec.destination)}&date=${rec.holidayDate}`, '_blank');
                          }}
                          className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-lg text-[11px] font-extrabold hover:bg-slate-800 cursor-pointer transition"
                        >
                          {'Tempah Sekarang '}{'\u2192'}
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium">{rec.holidayName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== SECURE PROFILE SETTINGS TAB ==================== */}
        {activeTab === 'profile' && (
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
                <span className="bg-red-50 border border-red-100 text-red-650 text-red-650 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                  {'Kawalan Kriptografi'}
                </span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-2">{'Kemas Kini Kata Laluan Akaun'}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {'Tingkatkan keselamatan dengan mengemas kini bukti kelayakan log masuk anda. Dasar pelbagai faktor memerlukan persediaan yang sangat selamat.'}
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

                {/* Password strength visual guidelines */}
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
      </div>    </div>
  );
};


