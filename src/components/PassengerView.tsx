import React, { useState, useEffect } from 'react';
import { User, Station, SavedTrip, Feedback, Holiday, Recommendation } from '../types.ts';
import {
  Train, Search, Calendar, Clock, Bookmark, MessageSquare, MapPin, 
  Trash2, Edit, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Star,
  Check, ArrowRight, User as UserIcon, LogOut, ChevronRight, BookmarkPlus, HelpCircle
} from 'lucide-react';

interface PassengerViewProps {
  user: User;
  token: string;
}

type TabType = 'search' | 'trips' | 'feedback' | 'recommendations' | 'profile';

export default function PassengerView({ user, token }: PassengerViewProps) {
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

  // Note Modal States
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [tripNote, setTripNote] = useState('');
  const [savingTrip, setSavingTrip] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Trips States
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNote, setEditNote] = useState('');

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

  // Holiday State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    fetchStations();
    fetchSavedTrips();
    fetchFeedbackHistory();
    fetchHolidaysAndRecs();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    // Client-side strength check
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    const hasMinLength = newPassword.length >= 8;

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      setPassError('Password must be at least 8 characters long and contain at least: one uppercase letter, one lowercase letter, one number, and one special character/symbol.');
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
        setPassSuccess('Your password has been securely updated!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Security credentials updated successfully.');
      } else {
        setPassError(data.error || 'Failed to update password.');
      }
    } catch (e) {
      setPassError('Network error or server unreachable.');
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
      const resHolidays = await fetch('/api/holidays');
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
      } else {
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
        showToast('Trip itinerary saved successfully!');
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
    if (!window.confirm('Are you sure you want to delete this saved trip?')) return;
    try {
      const res = await fetch(`/api/saved-trips/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedTrips(savedTrips.filter(t => t.id !== id));
        showToast('Saved trip removed from database.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startEditTrip = (trip: SavedTrip) => {
    setEditingTripId(trip.id);
    setEditDate(trip.travel_date);
    setEditTime(trip.travel_time.substring(0, 5));
    setEditNote(trip.note);
  };

  const saveEditTrip = async (id: number) => {
    try {
      const res = await fetch(`/api/saved-trips/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          travel_date: editDate,
          travel_time: editTime,
          note: editNote
        })
      });

      if (res.ok) {
        setEditingTripId(null);
        fetchSavedTrips();
        showToast('Trip parameters updated.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // CROWD FEEDBACK SUBMISSION
  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbOrigin || !fbDest || !fbDate) {
      alert('Origin, destination and travel date are required.');
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
        showToast(editingFbId ? 'Feedback record modified.' : 'Feedback submitted! Thank you for supporting smart travels.');
        setEditingFbId(null);
        setFbOrigin('');
        setFbDest('');
        setFbDate('');
        setFbCrowd('Medium');
        setFbComfort(5);
        setFbDelay(false);
        setFbDelayMins(0);
        setFbComment('');
        fetchFeedbackHistory();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to submit feedback.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFb(false);
    }
  };

  const startEditFeedback = (fb: Feedback) => {
    // Validate 24 hours lock
    const createdTime = new Date(fb.created_at || '').getTime();
    const now = Date.now();
    const hours = (now - createdTime) / (1000 * 60 * 60);

    if (hours > 24) {
      alert('Editing of this feedback is locked. Submit is older than 24 hours.');
      return;
    }

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
    if (!window.confirm('Delete this feedback entry?')) return;
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFeedbackHistory(feedbackHistory.filter(f => f.id !== id));
        showToast('Feedback deleted.');
      }
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
      case 'Low': return 'Empty / Quiet (Low)';
      case 'Medium': return 'Moderate Seating (Medium)';
      case 'High': return 'Crowded (High)';
      case 'Very High': return 'Packed / Standing Room (Very High)';
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
              <p className="text-[10px] font-extrabold text-[#64748b] tracking-wider leading-none">PASSENGER CONSOLE</p>
              <h2 className="text-sm font-bold text-[#1e293b] font-display mt-1">Welcome back, {user.full_name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2" id="tab-nav">
            {(['search', 'trips', 'feedback', 'recommendations', 'profile'] as const).map((tab) => (
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
                {tab === 'search' ? 'Home/Search' : 
                 tab === 'trips' ? 'Saved Trips' : 
                 tab === 'feedback' ? 'Crowd Feedback' : 
                 tab === 'recommendations' ? 'Holidays & Recommendations' : 'Profile Settings'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto" id="passenger-viewport">
        {/* ==================== HOME / SEARCH TAB ==================== */}
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="search-grid">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8" id="predictive-flow-card">
              <div className="mb-6" id="search-flow-header">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">ML-Powered Diagnostic</span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-2">Route Demand Prediction Planner</h3>
                <p className="text-xs text-slate-500 mt-1">Select your travel points to estimate ridership counts and demand levels.</p>
              </div>

              {/* STEP 1: Select stations */}
              {step >= 1 && (
                <div className="space-y-4 border-l-2 border-slate-100 pl-4 py-1" id="step-1-block">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-4">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full inline-flex items-center justify-center text-xs">1</span>
                    Choose Station Nodes
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Origin Station</label>
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
                        <option value="">Select origin...</option>
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
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Destination Station</label>
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
                        <option value="">Select destination...</option>
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
                        <span className="text-xs font-semibold">Active route found in stations table!</span>
                      </div>
                      <button
                        id="btn-confirm-continue"
                        onClick={handleContinueToPredict}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1 rounded-lg transition"
                      >
                        Continue to Predict
                      </button>
                    </div>
                  )}

                  {routeStatus === 'unavailable' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl flex items-center gap-2" id="alert-invalid-route">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="font-semibold">Selected route not available. Check stations selection.</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Date & time */}
              {step >= 2 && (
                <div className="mt-8 border-l-2 border-indigo-200 pl-4 py-1" id="step-2-block">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-4">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full inline-flex items-center justify-center text-xs">2</span>
                    Input Departure Date & Time Frame
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Travel Date</label>
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
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Estimated Travel Time</label>
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
                        {predicting ? 'Processing Random Forest model...' : 'Calculate Predicted Demand'}
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id="btn-back-step1"
                        onClick={resetSearch}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-4 py-2 text-xs font-semibold transition"
                      >
                        Change Route
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
                    Diagnostic Report & Estimations
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl md:flex items-center justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Ridership Forecast</p>
                      <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                        {predictionResult.predictedRidership} <span className="text-sm font-sans font-medium text-slate-500">passengers/train</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Est. for {predictionResult.origin} → {predictionResult.destination} on {predictionResult.date} ({predictionResult.time})
                      </p>
                    </div>

                    <div className="mt-4 md:mt-0 text-center md:text-right">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Ridership Load</p>
                      <span className={`inline-flex items-center px-4 py-1 border text-sm font-bold rounded-full ${getDemandColor(predictionResult.demandLevel)}`}>
                        {predictionResult.demandLevel} Demand
                      </span>
                    </div>
                  </div>

                  {/* Actions (Step 4) */}
                  <div className="mt-6 flex flex-wrap gap-2" id="report-actions bg-slate-50">
                    <button
                      id="predict-btn-save"
                      onClick={() => setShowNoteModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      Save My Trip
                    </button>

                    <button
                      id="predict-btn-ktmb"
                      onClick={handleBookKTMB}
                      className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      Book Ticket on KTMB
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                      id="predict-btn-new"
                      onClick={resetSearch}
                      className="text-slate-500 hover:text-slate-800 text-xs font-medium px-4 py-2 transition"
                    >
                      Start New Query
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sideline Details */}
            <div className="space-y-6" id="search-sidebar">
              <div className="bg-slate-900 text-white rounded-2xl shadow-lg p-6 relative overflow-hidden" id="model-details-card">
                <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10">
                  <Train className="w-48 h-48" />
                </div>
                <h4 className="font-display font-bold text-base text-indigo-400">Random Forest Adaptive AI</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  The model utilizes the official KMTB historical load sheets to dynamically calculate seasonal demand multipliers. It merges with:
                </p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Malaysian calendar events mapping
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Commute peaks time tracking
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <b>Hybrid volume scaling:</b> factoring real-time crowd demand searches
                  </div>
                </div>
              </div>

              {/* Sample route listings */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="popular-routes-card">
                <h4 className="font-display font-semibold text-slate-800 text-xs uppercase tracking-wider mb-3">Popular Transit Points</h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition">
                    <span>Butterworth ⇄ KL Sentral</span>
                    <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">High Load</span>
                  </div>
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition">
                    <span>Ipoh ⇄ KL Sentral</span>
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">Medium Load</span>
                  </div>
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition">
                    <span>Padang Besar ⇄ KL Sentral</span>
                    <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">High Load</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== Note Option Modal ==================== */}
        {showNoteModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
              <h3 className="font-display font-bold text-lg text-slate-800">Add Memo to Saved Trip</h3>
              <p className="text-xs text-slate-500 mt-1">Mark this trip for later reference (e.g. "Family holiday", "Business conference").</p>
              
              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-500 block mb-1">Optional Memoir/Note</label>
                <input
                  id="modal-note-input"
                  type="text"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600"
                  placeholder="e.g. Balik kampung, Merdeka Week"
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
                  Cancel
                </button>
                <button
                  id="modal-note-btn-save"
                  disabled={savingTrip}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl transition font-bold cursor-pointer"
                  onClick={handleSaveTrip}
                >
                  {savingTrip ? 'Saving...' : 'Confirm Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SAVED TRIPS TAB ==================== */}
        {activeTab === 'trips' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="saved-trips-component">
            <div className="mb-6">
              <h3 className="font-display text-xl font-bold text-slate-800">My Saved Trip Itineraries</h3>
              <p className="text-xs text-slate-500 mt-1">Modify dates/notes, check predictive indicators, or proceed directly to check-out.</p>
            </div>

            {savedTrips.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-display text-base font-semibold text-slate-700 mt-3">No saved trips found</h4>
                <p className="text-xs text-slate-400 mt-1">Go to Home/Search and save a prediction itinerary to get started.</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Plan Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="p-3">Route Journey</th>
                      <th className="p-3">Departure Date</th>
                      <th className="p-3">Estimated Time</th>
                      <th className="p-3">Forecast Load</th>
                      <th className="p-3">Memo Notes</th>
                      <th className="p-3 text-right">Actions</th>
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
                          {editingTripId === trip.id ? (
                            <input
                              type="date"
                              className="py-1 px-2 border border-slate-200 rounded text-xs focus:outline-none"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                            />
                          ) : (
                            trip.travel_date
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {editingTripId === trip.id ? (
                            <input
                              type="time"
                              className="py-1 px-2 border border-slate-200 rounded text-xs focus:outline-none"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                            />
                          ) : (
                            trip.travel_time.substring(0, 5)
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 border text-[10px] font-bold rounded-full ${getDemandColor(trip.demand_level)}`}>
                            {trip.demand_level || 'Calculating...'} ({trip.predicted_ridership || 0})
                          </span>
                        </td>
                        <td className="p-3">
                          {editingTripId === trip.id ? (
                            <input
                              type="text"
                              className="py-1 px-2 border border-slate-200 rounded text-xs focus:outline-none w-full"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                            />
                          ) : (
                            <span className="text-slate-500 italic">{trip.note || '-'}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1.5 justify-end">
                            {editingTripId === trip.id ? (
                              <>
                                <button
                                  id={`btn-save-inline-trip-${trip.id}`}
                                  onClick={() => saveEditTrip(trip.id)}
                                  className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  id={`btn-cancel-inline-trip-${trip.id}`}
                                  onClick={() => setEditingTripId(null)}
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                                >
                                  ✖
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  id={`btn-book-saved-${trip.id}`}
                                  onClick={() => {
                                    window.open(`https://online.ktmb.com.my/?from=${encodeURIComponent(trip.origin)}&to=${encodeURIComponent(trip.destination)}&date=${trip.travel_date}`, '_blank');
                                  }}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-[10px] transition"
                                >
                                  Book on KTMB
                                </button>
                                <button
                                  id={`btn-edit-saved-${trip.id}`}
                                  onClick={() => startEditTrip(trip)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition hover:text-indigo-600"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  id={`btn-delete-saved-${trip.id}`}
                                  onClick={() => deleteTrip(trip.id)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
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
                <span className="bg-amber-50 border border-amber-100 text-amber-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">Live Assessment</span>
                <h3 className="font-display text-lg font-bold text-slate-800 mt-2">Transit Crowd Survey</h3>
                <p className="text-xs text-slate-500 mt-1">Let operators and passengers know actual load frames on recent train journeys.</p>
              </div>

              <form onSubmit={submitFeedback} className="space-y-4" id="fb-form">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="fb-origin">Origin Station</label>
                  <select
                    id="fb-origin"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-sans"
                    value={fbOrigin}
                    onChange={(e) => setFbOrigin(e.target.value)}
                  >
                    <option value="">Choose origin...</option>
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="fb-dest">Destination Station</label>
                  <select
                    id="fb-dest"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-sans"
                    value={fbDest}
                    onChange={(e) => setFbDest(e.target.value)}
                  >
                    <option value="">Choose destination...</option>
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="fb-date">Travel Date</label>
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Registered Crowd Level</label>
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Comfort Rating (1-5)</label>
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
                    <span className="text-xs font-semibold text-slate-700">Delayed Train Report?</span>
                    <button
                      type="button"
                      id="btn-fb-delay-toggle"
                      onClick={() => setFbDelay(!fbDelay)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        fbDelay ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {fbDelay ? 'Yes (Delayed)' : 'No (In-Time)'}
                    </button>
                  </div>
                  {fbDelay && (
                    <div className="animate-scale-up" id="fb-delay-picker">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Approx. delay length (Minutes)</label>
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="fb-comment">Comment Box</label>
                  <textarea
                    id="fb-comment"
                    rows={2}
                    maxLength={300}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-white"
                    placeholder="Enter short transit review (optional)"
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
                    {submittingFb ? 'Saving record...' : editingFbId ? 'Modify Commute Feed' : 'Post Crowd Feedback'}
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
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-250 text-slate-600 text-xs font-medium rounded-xl transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Private submission history */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="feedback-history-list">
              <h3 className="font-display font-bold text-lg text-slate-800 mb-4">My Real-Time Commuter Logbook</h3>

              {feedbackHistory.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 mt-2 font-medium">You have not submitted travel feedback surveys yet!</p>
                </div>
              ) : (
                <div className="space-y-4" id="fb-hist">
                  {feedbackHistory.map((fb) => {
                    const fbHours = (Date.now() - new Date(fb.created_at || '').getTime()) / (1000 * 60 * 60);
                    const canEdit = fbHours <= 24;

                    return (
                      <div key={fb.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-800">
                              {fb.origin} ➔ {fb.destination}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">
                              Journey Date: {fb.travel_date}
                            </span>
                          </div>

                          <div className="flex gap-1">
                            <span className={`inline-flex px-2 py-0.5 border text-[9px] font-bold rounded-full ${getDemandColor(fb.crowd_level)}`}>
                              Crowd: {fb.crowd_level}
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 border border-slate-200 bg-white rounded-full text-[9px] text-amber-500 font-extrabold">
                              ⭐ {fb.comfort_rating}/5
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
                                Delayed: +{fb.delay_minutes} mins
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                Train on schedule
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {canEdit ? (
                              <button
                                id={`btn-edit-fb-${fb.id}`}
                                onClick={() => startEditFeedback(fb)}
                                className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                              >
                                Edit (Ends in {Math.max(1, Math.round(24 - fbHours))}h)
                              </button>
                            ) : (
                              <span className="text-slate-400 italic">Locked (24h passed)</span>
                            )}
                            <button
                              id={`btn-delete-fb-${fb.id}`}
                              onClick={() => deleteFeedback(fb.id)}
                              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                            >
                              Delete
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
              <h3 className="font-display text-xl font-bold text-slate-800">Dynamic Malaysian Holiday Advisor</h3>
              <p className="text-xs text-slate-500 mt-1">Estimations and advice on major public holiday travels.</p>
            </div>

            {loadingRecs ? (
              <div className="text-center py-20">
                <p className="text-slate-500 text-xs font-semibold">Calculating seasonal trend load models...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
                <Calendar className="w-10 h-10 text-slate-350 mx-auto" />
                <p className="text-xs text-slate-400 mt-2">No holidays or recommendation maps defined for tracking.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="recs-list">
                {recommendations.map((rec) => {
                  const isHigh = rec.demandLevel === 'High' || rec.demandLevel === 'Very High';
                  return (
                    <div
                      key={rec.holidayId}
                      className={`p-5 rounded-2xl border transition relative overflow-hidden ${
                        isHigh ? 'border-amber-200 bg-amber-50/20' : 'border-slate-150 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded">Malaysia Public Event</span>
                          <h4 className="font-display font-extrabold text-slate-800 mt-1">{rec.holidayName}</h4>
                          <h5 className="text-[11px] font-mono font-bold text-indigo-600 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {rec.holidayDate}
                          </h5>
                        </div>

                        <div className="text-right">
                          <span className={`inline-flex px-2 py-0.5 border text-[10px] font-bold rounded-full ${getDemandColor(rec.demandLevel)}`}>
                            {rec.demandLevel} Demand
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-white rounded-xl border border-slate-100 text-xs leading-relaxed" id="rec-bulletin">
                        <div className="flex items-start gap-1.5" id="rec-card-body">
                          {isHigh ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-slate-700 font-medium">{rec.recommendation}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-semibold block">Calculated route: {rec.origin} ➔ {rec.destination}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 float-left">
                        <button
                          id={`rec-btn-book-${rec.holidayId}`}
                          onClick={() => {
                            window.open(`https://online.ktmb.com.my/?from=${encodeURIComponent(rec.origin)}&to=${encodeURIComponent(rec.destination)}&date=${rec.holidayDate}`, '_blank');
                          }}
                          className="bg-slate-900 border-b border-black text-white px-3 py-1 rounded-lg text-[10px] font-extrabold hover:bg-slate-800 cursor-pointer"
                        >
                          Book For {rec.holidayName}
                        </button>
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
                  Active Session
                </span>
                <h3 className="font-display text-lg font-bold text-slate-800 mt-2">Identity Credentials</h3>
                <p className="text-xs text-slate-500 mt-1">Review active security state & account registration scopes.</p>
                
                <div className="mt-6 space-y-4" id="profile-stats">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Full Name</span>
                    <span className="text-sm font-bold text-slate-700">{user.full_name}</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Username ID</span>
                    <span className="text-sm font-bold text-slate-700">{user.username}</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Assigned Privilege Role</span>
                    <span className="text-xs font-bold bg-[#e0e7ff] text-[#4f46e5] px-2 py-0.5 rounded-full inline-block uppercase tracking-wide mt-1">
                      {user.role}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Security Shield Status</span>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-block uppercase tracking-wide mt-1">
                      {user.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Encrypted with SHA-256 equivalent standard</span>
              </div>
            </div>

            {/* Right Box: Change Password Form */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8" id="profile-password-form">
              <div className="mb-6">
                <span className="bg-red-50 border border-red-100 text-red-650 text-red-650 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                  Cryptographic Control
                </span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-2">Update Account Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enhance security by updating your sign-in credentials. Multi-factor policies require a highly secure setup.
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
                    Current Password
                  </label>
                  <input
                    id="old-password"
                    type="password"
                    required
                    className="w-full py-2 px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                    placeholder="Enter current active password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="new-password">
                      New Strong Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      required
                      className="w-full py-2 px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                      placeholder="At least 8 complex characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="confirm-password">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      className="w-full py-2 px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 font-sans"
                      placeholder="Re-enter new secure password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password strength visual guidelines */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6" id="pass-hardness-guide">
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Required Encryption Requirements</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${newPassword.length >= 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {newPassword.length >= 8 ? '✓' : '•'}
                      </span>
                      <span className={newPassword.length >= 8 ? 'text-emerald-700' : 'text-slate-500'}>Minimum 8 characters</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[^A-Za-z0-9]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[^A-Za-z0-9]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>At least one symbol (e.g., @, #, $, !)</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[A-Z]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[A-Z]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>At least one uppercase letter (A-Z)</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[0-9]/.test(newPassword) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                        {/[0-9]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/[0-9]/.test(newPassword) ? 'text-emerald-700' : 'text-slate-500'}>At least one numeric digit (0-9)</span>
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
          </div>
        )}
      </div>
    </div>
  );
}
