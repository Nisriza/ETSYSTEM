import React, { useState, useEffect, useMemo } from 'react';
import { User, Holiday, Station, RouteConnection, OperatorRecord } from '../types.ts';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users, MapPin, BarChart3, Calendar, Database, Cpu, Plus, Trash2, Edit, Save, 
  RotateCw, RefreshCw, CheckCircle2, ChevronRight, Sparkles, Server, 
  TrendingUp, BarChart, Lock, AlertCircle, AlertTriangle, Play, Loader2, DownloadCloud, Settings, UploadCloud, FileSpreadsheet
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';

interface AdminViewProps {
  user: User;
  token: string;
}

type AdminSubTab = 'users' | 'telemetry' | 'holidays' | 'model' | 'operators' | 'stations' | 'profile' | 'dataset';

export default function AdminViewBM({ user, token }: AdminViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('users');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States: Users CRUD
  const [usersList, setUsersList] = useState<User[]>([]);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [newFullname, setNewFullname] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'passenger' | 'operator' | 'admin'>('admin');
  const [savingUser, setSavingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<'passenger' | 'operator' | 'admin'>('passenger');
  const [editStatus, setEditStatus] = useState<string>('active');

  // States: Telemetry
  const [telemetry, setTelemetry] = useState<{
    userCounts: Record<string, number>;
    stationsByState: { state: string; count: number }[];
    totalPredictions: number;
    topRoutes: { origin: string; destination: string; volume: number; demandLevel: string; avgRidership: number }[];
    dailyVolume: { date: string; volume: number }[];
  } | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // States: Holidays CRUD
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null);
  const [editHolidayName, setEditHolidayName] = useState('');
  const [editHolidayDate, setEditHolidayDate] = useState('');
  const [syncingHolidays, setSyncingHolidays] = useState(false);

  // States: Operator Approval
  const [operatorList, setOperatorList] = useState<OperatorRecord[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  // States: Stations & Routes
  const [adminStations, setAdminStations] = useState<Station[]>([]);
  const [routeConnections, setRouteConnections] = useState<RouteConnection[]>([]);
  const [newStationName, setNewStationName] = useState('');
  const [newStationState, setNewStationState] = useState('');
  const [editingStationId, setEditingStationId] = useState<number | null>(null);
  const [editStationName, setEditStationName] = useState('');
  const [editStationState, setEditStationState] = useState('');
  const [newRouteOrigin, setNewRouteOrigin] = useState('');
  const [newRouteDest, setNewRouteDest] = useState('');
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [editRouteOrigin, setEditRouteOrigin] = useState('');
  const [editRouteDest, setEditRouteDest] = useState('');
  const [stationRefreshKey, setStationRefreshKey] = useState(0);

  // States: ML Management
  const [modelMetrics, setModelMetrics] = useState<{
    mae: number;
    rmse: number;
    r2: number;
    trainedAt: string;
    totalRecords: number;
    notes: string;
    processingTime?: number;
  } | null>(null);
  const [trainingModel, setTrainingModel] = useState(false);
  const [trainLogs, setTrainLogs] = useState<string[]>([]);
  const [trainProgress, setTrainProgress] = useState(0);

  // Profile Settings state
  const [profileOldPw, setProfileOldPw] = useState('');
  const [profileNewPw, setProfileNewPw] = useState('');
  const [profileConfirmPw, setProfileConfirmPw] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Dataset Upload state
  const [datasetOverview, setDatasetOverview] = useState<{ exists: boolean; fileName: string | null; totalRows: number } | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [datasetPreview, setDatasetPreview] = useState<{ headers: string[]; rows: Record<string, string>[]; totalRows: number } | null>(null);
  const [clearingDataset, setClearingDataset] = useState(false);
  const [datasetExists, setDatasetExists] = useState(false);

  useEffect(() => {
    fetchSubTabData();
  }, [activeSubTab]);

  const fetchSubTabData = () => {
    if (activeSubTab === 'users') fetchUsers();
    if (activeSubTab === 'telemetry') fetchTelemetry();
    if (activeSubTab === 'holidays') fetchHolidays();
    if (activeSubTab === 'model') {
      fetchModelMetrics();
      apiFetch('/api/admin/dataset', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => setDatasetExists(d?.exists ?? false))
        .catch(() => setDatasetExists(false));
    }
    if (activeSubTab === 'operators') fetchOperators();
    if (activeSubTab === 'stations') { fetchAdminStations(); fetchRouteConnections(); }
    if (activeSubTab === 'dataset') { fetchDatasetOverview(); fetchDatasetPreview(); }
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const groupedHolidays: { month: number; items: Holiday[] }[] = React.useMemo(() => {
    const groups: Record<number, Holiday[]> = {};
    for (const h of holidays) {
      const m = new Date(h.date).getMonth();
      if (!groups[m]) groups[m] = [];
      groups[m].push(h);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([month, items]) => ({ month: Number(month), items }));
  }, [holidays]);

  const filteredDestStations = useMemo(() => {
    if (!newRouteOrigin) return adminStations;
    const originId = parseInt(newRouteOrigin);
    const connectedIds = new Set<number>();
    connectedIds.add(originId);
    routeConnections.forEach(rc => {
      if (rc.origin_station_id === originId) connectedIds.add(rc.destination_station_id);
      if (rc.destination_station_id === originId) connectedIds.add(rc.origin_station_id);
    });
    return adminStations.filter(s => !connectedIds.has(s.id));
  }, [newRouteOrigin, adminStations, routeConnections]);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // ==================== USERS CRUD ====================
  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
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
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ full_name: newFullname, username: newUsername, password: newPassword, role: newRole })
      });
      if (res.ok) {
        showToast(`Pengguna ${newUsername} berjaya dibuat.`);
        setNewFullname(''); setNewUsername(''); setNewPassword(''); setNewRole('admin');
        setShowProvisionModal(false);
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal membuat pengguna.');
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
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        showToast(nextStatus === 'active' ? 'Pengguna dipulihkan.' : 'Pengguna digantung.');
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (userId: number) => {
      if (!window.confirm('Padamkan pengguna ini?')) return;
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Pengguna dipadam.');
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal memadam pengguna.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveEditUser = async (userId: number) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: editRole, status: editStatus })
      });
      if (res.ok) {
        showToast('Pengguna dikemas kini.');
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
      const res = await apiFetch('/api/admin/system-usage', { headers: { 'Authorization': `Bearer ${token}` } });
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
      const res = await apiFetch('/api/holidays?all=true', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setHolidays(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * Menarik cuti umum kebangsaan Malaysia tahun semasa daripada Nager.Date.
   * Baris sedia ada tidak diubah supaya suntingan admin dan cuti negeri kekal.
   */
  const handleSyncHolidays = async () => {
    setSyncingHolidays(true);
    try {
      const res = await apiFetch('/api/admin/holidays/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ year: new Date().getFullYear() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(
          `Berjaya selaras ${data.fetched ?? 0} cuti untuk ${data.year ?? new Date().getFullYear()}: ` +
          `${data.inserted ?? 0} ditambah, ${data.skipped ?? 0} sudah wujud.`
        );
        fetchHolidays();
      } else {
        showToast(data.error || 'Penyelarasan cuti gagal.');
      }
    } catch (e) {
      console.error(e);
      showToast('Penyelarasan cuti gagal. Sila semak sambungan pelayan.');
    } finally {
      setSyncingHolidays(false);
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;
    try {
      const res = await apiFetch('/api/admin/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newHolidayName, date: newHolidayDate })
      });

      if (res.ok) {
        showToast('Cuti berjaya ditambah.');
        setNewHolidayName('');
        setNewHolidayDate('');
        fetchHolidays();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteHoliday = async (id: number) => {
    if (!window.confirm('Padamkan cuti ini?')) return;
    try {
      const res = await apiFetch(`/api/admin/holidays/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Cuti dipadam.');
        fetchHolidays();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveEditHoliday = async (id: number) => {
    try {
      const res = await apiFetch(`/api/admin/holidays/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editHolidayName, date: editHolidayDate })
      });
      if (res.ok) {
        showToast('Cuti dikemas kini.');
        setEditingHolidayId(null);
        fetchHolidays();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==================== OPERATORS APPROVAL ====================
  const fetchOperators = async () => {
    setLoadingOperators(true);
    try {
      const res = await apiFetch('/api/admin/operators', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setOperatorList(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOperators(false);
    }
  };

  const handleApproveOperator = async (id: number) => {
    try {
      const res = await apiFetch(`/api/admin/operators/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Pengendali diluluskan.');
        fetchOperators();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectOperator = async (id: number) => {
    try {
      const res = await apiFetch(`/api/admin/operators/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Pengendali ditolak.');
        fetchOperators();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==================== STATIONS & ROUTES MANAGEMENT ====================
  const fetchAdminStations = async () => {
    try {
      const res = await apiFetch('/api/stations');
      if (res.ok) setAdminStations(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRouteConnections = async () => {
    try {
      const res = await apiFetch('/api/routes/admin', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setRouteConnections(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStationName.trim() || !newStationState.trim()) return;
    try {
      const res = await apiFetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newStationName, state: newStationState })
      });
      if (res.ok) {
        showToast('Stesen ditambah.');
        setNewStationName('');
        setNewStationState('');
        fetchAdminStations();
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal menambah stesen.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditStation = async (id: number) => {
    try {
      const res = await apiFetch(`/api/stations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editStationName, state: editStationState })
      });
      if (res.ok) {
        showToast('Stesen dikemas kini.');
        setEditingStationId(null);
        fetchAdminStations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteStation = async (id: number) => {
    if (!window.confirm('Padamkan stesen ini?')) return;
    try {
      const res = await apiFetch(`/api/stations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Stesen dipadam.');
        fetchAdminStations();
        fetchRouteConnections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteOrigin || !newRouteDest) return;
    try {
      const res = await apiFetch('/api/routes/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ origin_station_id: parseInt(newRouteOrigin), destination_station_id: parseInt(newRouteDest) })
      });
      if (res.ok) {
        showToast('Laluan ditambah.');
        setNewRouteOrigin('');
        setNewRouteDest('');
        fetchRouteConnections();
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal menambah laluan.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditRoute = async (id: number) => {
    try {
      const res = await apiFetch(`/api/routes/admin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ origin_station_id: parseInt(editRouteOrigin), destination_station_id: parseInt(editRouteDest) })
      });
      if (res.ok) {
        showToast('Laluan dikemas kini.');
        setEditingRouteId(null);
        fetchRouteConnections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRoute = async (id: number) => {
    if (!window.confirm('Padamkan laluan ini?')) return;
    try {
      const res = await apiFetch(`/api/routes/admin/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Laluan dipadam.');
        fetchRouteConnections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==================== ML MODEL CONTROLS ====================
  const fetchModelMetrics = async () => {
    try {
      const res = await apiFetch('/api/admin/model', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setModelMetrics(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const triggerRetrain = async () => {
    setTrainingModel(true);
    setTrainLogs(['Memulakan latihan...']);
    setTrainProgress(0);

    try {
      const res = await apiFetch('/api/admin/model/retrain', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      const d = await res.json();

      if (!res.ok) {
        alert(d.error || 'Gagal memulakan latihan.');
        setTrainingModel(false);
        return;
      }

      // Poll for real progress from the Python process
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await apiFetch('/api/admin/model/status', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const status = await statusRes.json();

          // Update progress bar and logs from real data
          setTrainProgress(status.progress);
          if (status.logs && status.logs.length > 0) {
            setTrainLogs(status.logs);
          }

          if (status.isTraining) return;

          clearInterval(pollInterval);

          if (status.error) {
            setTrainLogs(prev => [...prev, `Latihan gagal: ${status.error}`]);
            setTrainProgress(0);
            setTrainingModel(false);
            alert(`Latihan gagal: ${status.error}`);
            return;
          }

          // Training completed successfully
          const metricsRes = await apiFetch('/api/admin/model', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const metrics = await metricsRes.json();
          setModelMetrics(metrics);

          setTrainLogs(prev => [
            ...prev,
            `Latihan selesai${metrics.processingTime ? ` (${metrics.processingTime}s berlalu)` : ''}`,
            'Model sedia',
          ]);
          setTrainProgress(100);
          showToast('Latihan selesai.');
          setTrainingModel(false);
        } catch (e) {
          // Ignore polling errors
        }
      }, 2000);
    } catch (e) {
      console.error(e);
      setTrainingModel(false);
    }
  };

  const handleResetModel = async () => {
    if (!window.confirm('Set semula model? Ini akan memadam semua data latihan.')) return;
    try {
      const res = await apiFetch('/api/admin/model/reset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) {
        showToast('Model diset semula.');
        setModelMetrics(d.metrics);
        setTrainLogs([]);
        setTrainProgress(0);
      } else {
        alert(d.error || 'Gagal menyet semula model.');
      }
    } catch (e) {
      console.error(e);
      alert('Gagal menyet semula model.');
    }
  };

  const handleDownloadModel = async () => {
    try {
      const res = await apiFetch('/api/admin/model/download', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Gagal memuat turun laporan.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ets_training_report.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'Gagal memuat turun laporan.');
    }
  };

  const handleDownloadPkl = async () => {
    try {
      const res = await apiFetch('/api/admin/model/download-pkl', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Gagal memuat turun model.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ets_ridership_model.pkl';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'Gagal memuat turun model.');
    }
  };

  // ==================== TETAPAN PROFIL ====================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (profileNewPw !== profileConfirmPw) {
      setPasswordMsg({ ok: false, text: 'Kata laluan baru tidak sepadan.' });
      return;
    }
    if (profileNewPw.length < 8) {
      setPasswordMsg({ ok: false, text: 'Kata laluan mesti sekurang-kurangnya 8 aksara.' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await apiFetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: profileOldPw, newPassword: profileNewPw })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ ok: true, text: data.message || 'Kata laluan berjaya ditukar.' });
        setProfileOldPw(''); setProfileNewPw(''); setProfileConfirmPw('');
      } else {
        setPasswordMsg({ ok: false, text: data.error || 'Gagal menukar kata laluan.' });
      }
    } catch { setPasswordMsg({ ok: false, text: 'Ralat rangkaian.' }); }
    finally { setSavingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await apiFetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword })
      });
      if (res.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal memadam akaun.');
      }
    } catch { alert('Ralat rangkaian.'); }
    finally { setDeletingAccount(false); setShowDeleteConfirm(false); }
  };

  // ==================== MUAT NAIK SET DATA ====================
  const fetchDatasetOverview = async () => {
    try {
      const res = await apiFetch('/api/admin/dataset', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setDatasetOverview(await res.json());
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setCsvFile(e.target.files[0]);
  };

  const handleUploadCsv = async () => {
    if (!csvFile) return;
    setUploadingCsv(true);
    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      const res = await apiFetch('/api/admin/dataset/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        showToast('Set data berjaya dimuat naik.');
        setCsvFile(null);
        fetchDatasetOverview();
      } else {
        const data = await res.json();
        alert(data.error || 'Muat naik gagal.');
      }
    } catch { alert('Muat naik gagal.'); }
    finally { setUploadingCsv(false); }
  };

  const fetchDatasetPreview = async () => {
    try {
      const res = await apiFetch('/api/admin/dataset/preview', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setDatasetPreview(await res.json());
    } catch {}
  };

  const handleClearDataset = async () => {
    if (!confirm('Anda pasti mahu memadamkan set data ini? Tindakan ini tidak boleh dibatalkan.')) return;
    setClearingDataset(true);
    try {
      const res = await apiFetch('/api/admin/dataset/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Set data dipadamkan.');
        setDatasetOverview({ exists: false, fileName: null, totalRows: 0 });
        setDatasetPreview(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal memadam set data.');
      }
    } catch { alert('Gagal memadam set data.'); }
    finally { setClearingDataset(false); }
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
              <p className="text-[10px] font-extrabold text-[#64748b] tracking-wider leading-none">{'KONSOL PENTADBIR'}</p>
              <h2 className="text-sm font-bold text-[#1e293b] font-display mt-0.5">{'Selamat kembali, '}{user.username}</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" id="admin-tabs">
            {(['users', 'telemetry', 'operators', 'stations', 'holidays', 'dataset', 'model', 'profile'] as const).map((tab) => (
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
                {tab === 'users' ? 'Pengurusan Pengguna' : 
                 tab === 'telemetry' ? 'Telemetri Sistem' : 
                 tab === 'operators' ? 'Kelulusan Pengendali' :
                 tab === 'stations' ? 'Stesen & Laluan' :
                 tab === 'holidays' ? 'Kalendar Cuti' : 
                 tab === 'model' ? 'Model ML' :
                 tab === 'profile' ? 'Tetapan Profil' :
                 tab === 'dataset' ? 'Muat Naik Set Data' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto animate-fade-in" id="admin-viewport">
        {/* ==================== SUBTAB: USER CRUD ==================== */}
        {activeSubTab === 'users' && (
          <div className="space-y-6" id="admin-users-row">
            {/* Provision Modal */}
            {showProvisionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">{'Daftar Akaun Baru'}</h3>
                  <p className="text-xs text-slate-500 mb-4">{'Buat akaun pengguna baru dalam sistem.'}</p>
                  <form onSubmit={handleCreateUser} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Nama Penuh'}</label>
                      <input type="text" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"                     placeholder={''} value={newFullname} onChange={(e) => setNewFullname(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Nama Pengguna'}</label>
                      <input type="text" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"                     placeholder={''} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Kata Laluan'}</label>
                      <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"                     placeholder={''} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Peranan'}</label>
                      <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                        {'Pentadbir'}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" disabled={savingUser} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50">
                        {savingUser ? 'Mendaftar...' : 'Buat Akaun'}
                      </button>
                      <button type="button" onClick={() => setShowProvisionModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer">
                          {'Batal'}
                        </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Admin Accounts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="user-section-admin">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-extrabold text-[#111827] text-base">{'Pentadbir'}</h3>
                <button onClick={() => { setNewRole('admin'); setShowProvisionModal(true); }} className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> {'Tambah Pentadbir'}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3 w-[45%]">{'Profil Pengguna'}</th>
                      <th className="p-3 w-[25%]">{'ID Pengguna'}</th>
                      <th className="p-3 w-[20%]">{'Status Akaun'}</th>
                      <th className="p-3 text-right w-[10%]">{'Panel Tindakan'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {usersList.filter(u => u.role === 'admin').map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-800 font-bold">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">{usr.full_name[0]}</span>
                            <span className="truncate max-w-[180px]">{usr.full_name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{usr.username}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            {usr.status === 'active' ? 'Aktif' : usr.status === 'suspended' ? 'Digantung' : usr.status === 'pending' ? 'Menunggu' : usr.status === 'approved' ? 'Diluluskan' : usr.status === 'rejected' ? 'Ditolak' : usr.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button id={`btn-delete-user-${usr.id}`} onClick={() => deleteUser(usr.id)} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition" title={'Padam'}><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operator Accounts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="user-section-operator">
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-4">{'Pengendali'}</h3>
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3 w-[45%]">{'Profil Pengguna'}</th>
                      <th className="p-3 w-[25%]">{'ID Pengguna'}</th>
                      <th className="p-3 w-[20%]">{'Status Akaun'}</th>
                      <th className="p-3 text-right w-[10%]">{'Panel Tindakan'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {usersList.filter(u => u.role === 'operator').map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-800 font-bold">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">{usr.full_name[0]}</span>
                            <span className="truncate max-w-[180px]">{usr.full_name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{usr.username}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 font-bold ${usr.status === 'active' || usr.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${usr.status === 'active' || usr.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {usr.status === 'active' || usr.status === 'approved' ? 'Aktif' : usr.status === 'pending' ? 'Menunggu' : usr.status === 'rejected' ? 'Ditolak' : usr.status === 'suspended' ? 'Digantung' : usr.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {editingUserId === usr.id ? (
                              <>
                                <select className="py-1 px-2 border border-slate-200 rounded text-xs" value={editRole} onChange={(e) => setEditRole(e.target.value as any)}>
                                  <option value="passenger">{'Penumpang'}</option>
                                  <option value="operator">{'Pengendali ETS'}</option>
                                  <option value="admin">{'Pentadbir'}</option>
                                </select>
                                <select className="py-1 px-2 border border-slate-200 rounded text-xs" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                                  <option value="active">{'Aktif'}</option>
                                  <option value="suspended">{'Digantung'}</option>
                                </select>
                                <button id={`btn-save-edit-user-${usr.id}`} onClick={() => saveEditUser(usr.id)} className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition text-[10px] font-bold">{'Simpan Perubahan'}</button>
                              </>
                            ) : (
                              <>
                                <button id={`btn-edit-user-${usr.id}`} onClick={() => { setEditingUserId(usr.id); setEditRole(usr.role); setEditStatus(usr.status); }} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition">{'Sunting'}</button>
                                {usr.status !== 'active' && usr.status !== 'approved' && (
                                  <button id={`btn-suspend-toggle-user-${usr.id}`} onClick={() => toggleSuspension(usr.id, usr.status)} className="p-1 hover:bg-slate-100 rounded transition font-bold text-[10px] text-emerald-600">{'Pulihkan'}</button>
                                )}
                                <button id={`btn-delete-user-${usr.id}`} onClick={() => deleteUser(usr.id)} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition" title={'Padam'}><Trash2 className="h-3.5 w-3.5" /></button>
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

            {/* Passenger Accounts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="user-section-passenger">
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-4">{'Penumpang'}</h3>
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3 w-[45%]">{'Profil Pengguna'}</th>
                      <th className="p-3 w-[25%]">{'ID Pengguna'}</th>
                      <th className="p-3 w-[20%]">{'Status Akaun'}</th>
                      <th className="p-3 text-right w-[10%]">{'Panel Tindakan'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {usersList.filter(u => u.role === 'passenger').map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-800 font-bold">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">{usr.full_name[0]}</span>
                            <span className="truncate max-w-[180px]">{usr.full_name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{usr.username}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 font-bold ${usr.status === 'active' ? 'text-emerald-600' : 'text-rose-500'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${usr.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {usr.status === 'active' ? 'Aktif' : 'Digantung'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {editingUserId === usr.id ? (
                              <>
                                <select className="py-1 px-2 border border-slate-200 rounded text-xs" value={editRole} onChange={(e) => setEditRole(e.target.value as any)}>
                                  <option value="passenger">{'Penumpang'}</option>
                                  <option value="operator">{'Pengendali ETS'}</option>
                                  <option value="admin">{'Pentadbir'}</option>
                                </select>
                                <select className="py-1 px-2 border border-slate-200 rounded text-xs" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                                  <option value="active">{'Aktif'}</option>
                                  <option value="suspended">{'Digantung'}</option>
                                </select>
                                <button id={`btn-save-edit-user-${usr.id}`} onClick={() => saveEditUser(usr.id)} className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition text-[10px] font-bold">{'Simpan Perubahan'}</button>
                              </>
                            ) : (
                              <>
                                <button id={`btn-edit-user-${usr.id}`} onClick={() => { setEditingUserId(usr.id); setEditRole(usr.role); setEditStatus(usr.status); }} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition">{'Sunting'}</button>
                                {usr.status !== 'active' && usr.status !== 'approved' && (
                                  <button id={`btn-suspend-toggle-user-${usr.id}`} onClick={() => toggleSuspension(usr.id, usr.status)} className="p-1 hover:bg-slate-100 rounded transition font-bold text-[10px] text-emerald-600">{'Pulihkan'}</button>
                                )}
                                <button id={`btn-delete-user-${usr.id}`} onClick={() => deleteUser(usr.id)} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition" title={'Padam'}><Trash2 className="h-3.5 w-3.5" /></button>
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{'Jumlah Pengguna mengikut Peranan'}</span>
                  <div className="mt-2 space-y-1">
                    {telemetry?.userCounts ? (
                      Object.entries(telemetry.userCounts).map(([role, count]) => (
                        <p key={role} className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-slate-900 font-mono">{count}</span>
                          <span className="text-xs font-bold text-slate-400">{role === 'passenger' ? 'Pengguna' : role === 'operator' ? 'Pengendali' : role === 'admin' ? 'Pentadbir' : role}</span>
                        </p>
                      ))
                    ) : (
                      <>
                        <p className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-slate-900 font-mono">0</span>
                          <span className="text-xs font-bold text-slate-400">{'Pengguna'}</span>
                        </p>
                        <p className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-slate-900 font-mono">0</span>
                          <span className="text-xs font-bold text-slate-400">{'Pengendali'}</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{'Jumlah Stesen'}</span>
                  <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                    {telemetry?.stationsByState?.reduce((s, r) => s + r.count, 0) || 0}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{'Jumlah Stesen'}</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <MapPin className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'Integriti Sistem'}</span>
                  <h4 className="text-3xl font-extrabold text-white mt-1.5 font-mono">OK</h4>
                  <p className="text-xs text-indigo-400 mt-1 font-bold">{'Integriti Sistem'}</p>
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
                  <Cpu className="h-4 w-4 text-indigo-600" /> {'Traffic Pertanyaan Harian (14 Hari)'}
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
                  <div className="text-center py-24 text-slate-400 text-xs">{'Memuatkan...'}</div>
                )}
              </div>

              {/* Busiest Queries */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-h-96 overflow-y-auto" id="top-predicted-queries">
                <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest mb-3">{'Laluan Paling Dicari'}</h4>
                
                {telemetry && telemetry.topRoutes.length > 0 ? (
                  <div className="space-y-3" id="top-routes-list">
                    {telemetry.topRoutes.map((route, i) => {
                      const badgeColor =
                        route.demandLevel === 'Low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        route.demandLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        route.demandLevel === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-red-50 text-red-700 border-red-200';
                      return (
                        <div key={`${route.origin}-${route.destination}`} className="flex items-center justify-between p-3 border border-slate-50 hover:border-slate-100 rounded-xl hover:bg-slate-50/30 transition">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{route.origin} ➔ {route.destination}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-semibold">{'Kedudukan'} #{i + 1}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                                {route.demandLevel}
                              </span>
                            </div>
                          </div>
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold px-2.5 py-0.5 rounded-lg">
                            {'Jumlah: '}{route.volume}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">{'Tiada permintaan ramalan direkodkan lagi.'}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: HOLIDAYS ==================== */}
        {activeSubTab === 'holidays' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="holidays-grid">
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="holiday-creation-wrapper">
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">{'Tambah Hari Kalendar Khas'}</h3>
              <p className="text-[11px] text-slate-400 mb-4">{'Perkenalkan acara kebangsaan Malaysia terus ke SQLite.'}</p>

              <form onSubmit={handleCreateHoliday} className="space-y-4" id="holiday-form">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="h-name">{'Nama Tema Cuti'}</label>
                  <input
                    id="h-name"
                    type="text"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    placeholder={''}
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="h-date">{'Tarikh Cuti Sebenar'}</label>
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
                    {'Masukkan Cuti Baru'}
                  </button>
                </div>
              </form>

              <div className="mt-8 border-t border-slate-100 pt-6" id="static-holiday-note">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{'Selaras Cuti Kebangsaan'}</span>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  {'Import cuti umum kebangsaan Malaysia tahun ini daripada Nager.Date. Entri sedia ada tidak akan ditimpa, jadi suntingan anda dan cuti negeri kekal selamat.'}
                </p>
                <button
                  id="btn-sync-holidays"
                  type="button"
                  onClick={handleSyncHolidays}
                  disabled={syncingHolidays}
                  className="w-full flex items-center justify-center gap-2 border border-[#c7d2fe] bg-[#e0e7ff]/40 hover:bg-[#e0e7ff] text-[#4f46e5] rounded-xl py-2 text-xs font-bold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {syncingHolidays ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
                  {syncingHolidays ? 'Menyelaras...' : `Selaras Cuti ${new Date().getFullYear()}`}
                </button>
              </div>
            </div>

            {/* List Holidays */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="holidays-grid-card">
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-4">{'Kalendar Cuti Rasmi'}</h3>

              <div className="max-h-[500px] overflow-y-auto space-y-6" id="holiday-items">
                {groupedHolidays.map(({ month, items }) => (
                  <div key={month}>
                    <h4 className="font-display font-bold text-indigo-700 text-xs uppercase tracking-wider mb-2 sticky top-0 bg-white py-1 z-10">{MONTHS[month]}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((h) => (
                        <div key={h.id} className="p-4 border border-slate-150 rounded-xl bg-slate-50/50 flex items-center justify-between">
                          <div>
                            {editingHolidayId === h.id ? (
                              <div className="space-y-1.5" id={`edit-holiday-inputs-${h.id}`}>
                                <input type="text" className="py-1 px-2 border border-slate-200 rounded text-xs focus:outline-none w-full" value={editHolidayName} onChange={(e) => setEditHolidayName(e.target.value)} />
                                <input type="date" className="py-1 px-2 border border-slate-200 rounded text-xs focus:outline-none w-full" value={editHolidayDate} onChange={(e) => setEditHolidayDate(e.target.value)} />
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
                                <button id={`btn-save-inline-holiday-${h.id}`} onClick={() => saveEditHoliday(h.id)} className="p-1 px-1.5 bg-emerald-100 hover:bg-emerald-200 rounded text-emerald-800 text-[10px] font-bold">{'Simpan'}</button>
                                <button id={`btn-cancel-inline-holiday-${h.id}`} onClick={() => setEditingHolidayId(null)} className="p-1 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 text-[10px] font-bold">✖</button>
                              </>
                            ) : (
                              <>
                                <button id={`btn-edit-holiday-${h.id}`} onClick={() => { setEditingHolidayId(h.id); setEditHolidayName(h.name); setEditHolidayDate(h.date); }} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded text-[10px] transition font-bold">{'Sunting'}</button>
                                <button id={`btn-delete-holiday-${h.id}`} onClick={() => deleteHoliday(h.id)} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-red-500 rounded text-[10px] transition font-bold">{'Padam'}</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: OPERATOR APPROVAL ==================== */}
        {activeSubTab === 'operators' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="operator-approval-tab">
            <div className="mb-6">
              <h3 className="font-display font-extrabold text-slate-800 text-lg">{'Pengurusan Kelulusan Pengendali'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{'Semak dan lulus/tolak pendaftaran pengendali.'}</p>
            </div>

            {loadingOperators ? (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-semibold">{'Memuatkan...'}</p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h4 className="font-display font-bold text-sm text-amber-700 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {'Pengendali Menunggu'}
                  </h4>
                  {operatorList.filter(o => o.status === 'pending').length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 bg-slate-50 rounded-xl text-center">{'Tiada pengendali yang menunggu.'}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-amber-50 text-amber-700 font-bold border-b border-amber-100">
                            <th className="p-3">{'Nama Penuh'}</th>
                            <th className="p-3">{'Nama Pengguna'}</th>
                            <th className="p-3">{'Tarikh Daftar'}</th>
                            <th className="p-3 text-right">{'Panel Tindakan'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {operatorList.filter(o => o.status === 'pending').map(op => (
                            <tr key={op.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-800">{op.full_name}</td>
                              <td className="p-3 font-mono text-slate-500">{op.username}</td>
                              <td className="p-3 text-slate-400">{new Date(op.created_at).toLocaleDateString()}</td>
                              <td className="p-3 text-right">
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => handleApproveOperator(op.id)}
                                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  >
                                    {'Lulus'}
                                  </button>
                                  <button
                                    onClick={() => handleRejectOperator(op.id)}
                                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  >
                                    {'Tolak'}
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

                <div className="mb-8">
                  <h4 className="font-display font-bold text-sm text-emerald-700 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> {'Pengendali Diluluskan'}
                  </h4>
                  {operatorList.filter(o => o.status === 'approved' || o.status === 'active').length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 bg-slate-50 rounded-xl text-center">{'Tiada data tersedia.'}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-emerald-50 text-emerald-700 font-bold border-b border-emerald-100">
                            <th className="p-3">{'Nama Penuh'}</th>
                             <th className="p-3">{'Nama Pengguna'}</th>
                             <th className="p-3">{'Status Akaun'}</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {operatorList.filter(o => o.status === 'approved' || o.status === 'active').map(op => (
                            <tr key={op.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-800">{op.full_name}</td>
                              <td className="p-3 font-mono text-slate-500">{op.username}</td>
                              <td className="p-3">
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                  {'Aktif'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-display font-bold text-sm text-red-700 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {'Pengendali Ditolak'}
                  </h4>
                  {operatorList.filter(o => o.status === 'rejected').length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 bg-slate-50 rounded-xl text-center">{'Tiada data tersedia.'}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-red-50 text-red-700 font-bold border-b border-red-100">
                            <th className="p-3">{'Nama Penuh'}</th>
                             <th className="p-3">{'Nama Pengguna'}</th>
                             <th className="p-3">{'Status Akaun'}</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {operatorList.filter(o => o.status === 'rejected').map(op => (
                            <tr key={op.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-800">{op.full_name}</td>
                              <td className="p-3 font-mono text-slate-500">{op.username}</td>
                              <td className="p-3">
                                <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                  {'Digantung'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================== SUBTAB: STATIONS & ROUTES ==================== */}
        {activeSubTab === 'stations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="stations-routes-tab">
            {/* Station Management */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="station-management-card">
              <h3 className="font-display font-extrabold text-slate-800 text-lg mb-4">{'Pengurusan Stesen'}</h3>

              <form onSubmit={handleAddStation} className="flex gap-2 mb-6">
                <input
                  type="text"
                  required
                  placeholder={'Nama Stesen'}
                  className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                />
                <input
                  type="text"
                  required
                  placeholder={'Negeri'}
                  className="w-28 py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  value={newStationState}
                  onChange={(e) => setNewStationState(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {'Tambah Stesen'}
                </button>
              </form>

              <div className="overflow-x-auto rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3">{'Nama Stesen'}</th>
                      <th className="p-3">{'Negeri'}</th>
                      <th className="p-3 text-right">{'Panel Tindakan'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminStations.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">
                          {editingStationId === st.id ? (
                            <input
                              type="text"
                              className="py-1 px-2 border border-slate-200 rounded text-xs w-full"
                              value={editStationName}
                              onChange={(e) => setEditStationName(e.target.value)}
                            />
                          ) : st.name}
                        </td>
                        <td className="p-3 text-slate-500">
                          {editingStationId === st.id ? (
                            <input
                              type="text"
                              className="py-1 px-2 border border-slate-200 rounded text-xs w-full"
                              value={editStationState}
                              onChange={(e) => setEditStationState(e.target.value)}
                            />
                          ) : st.state}
                        </td>
                        <td className="p-3 text-right">
                          {editingStationId === st.id ? (
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => handleEditStation(st.id)}
                                className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Simpan'}
                              </button>
                              <button
                                onClick={() => setEditingStationId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Batal'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => {
                                  setEditingStationId(st.id);
                                  setEditStationName(st.name);
                                  setEditStationState(st.state || '');
                                }}
                                className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Sunting Stesen'}
                              </button>
                              <button
                                onClick={() => handleDeleteStation(st.id)}
                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Padam'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Route Connection Management */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="route-management-card">
              <h3 className="font-display font-extrabold text-slate-800 text-lg mb-4">{'Pengurusan Laluan'}</h3>

              <form onSubmit={handleAddRoute} className="flex gap-2 mb-6">
                <select
                  required
                  className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  value={newRouteOrigin}
                  onChange={(e) => { setNewRouteOrigin(e.target.value); setNewRouteDest(''); }}
                >
                  <option value="">{'Pilih stesen asal...'}</option>
                  {adminStations.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select
                  required
                  className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  value={newRouteDest}
                  onChange={(e) => setNewRouteDest(e.target.value)}
                >
                  <option value="">{'Pilih stesen destinasi...'}</option>
                  {filteredDestStations.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {'Tambah Laluan'}
                </button>
              </form>

              <div className="overflow-x-auto rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3">{'Stesen Asal'}</th>
                      <th className="p-3">{'Stesen Destinasi'}</th>
                      <th className="p-3 text-right">{'Panel Tindakan'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routeConnections.map((rc) => (
                      <tr key={rc.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">
                          {editingRouteId === rc.id ? (
                            <select
                              className="py-1 px-2 border border-slate-200 rounded text-xs w-full"
                              value={editRouteOrigin}
                              onChange={(e) => setEditRouteOrigin(e.target.value)}
                            >
                              {adminStations.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          ) : rc.origin_name}
                        </td>
                        <td className="p-3 text-slate-500">
                          {editingRouteId === rc.id ? (
                            <select
                              className="py-1 px-2 border border-slate-200 rounded text-xs w-full"
                              value={editRouteDest}
                              onChange={(e) => setEditRouteDest(e.target.value)}
                            >
                              {adminStations.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          ) : rc.destination_name}
                        </td>
                        <td className="p-3 text-right">
                          {editingRouteId === rc.id ? (
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => handleEditRoute(rc.id)}
                                className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Simpan'}
                              </button>
                              <button
                                onClick={() => setEditingRouteId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Batal'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => {
                                  setEditingRouteId(rc.id);
                                  setEditRouteOrigin(String(rc.origin_station_id));
                                  setEditRouteDest(String(rc.destination_station_id));
                                }}
                                className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Sunting'}
                              </button>
                              <button
                                onClick={() => handleDeleteRoute(rc.id)}
                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Delete'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: ML MODEL CONTROLS ==================== */}
        {activeSubTab === 'model' && (
          <div className="max-w-3xl mx-auto space-y-6" id="model-management-panel">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="model-info-intro">
              <h3 className="font-display font-extrabold text-slate-800 text-lg">{'Model ML'}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {'Melatih model Random Forest pada data jadual Ridership menggunakan pembahagian 80:20. Latih semula selepas menambah data baru untuk meningkatkan ketepatan.'}
              </p>
            </div>

            {modelMetrics ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="model-grid-metrics">
                <div className="bg-white p-5 border border-slate-200 rounded-2xl text-center shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'Min Ralat Mutlak (MAE)'}</p>
                  <p className="text-3xl font-extrabold text-[#4F46E5] mt-3 font-mono">{modelMetrics.mae} {'penumpang'}</p>
                  <p className="text-[10px] text-slate-450 text-slate-500 mt-1 font-semibold">{'Sisihan mutlak purata dari sebenar'}</p>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-2xl text-center shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'Punca Min Ralat Kuasa Dua'}</p>
                  <p className="text-3xl font-extrabold text-[#D97706] mt-3 font-mono">{modelMetrics.rmse} {'penumpang'}</p>
                  <p className="text-[10px] text-slate-450 text-slate-500 mt-1 font-semibold">{'Menghukum ralat ramalan besar dengan pemberat'}</p>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-2xl text-center shadow-sm font-sans">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'Ketepatan R-Kuasa Dua (R²)'}</p>
                  <p className="text-3xl font-extrabold text-[#10B981] mt-3 font-mono">{(modelMetrics.r2 * 100).toFixed(0)}% {'padanan'}</p>
                  <p className="text-[10px] text-slate-450 text-slate-500 mt-1 font-semibold">{'Peratusan varians berjaya diramal'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl">{'Memuatkan metrik...'}</div>
            )}

            {modelMetrics && !trainingModel && modelMetrics.totalRecords > 0 && (
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPkl}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <DownloadCloud className="h-4 w-4" />
                  {'Muat Turun Model (.pkl)'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadModel}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <DownloadCloud className="h-4 w-4" />
                  {'Muat Turun Laporan (.txt)'}
                </button>
              </div>
            )}

            {/* Train triggers */}
            <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-sm text-center relative overflow-hidden" id="training-console">
              <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-5">
                <Cpu className="w-64 h-64" />
              </div>

              <h4 className="font-display font-extrabold text-base mb-3 text-indigo-400">{'Jurulatih Random Forest'}</h4>
              <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed mb-6">
                {'Mengeksport data Ridership dari pangkalan data, melatih model Random Forest pada pembahagian 80:20, dan menyimpan model sebagai fail Pickle (.pkl).'}
              </p>

              {!datasetExists && !trainingModel && (
                <div className="mb-4 bg-amber-900/30 border border-amber-700/50 text-amber-300 px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {'Muat naik set data CSV terlebih dahulu sebelum melatih semula model.'}
                </div>
              )}

              <div className="flex flex-col items-center justify-center gap-4">
                <button
                  type="button"
                  id="btn-trigger-model-retrain"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerRetrain();
                  }}
                  disabled={trainingModel || !datasetExists}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-900/30 cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-4 w-4 text-white fill-white" />
                  {'Latih Semula Model'}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleResetModel();
                  }}
                  disabled={trainingModel}
                  className="inline-flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 px-6 py-2 rounded-xl text-[10px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50 mt-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {'Padam Saluran & Set Semula Model'}
                </button>
              </div>

              {(trainingModel || trainLogs.length > 0) && (
                <div className="mt-6 w-full text-left bg-slate-950 rounded-xl border border-slate-700 p-4 shadow-inner max-w-lg mx-auto">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-slate-400 font-mono tracking-widest font-bold">
                      {trainingModel ? 'SALURAN BERJALAN' : 'LOG SALURAN TERAKHIR'}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-bold font-mono">{trainProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700 ease-out" style={{ width: `${trainProgress}%` }}></div>
                  </div>
                  <div className="h-36 overflow-y-auto font-mono text-[10px] sm:text-[11px] text-emerald-400 leading-relaxed space-y-1 pr-2">
                    {trainLogs.map((log, i) => (
                      <div key={i} className="opacity-90">{log}</div>
                    ))}
                    {trainProgress < 100 && trainingModel && (
                      <div className="animate-pulse font-extrabold text-emerald-300">_</div>
                    )}
                  </div>
                </div>
              )}

              {modelMetrics && !trainingModel && (
                <div className="mt-6 space-y-1 text-[11px] text-slate-400 font-semibold" id="last-stamp">
                  <p>{'Pelaksanaan Saluran Terakhir'}: {new Date(modelMetrics.trainedAt).toLocaleString()} | {'Baris Dinilai'}: {modelMetrics.totalRecords}</p>
                  <p className="text-indigo-300 bg-indigo-900/40 inline-block px-3 py-1 rounded-full">{modelMetrics.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: TETAPAN PROFIL ==================== */}
        {activeSubTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6" id="admin-profile-tab">
            {/* Maklumat Akaun */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-indigo-500" />
                <h3 className="font-display text-lg font-bold text-slate-800">{'Maklumat Akaun'}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{'Nama Penuh'}</p>
                  <p className="font-semibold text-slate-800 mt-1">{user.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{'Nama Pengguna'}</p>
                  <p className="font-semibold text-slate-800 mt-1">{user.username}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{'Peranan'}</p>
                  <span className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 capitalize">{user.role === 'admin' ? 'Pentadbir' : user.role === 'operator' ? 'Pengendali' : user.role === 'passenger' ? 'Penumpang' : user.role}</span>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{'Status'}</p>
                  <span className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{user.status === 'active' ? 'Aktif' : user.status === 'suspended' ? 'Digantung' : user.status === 'pending' ? 'Menunggu' : user.status === 'approved' ? 'Diluluskan' : user.status === 'rejected' ? 'Ditolak' : user.status}</span>
                </div>
              </div>
            </div>


            {/* Tukar Kata Laluan */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-indigo-500" />
                <h3 className="font-display text-lg font-bold text-slate-800">{'Tukar Kata Laluan'}</h3>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Kata Laluan Semasa'}</label>
                  <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400" value={profileOldPw} onChange={(e) => setProfileOldPw(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Kata Laluan Baru'}</label>
                  <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400" value={profileNewPw} onChange={(e) => setProfileNewPw(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Sahkan Kata Laluan Baru'}</label>
                  <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400" value={profileConfirmPw} onChange={(e) => setProfileConfirmPw(e.target.value)} />
                </div>
                {passwordMsg && (
                  <p className={`text-xs font-semibold ${passwordMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{passwordMsg.text}</p>
                )}
                <button type="submit" disabled={savingPassword} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50">
                  {savingPassword ? 'Mengemas kini...' : 'Kemas Kini Kata Laluan'}
                </button>
              </form>
            </div>

            {/* Zon Bahaya */}
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-display text-lg font-bold text-red-700">{'Zon Bahaya'}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">{'Setelah anda memadamkan akaun, tiada jalan kembali. Sila pastikan.'}</p>
              <button onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer">
                {'Padam Akaun Saya'}
              </button>
            </div>

            {/* Modal Pengesahan Padam Akaun */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <h3 className="font-display font-extrabold text-red-700 text-base mb-1">{'Sahkan Pemadaman Akaun'}</h3>
                  <p className="text-xs text-slate-500 mb-4">{'Masukkan kata laluan anda untuk mengesahkan pemadaman akaun. Tindakan ini tidak boleh dibatalkan.'}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Kata Laluan Anda'}</label>
                      <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-400" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition cursor-pointer">{'Batal'}</button>
                      <button onClick={handleDeleteAccount} disabled={deletingAccount || !deletePassword} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50">
                        {deletingAccount ? 'Memadam...' : 'Sahkan Padam'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== SUBTAB: MUAT NAIK SET DATA ==================== */}
        {activeSubTab === 'dataset' && (
          <div className="max-w-5xl mx-auto space-y-6" id="admin-dataset-tab">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <UploadCloud className="w-5 h-5 text-indigo-500" />
                <h3 className="font-display text-lg font-bold text-slate-800">{'Muat Naik Set Data CSV'}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">{'Muat naik fail CSV dengan data ridership sejarah. Fail akan disimpan ke pelayan untuk latihan. Tiada perubahan pangkalan data dilakukan.'}</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input type="file" accept=".csv" onChange={handleFileChange} className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                  <button onClick={handleUploadCsv} disabled={uploadingCsv || !csvFile} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                    {uploadingCsv ? 'Memuat naik...' : 'Muat Naik'}
                  </button>
                </div>
                {csvFile && (
                  <p className="text-[11px] text-slate-400 font-medium">{'Dipilih'}: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</p>
                )}
              </div>
            </div>

            {/* Current Dataset Info & Clear */}
            {datasetOverview && datasetOverview.exists && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-display text-lg font-bold text-slate-800">{'Set Data Semasa'}</h3>
                  </div>
                  <button onClick={handleClearDataset} disabled={clearingDataset} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                    {clearingDataset ? 'Memadam...' : 'Kosongkan Set Data'}
                  </button>
                </div>
                <div className="space-y-1 text-sm mb-4">
                  <p><span className="font-semibold text-slate-500">{'Fail'}:</span> <span className="font-mono text-slate-800">{datasetOverview.fileName}</span></p>
                  <p><span className="font-semibold text-slate-500">{'Jumlah Baris'}:</span> <span className="font-bold text-slate-800">{datasetOverview.totalRows.toLocaleString()}</span></p>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {datasetPreview && datasetPreview.rows.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-x-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-display text-lg font-bold text-slate-800">{'Pratonton Data (50 Baris Pertama)'}</h3>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="min-w-full text-xs font-mono">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-extrabold text-slate-500 border-b border-slate-200 whitespace-nowrap">#</th>
                        {datasetPreview.headers.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-extrabold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datasetPreview.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 even:bg-slate-50/50">
                          <td className="px-3 py-1.5 border-b border-slate-100 text-slate-400">{i + 1}</td>
                          {datasetPreview.headers.map((h) => (
                            <td key={h} className="px-3 py-1.5 border-b border-slate-100 text-slate-700 whitespace-nowrap">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
