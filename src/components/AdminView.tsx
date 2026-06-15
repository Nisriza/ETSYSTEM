import React, { useState, useEffect } from 'react';
import { User, Holiday } from '../types.ts';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users, BarChart3, Calendar, Database, Cpu, Plus, Trash2, Edit, Save, 
  RotateCw, RefreshCw, CheckCircle2, ChevronRight, Sparkles, Server, 
  TrendingUp, BarChart, FileSpreadsheet, Lock, AlertCircle, UploadCloud, Play, Loader2
} from 'lucide-react';

interface AdminViewProps {
  user: User;
  token: string;
}

type AdminSubTab = 'users' | 'telemetry' | 'holidays' | 'dataset' | 'model';

export default function AdminView({ user, token }: AdminViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('users');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States: Users CRUD
  const [usersList, setUsersList] = useState<User[]>([]);
  const [newFullname, setNewFullname] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'passenger' | 'operator' | 'admin'>('passenger');
  const [savingUser, setSavingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<'passenger' | 'operator' | 'admin'>('passenger');
  const [editStatus, setEditStatus] = useState<string>('active');

  // States: Telemetry
  const [telemetry, setTelemetry] = useState<{
    activeUsers: number;
    totalPredictions: number;
    topRoutes: { origin: string; destination: string; volume: number }[];
    dailyVolume: { date: string; volume: number }[];
  } | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // States: Holidays CRUD
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null);
  const [editHolidayName, setEditHolidayName] = useState('');
  const [editHolidayDate, setEditHolidayDate] = useState('');

  // States: Dataset CRUD
  const [datasetOverview, setDatasetOverview] = useState<{
    totalRecords: number;
    stats: { minRider: number; maxRider: number; avgRider: number };
    samples: { id: number; date: string; time: string; origin: string; destination: string; ridership_count: number }[];
  } | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [editingDatasetId, setEditingDatasetId] = useState<number | null>(null);
  const [editDsDate, setEditDsDate] = useState('');
  const [editDsTime, setEditDsTime] = useState('');
  const [editDsOrig, setEditDsOrig] = useState('');
  const [editDsDest, setEditDsDest] = useState('');
  const [editDsCount, setEditDsCount] = useState(0);

  // States: ML Management
  const [modelMetrics, setModelMetrics] = useState<{
    mae: number;
    rmse: number;
    r2: number;
    trainedAt: string;
    totalRecords: number;
    notes: string;
  } | null>(null);
  const [trainingModel, setTrainingModel] = useState(false);

  useEffect(() => {
    fetchSubTabData();
  }, [activeSubTab]);

  const fetchSubTabData = () => {
    if (activeSubTab === 'users') fetchUsers();
    if (activeSubTab === 'telemetry') fetchTelemetry();
    if (activeSubTab === 'holidays') fetchHolidays();
    if (activeSubTab === 'dataset') fetchDataset();
    if (activeSubTab === 'model') fetchModelMetrics();
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // ==================== USERS CRUD ====================
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setUsersList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullname.trim() || !newUsername.trim() || !newPassword.trim()) return;
    setSavingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: newFullname,
          username: newUsername,
          password: newPassword,
          role: newRole
        })
      });

      if (res.ok) {
        showToast(`User ${newUsername} recorded successfully.`);
        setNewFullname('');
        setNewUsername('');
        setNewPassword('');
        setNewRole('passenger');
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to record user.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingUser(false);
    }
  };

  const toggleSuspension = async (userId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        showToast(nextStatus === 'active' ? 'User reinstated.' : 'User suspended and session terminated.');
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!window.confirm('Mark this user suspended/deleted in MySQL?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('User state suspended.');
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Operation failed.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveEditUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: editRole, status: editStatus })
      });
      if (res.ok) {
        showToast('User modifications saved to database.');
        setEditingUserId(null);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==================== SYSTEM TELEMETRY ====================
  const fetchTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const res = await fetch('/api/admin/system-usage', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setTelemetry(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // ==================== MALAYSIAN EVENTS AND HOLIDAYS CRUD ====================
  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/holidays');
      if (res.ok) setHolidays(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;
    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newHolidayName, date: newHolidayDate })
      });

      if (res.ok) {
        showToast('Special public date registered.');
        setNewHolidayName('');
        setNewHolidayDate('');
        fetchHolidays();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncGoogleCalendar = async () => {
    setSyncingGoogle(true);
    try {
      const res = await fetch('/api/admin/holidays/google-sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message || 'Holidays Google/Gemini index synchronization executed!');
        fetchHolidays();
      } else {
        alert(d.error || 'Failed Google Sync process.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingGoogle(false);
    }
  };

  const deleteHoliday = async (id: number) => {
    if (!window.confirm('Delete this public holiday constraint?')) return;
    try {
      const res = await fetch(`/api/admin/holidays/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Holiday event purged.');
        fetchHolidays();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveEditHoliday = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/holidays/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editHolidayName, date: editHolidayDate })
      });
      if (res.ok) {
        showToast('Holiday revised.');
        setEditingHolidayId(null);
        fetchHolidays();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==================== DATASET CODENAME CRUD ====================
  const fetchDataset = async () => {
    try {
      const res = await fetch('/api/admin/dataset', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setDatasetOverview(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadCsv = async () => {
    if (!csvContent.trim()) return;
    setUploadingCsv(true);
    try {
      const res = await fetch('/api/admin/dataset/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ csvData: csvContent })
      });

      const d = await res.json();
      if (res.ok) {
        showToast(d.message || 'Dataset rows fully parsing and committed.');
        setCsvContent('');
        fetchDataset();
      } else {
        alert(d.error || 'Parsing error.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleClearDataset = async () => {
    if (!window.confirm('WARNING: Are you sure you want to empty the entire Ridership dataset? This will wipe the primary forecasting dataset.')) return;
    try {
      const res = await fetch('/api/admin/dataset/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Ridership tables formatted.');
        fetchDataset();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteDatasetRow = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/dataset/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Ridership log removed.');
        fetchDataset();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveEditDataset = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/dataset/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: editDsDate,
          time: editDsTime,
          origin: editDsOrig,
          destination: editDsDest,
          ridership_count: editDsCount
        })
      });
      if (res.ok) {
        showToast('Ridership row revised.');
        setEditingDatasetId(null);
        fetchDataset();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==================== ML MODEL CONTROLS ====================
  const fetchModelMetrics = async () => {
    try {
      const res = await fetch('/api/admin/model', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setModelMetrics(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const triggerRetrain = async () => {
    setTrainingModel(true);
    try {
      const res = await fetch('/api/admin/model/retrain', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) {
        showToast('Heuristic matrices fitting completed successfully!');
        setModelMetrics(d.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTrainingModel(false);
    }
  };

  return (
    <div className="w-full" id="admin-dashboard">
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-2 animate-bounce max-w-sm" id="toast-admin">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Dashboard Top bar menu */}
      <div className="bg-white border-b border-[#e2e8f0] sticky top-0 z-10 px-4 md:px-8 py-3" id="admin-header-nav">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-2.5 bg-[#4f46e5]/10 border border-[#4f46e5]/20 rounded-xl text-[#4f46e5]">
              <Server className="h-4.5 w-4.5" />
            </span>
            <div id="welcome-admin">
              <p className="text-[10px] font-extrabold text-[#64748b] tracking-wider leading-none">SYSTEM ADMINISTRATION</p>
              <h2 className="text-sm font-bold text-[#1e293b] font-display mt-0.5">Control Terminal</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" id="admin-tabs">
            {(['users', 'telemetry', 'holidays', 'dataset', 'model'] as const).map((tab) => (
              <button
                key={tab}
                id={`admin-tab-btn-${tab}`}
                onClick={() => setActiveSubTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeSubTab === tab 
                    ? 'bg-[#4f46e5] text-white shadow-sm border border-[#4338ca]' 
                    : 'text-[#64748b] bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]'
                }`}
              >
                {tab === 'users' ? 'User Management' : 
                 tab === 'telemetry' ? 'System Telemetry' : 
                 tab === 'holidays' ? 'Holidays Calendar' : 
                 tab === 'dataset' ? 'Dataset (CSV)' : 'ML Retrain Panel'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto animate-fade-in" id="admin-viewport">
        {/* ==================== SUBTAB: USER CRUD ==================== */}
        {activeSubTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="admin-users-row">
            {/* User Form creation */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="user-creation-card">
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-4">Provision New Account</h3>
              
              <form onSubmit={handleCreateUser} className="space-y-4" id="admin-user-flow">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="fullname">Full Name</label>
                  <input
                    id="fullname"
                    type="text"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    placeholder="e.g. Aminah binti Ali"
                    value={newFullname}
                    onChange={(e) => setNewFullname(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="username">Username (Unique)</label>
                  <input
                    id="username"
                    type="text"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    placeholder="e.g. aminah"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="password">Initial Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    placeholder="e.g. secure123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Authority Role</label>
                  <div className="grid grid-cols-3 gap-2" id="new-user-role-grid">
                    {(['passenger', 'operator', 'admin'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        id={`btn-new-user-role-${role}`}
                        className={`py-2 border text-center text-xs font-bold rounded-xl capitalize transition cursor-pointer ${
                          newRole === role 
                            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-600' 
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                        onClick={() => setNewRole(role)}
                      >
                        {role === 'operator' ? 'Operator' : role}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  id="btn-admin-submit-user"
                  type="submit"
                  disabled={savingUser}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  {savingUser ? 'Provisioning...' : 'Provision User Account'}
                </button>
              </form>
            </div>

            {/* User Lists Table */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="user-grid-card">
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-4">ETS Active Operational Accounts</h3>

              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3">User Profiles</th>
                      <th className="p-3">Username ID</th>
                      <th className="p-3">Authority Degree</th>
                      <th className="p-3">Account Status</th>
                      <th className="p-3 text-right">Actions Panel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-800 font-bold flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold flex items-center justify-center">
                            {usr.full_name[0]}
                          </span>
                          <span>{usr.full_name}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{usr.username}</td>
                        <td className="p-3">
                          {editingUserId === usr.id ? (
                            <select
                              className="py-1 px-2 border border-slate-200 rounded text-xs"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as any)}
                            >
                              <option value="passenger">Passenger</option>
                              <option value="operator">Operator</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-extrabold rounded-full ${
                              usr.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                              usr.role === 'operator' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {usr.role === 'operator' ? 'ETS Operator' : usr.role}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {editingUserId === usr.id ? (
                            <select
                              className="py-1 px-2 border border-slate-200 rounded text-xs"
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 font-bold ${usr.status === 'active' ? 'text-emerald-600' : 'text-rose-500'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${usr.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                              {usr.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {editingUserId === usr.id ? (
                              <button
                                id={`btn-save-edit-user-${usr.id}`}
                                onClick={() => saveEditUser(usr.id)}
                                className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition"
                              >
                                Save Changes
                              </button>
                            ) : (
                              <>
                                <button
                                  id={`btn-edit-user-${usr.id}`}
                                  onClick={() => {
                                    setEditingUserId(usr.id);
                                    setEditRole(usr.role);
                                    setEditStatus(usr.status);
                                  }}
                                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition"
                                >
                                  Edit
                                </button>
                                <button
                                  id={`btn-suspend-toggle-user-${usr.id}`}
                                  onClick={() => toggleSuspension(usr.id, usr.status)}
                                  className={`p-1 hover:bg-slate-100 text-slate-500 rounded transition font-bold text-[10px] ${usr.status === 'active' ? 'hover:text-red-650 text-red-500' : 'text-emerald-600'}`}
                                >
                                  {usr.status === 'active' ? 'Suspend' : 'Reinstate'}
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
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: TELEMETRY ==================== */}
        {activeSubTab === 'telemetry' && (
          <div className="space-y-6" id="telemetry-wrapper">
            {/* Highlights cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="telemetry-cards">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Secured Accounts</span>
                  <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                    {telemetry?.activeUsers || 0}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Registries matching database user row indices</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Aggregated System Usage</span>
                  <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                    {telemetry?.totalPredictions || 0} <span className="text-xs font-sans text-slate-400 font-bold">queries</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Total run iterations with active saving triggers</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Cpu className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">System Integrity</span>
                  <h4 className="text-3xl font-extrabold text-white mt-1.5 font-mono">OK</h4>
                  <p className="text-xs text-indigo-400 mt-1 font-bold">SSL & Relational PRAGMA parameters active</p>
                </div>
                <div className="p-3 bg-slate-800 text-indigo-400 rounded-xl">
                  <TrendingUp className="h-5 w-5 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Graph Chart and Route Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="telemetry-details">
              {/* Plot */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="queries-trend-plot">
                <h4 className="font-display font-extrabold text-sm uppercase text-slate-800 mb-4 tracking-wider flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-indigo-600" /> API Query Traffic Index (Requests over Time)
                </h4>
                {telemetry ? (
                  <div className="h-72 w-full" id="area-graph">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={telemetry.dailyVolume} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                        <Tooltip />
                        <Area type="monotone" dataKey="volume" stroke="#6366f1" fill="#818cf8" fillOpacity={0.15} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-24 text-slate-400 text-xs">Awaiting log compilations...</div>
                )}
              </div>

              {/* Busiest Queries */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-h-96 overflow-y-auto" id="top-predicted-queries">
                <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest mb-3">Top Queried Station Pairs</h4>
                
                {telemetry && telemetry.topRoutes.length > 0 ? (
                  <div className="space-y-3" id="top-routes-list">
                    {telemetry.topRoutes.map((route, i) => (
                      <div key={`${route.origin}-${route.destination}`} className="flex items-center justify-between p-3 border border-slate-50 hover:border-slate-100 rounded-xl hover:bg-slate-50/30 transition">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{route.origin} ➔ {route.destination}</p>
                          <span className="text-[10px] text-slate-400 font-bold block">Rank #{i + 1} Searched Route</span>
                        </div>
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                          {route.volume} hits
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">No prediction requests logged yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: HOLIDAYS ==================== */}
        {activeSubTab === 'holidays' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="holidays-grid">
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="holiday-creation-wrapper">
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">Add Exceptional Calendar Day</h3>
              <p className="text-[11px] text-slate-400 mb-4">Introduce national Malaysian milestones directly into SQLite.</p>

              <form onSubmit={handleCreateHoliday} className="space-y-4" id="holiday-form">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="h-name">Holiday Theme Name</label>
                  <input
                    id="h-name"
                    type="text"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    placeholder="e.g. Hari Kaamatan"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="h-date">Holiday Real Date</label>
                  <input
                    id="h-date"
                    type="date"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="btn-add-holiday"
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-2 cursor-pointer text-xs font-bold transition"
                  >
                    Insert New Holiday
                  </button>
                </div>
              </form>

              {/* Sync Button */}
              <div className="mt-8 border-t border-slate-100 pt-6" id="sync-console-section">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Google Sync & Re-execution</span>
                <button
                  id="btn-google-sync"
                  onClick={handleSyncGoogleCalendar}
                  disabled={syncingGoogle}
                  className="w-full bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white text-xs font-extrabold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100"
                >
                  {syncingGoogle ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Synchronizing Malaysian Holidays...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Auto-Sync Malaysia Holidays
                    </>
                  )}
                </button>
                <p className="text-[9px] font-semibold text-slate-400 leading-normal mt-2">
                  Invokes Gemini models server-side to download, parse, and synchronize official calendars for both current and upcoming calendar years.
                </p>
              </div>
            </div>

            {/* List Holidays */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="holidays-grid-card">
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-4">Official Holiday Transit Multipliers</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto" id="holiday-items">
                {holidays.map((h) => (
                  <div key={h.id} className="p-4 border border-slate-150 rounded-xl bg-slate-50/50 flex items-center justify-between">
                    <div>
                      {editingHolidayId === h.id ? (
                        <div className="space-y-1.5" id={`edit-holiday-inputs-${h.id}`}>
                          <input
                            type="text"
                            className="py-1 px-2 border border-slate-200 rounded text-xs focus:outline-none w-full"
                            value={editHolidayName}
                            onChange={(e) => setEditHolidayName(e.target.value)}
                          />
                          <input
                            type="date"
                            className="py-1 px-2 border border-slate-200 rounded text-xs focus:outline-none w-full"
                            value={editHolidayDate}
                            onChange={(e) => setEditHolidayDate(e.target.value)}
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-display font-bold text-slate-800 text-xs">{h.name}</h4>
                          <span className="text-[10px] font-mono text-indigo-600 font-bold block mt-0.5">{h.date}</span>
                        </>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {editingHolidayId === h.id ? (
                        <>
                          <button
                            id={`btn-save-inline-holiday-${h.id}`}
                            onClick={() => saveEditHoliday(h.id)}
                            className="p-1 px-1.5 bg-emerald-100 hover:bg-emerald-200 rounded text-emerald-800 text-[10px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            id={`btn-cancel-inline-holiday-${h.id}`}
                            onClick={() => setEditingHolidayId(null)}
                            className="p-1 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 text-[10px] font-bold"
                          >
                            ✖
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            id={`btn-edit-holiday-${h.id}`}
                            onClick={() => {
                              setEditingHolidayId(h.id);
                              setEditHolidayName(h.name);
                              setEditHolidayDate(h.date);
                            }}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded text-[10px] transition font-bold"
                          >
                            Edit
                          </button>
                          <button
                            id={`btn-delete-holiday-${h.id}`}
                            onClick={() => deleteHoliday(h.id)}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-red-500 rounded text-[10px] transition font-bold"
                          >
                            Purge
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: DATASET ==================== */}
        {activeSubTab === 'dataset' && (
          <div className="space-y-6" id="dataset-wrapper">
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4" id="dataset-header">
              <div>
                <h3 className="font-display font-extrabold text-[#111827] text-lg">Historical Ridership Ledger</h3>
                <p className="text-xs text-slate-400 mt-0.5">Edit, clean, parse and manage your model's historical training datasets (Ridership table).</p>
              </div>

              <div className="flex gap-2">
                <button
                  id="btn-format-ridership"
                  onClick={handleClearDataset}
                  className="bg-red-50 hover:bg-red-100 text-red-650 text-red-600 px-4 py-1.5 rounded-xl border border-red-200 text-xs font-bold transition cursor-pointer"
                >
                  Empty Ridership Table
                </button>
              </div>
            </div>

            {/* Metrics cards and CSV uploader */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="dataset-split">
              {/* Stat card + raw Uploader */}
              <div className="lg:col-span-1 space-y-6" id="uploader-column">
                <div className="bg-slate-900 border border-black text-white p-5 rounded-2xl shadow-sm" id="dataset-details-card">
                  <h4 className="font-display font-extrabold text-sm text-indigo-400">Ledger Summary Metrics</h4>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Total Loaded Rows</p>
                      <p className="text-2xl font-bold font-mono mt-1 text-white">{datasetOverview?.totalRecords || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Average Passenger Load</p>
                      <p className="text-2xl font-bold font-mono mt-1 text-white">{Math.round(datasetOverview?.stats?.avgRider || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Minimum Load</p>
                      <p className="text-xl font-bold font-mono mt-1 text-emerald-400">{datasetOverview?.stats?.minRider || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Maximum Load</p>
                      <p className="text-xl font-bold font-mono mt-1 text-red-400">{datasetOverview?.stats?.maxRider || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm" id="csv-uploader-card">
                  <h4 className="font-display font-extrabold text-[#111827] text-xs uppercase tracking-wider mb-2">CSV Upload Stream</h4>
                  <p className="text-[10px] text-slate-400 mb-3">Copy-paste comma delimited ridership rows.</p>

                  <textarea
                    id="csv-textarea"
                    rows={6}
                    className="w-full p-3 font-mono text-[9px] border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 bg-slate-50 focus:bg-white transition"
                    placeholder="e.g.&#10;date,time,origin,destination,ridership_count&#10;2026-05-01,08:00:00,Butterworth,KL Sentral,350&#10;2026-05-01,18:00:00,KL Sentral,Ipoh,240"
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                  />

                  <button
                    id="btn-upload-csv"
                    onClick={handleUploadCsv}
                    disabled={uploadingCsv || !csvContent.trim()}
                    className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className="h-4 w-4" />
                    {uploadingCsv ? 'Waging transactional inserts...' : 'Parse & Commit Data Streams'}
                  </button>
                </div>
              </div>

              {/* Sample list block */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="dataset-list-wrapper">
                <h4 className="font-display font-semibold text-slate-800 text-sm mb-4">Loaded Samples (Latest 50 entries)</h4>

                <div className="overflow-x-auto rounded-xl max-h-[480px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">Track Info</th>
                        <th className="p-3">Schedule Date</th>
                        <th className="p-3">Schedule Time</th>
                        <th className="p-3">Passenger Load</th>
                        <th className="p-3 text-right">Edit Panels</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {datasetOverview?.samples?.map((sample) => (
                        <tr key={sample.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">
                            {editingDatasetId === sample.id ? (
                              <div className="space-y-1" id={`ds-route-inputs-${sample.id}`}>
                                <input
                                  type="text"
                                  className="py-0.5 px-2 border rounded text-[11px] w-24"
                                  value={editDsOrig}
                                  onChange={(e) => setEditDsOrig(e.target.value)}
                                  placeholder="Origin"
                                />
                                <input
                                  type="text"
                                  className="py-0.5 px-2 border rounded text-[11px] w-24"
                                  value={editDsDest}
                                  onChange={(e) => setEditDsDest(e.target.value)}
                                  placeholder="Dest"
                                />
                              </div>
                            ) : (
                              `${sample.origin} ➔ ${sample.destination}`
                            )}
                          </td>
                          <td className="p-3">
                            {editingDatasetId === sample.id ? (
                              <input
                                type="date"
                                className="py-0.5 px-2 border border-slate-200 rounded text-[11px]"
                                value={editDsDate}
                                onChange={(e) => setEditDsDate(e.target.value)}
                              />
                            ) : (
                              sample.date
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {editingDatasetId === sample.id ? (
                              <input
                                type="time"
                                className="py-0.5 px-2 border border-slate-200 rounded text-[11px]"
                                value={editDsTime}
                                onChange={(e) => setEditDsTime(e.target.value)}
                              />
                            ) : (
                              sample.time.substring(0, 5)
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-900 font-extrabold text-xs">
                            {editingDatasetId === sample.id ? (
                              <input
                                type="number"
                                className="py-0.5 px-2 border border-slate-200 rounded text-[11px] w-16"
                                value={editDsCount}
                                onChange={(e) => setEditDsCount(parseInt(e.target.value) || 0)}
                              />
                            ) : (
                              sample.ridership_count
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {editingDatasetId === sample.id ? (
                                <>
                                  <button
                                    id={`btn-save-inline-ds-${sample.id}`}
                                    onClick={() => saveEditDataset(sample.id)}
                                    className="p-1 bg-emerald-100 text-emerald-800 rounded font-bold hover:bg-emerald-250 transition text-[10px]"
                                  >
                                    Save
                                  </button>
                                  <button
                                    id={`btn-cancel-inline-ds-${sample.id}`}
                                    onClick={() => setEditingDatasetId(null)}
                                    className="p-1 border text-slate-500 rounded hover:bg-slate-50 transition text-[10px]"
                                  >
                                    ✖
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    id={`btn-edit-ds-${sample.id}`}
                                    onClick={() => {
                                      setEditingDatasetId(sample.id);
                                      setEditDsDate(sample.date);
                                      setEditDsTime(sample.time);
                                      setEditDsOrig(sample.origin);
                                      setEditDsDest(sample.destination);
                                      setEditDsCount(sample.ridership_count);
                                    }}
                                    className="p-1 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    id={`btn-delete-ds-${sample.id}`}
                                    onClick={() => deleteDatasetRow(sample.id)}
                                    className="p-1 text-slate-500 hover:text-red-500 rounded cursor-pointer"
                                  >
                                    Delete
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
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: ML MODEL CONTROLS ==================== */}
        {activeSubTab === 'model' && (
          <div className="max-w-3xl mx-auto space-y-6" id="model-management-panel">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="model-info-intro">
              <h3 className="font-display font-extrabold text-slate-800 text-lg">Machine Learning Decission Tree Training Controller</h3>
              <p className="text-xs text-slate-500 mt-1">
                Trigger mathematical fits against entries in the Ridership table to adjust day metrics, commute multipliers and seasonal coefficients dynamically.
              </p>
            </div>

            {modelMetrics ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="model-grid-metrics">
                <div className="bg-white p-5 border border-slate-200 rounded-2xl text-center shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Mean Absolute Error (MAE)</p>
                  <p className="text-3xl font-extrabold text-[#4F46E5] mt-3 font-mono">{modelMetrics.mae} riders</p>
                  <p className="text-[10px] text-slate-450 text-slate-500 mt-1 font-semibold">Lower score indicates better static accuracy</p>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-2xl text-center shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Root Mean Squared Error (RMSE)</p>
                  <p className="text-3xl font-extrabold text-[#D97706] mt-3 font-mono">{modelMetrics.rmse} passengers</p>
                  <p className="text-[10px] text-slate-450 text-slate-500 mt-1 font-semibold">Standard deviation of residuals/errors</p>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-2xl text-center shadow-sm font-sans">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">R-Squared Coefficient (R²)</p>
                  <p className="text-3xl font-extrabold text-[#10B981] mt-3 font-mono">{(modelMetrics.r2 * 100).toFixed(0)}% fit</p>
                  <p className="text-[10px] text-slate-450 text-slate-500 mt-1 font-semibold">Proportion of explainable load variances</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl">Calculating indicators...</div>
            )}

            {/* Train triggers */}
            <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-sm text-center relative overflow-hidden" id="training-console">
              <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-5">
                <Cpu className="w-64 h-64" />
              </div>

              <h4 className="font-display font-extrabold text-base mb-3 text-indigo-400">Database Optimizing Trainer</h4>
              <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed mb-6">
                Recalculates the error margins using actual rows currently stored in the historical Ridership table. Retraining updates the core parameters and stamps new R² benchmarks instantly.
              </p>

              <button
                id="btn-trigger-model-retrain"
                onClick={triggerRetrain}
                disabled={trainingModel}
                className="inline-flex items-center gap-2 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white px-8 py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-900/30 cursor-pointer"
              >
                {trainingModel ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Fitting Day Multipliers...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 text-white fill-white" />
                    Retrain Forecasting Model Now
                  </>
                )}
              </button>

              {modelMetrics && (
                <div className="mt-6 text-[11px] text-slate-450 text-slate-400 font-semibold" id="last-stamp">
                  Last Model Fitting Cycle executed: {new Date(modelMetrics.trainedAt).toLocaleString()} | Rows: {modelMetrics.totalRecords} entries
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
