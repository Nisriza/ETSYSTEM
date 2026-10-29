<<<<<<< HEAD
import React, { useState, useEffect, useMemo } from 'react';
import { User, Holiday, Station, RouteConnection, OperatorRecord } from '../types.ts';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users, MapPin, BarChart3, Calendar, Database, Cpu, Plus, Trash2, Edit, Save, 
  RotateCw, RefreshCw, CheckCircle2, ChevronRight, Sparkles, Server, 
  TrendingUp, BarChart, Lock, AlertCircle, AlertTriangle, Play, Loader2, DownloadCloud, Settings, UploadCloud, FileSpreadsheet
=======
import React, { useState, useEffect } from 'react';
import { User, Holiday } from '../types.ts';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users, BarChart3, Calendar, Database, Cpu, Plus, Trash2, Edit, Save, 
  RotateCw, RefreshCw, CheckCircle2, ChevronRight, Sparkles, Server, 
  TrendingUp, BarChart, FileSpreadsheet, Lock, AlertCircle, UploadCloud, Play, Loader2
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
} from 'lucide-react';

interface AdminViewProps {
  user: User;
  token: string;
}

<<<<<<< HEAD
type AdminSubTab = 'users' | 'telemetry' | 'holidays' | 'model' | 'operators' | 'stations' | 'profile' | 'dataset';
=======
type AdminSubTab = 'users' | 'telemetry' | 'holidays' | 'dataset' | 'model';
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413

export default function AdminView({ user, token }: AdminViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('users');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States: Users CRUD
  const [usersList, setUsersList] = useState<User[]>([]);
<<<<<<< HEAD
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [newFullname, setNewFullname] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'passenger' | 'operator' | 'admin'>('admin');
=======
  const [newFullname, setNewFullname] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'passenger' | 'operator' | 'admin'>('passenger');
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
  const [savingUser, setSavingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<'passenger' | 'operator' | 'admin'>('passenger');
  const [editStatus, setEditStatus] = useState<string>('active');

  // States: Telemetry
  const [telemetry, setTelemetry] = useState<{
<<<<<<< HEAD
    userCounts: Record<string, number>;
    stationsByState: { state: string; count: number }[];
    totalPredictions: number;
    topRoutes: { origin: string; destination: string; volume: number; demandLevel: string; avgRidership: number }[];
=======
    activeUsers: number;
    totalPredictions: number;
    topRoutes: { origin: string; destination: string; volume: number }[];
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
    dailyVolume: { date: string; volume: number }[];
  } | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // States: Holidays CRUD
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
<<<<<<< HEAD
=======
  const [syncingGoogle, setSyncingGoogle] = useState(false);
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null);
  const [editHolidayName, setEditHolidayName] = useState('');
  const [editHolidayDate, setEditHolidayDate] = useState('');

<<<<<<< HEAD
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
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413

  // States: ML Management
  const [modelMetrics, setModelMetrics] = useState<{
    mae: number;
    rmse: number;
    r2: number;
    trainedAt: string;
    totalRecords: number;
    notes: string;
<<<<<<< HEAD
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
=======
  } | null>(null);
  const [trainingModel, setTrainingModel] = useState(false);
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413

  useEffect(() => {
    fetchSubTabData();
  }, [activeSubTab]);

  const fetchSubTabData = () => {
    if (activeSubTab === 'users') fetchUsers();
    if (activeSubTab === 'telemetry') fetchTelemetry();
    if (activeSubTab === 'holidays') fetchHolidays();
<<<<<<< HEAD
    if (activeSubTab === 'model') {
      fetchModelMetrics();
      fetch('/api/admin/dataset', { headers: { 'Authorization': `Bearer ${token}` } })
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

=======
    if (activeSubTab === 'dataset') fetchDataset();
    if (activeSubTab === 'model') fetchModelMetrics();
  };

>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ full_name: newFullname, username: newUsername, password: newPassword, role: newRole })
      });
      if (res.ok) {
        showToast(`User ${newUsername} created successfully.`);
        setNewFullname(''); setNewUsername(''); setNewPassword(''); setNewRole('admin');
        setShowProvisionModal(false);
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || '');
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
        showToast(nextStatus === 'active' ? 'User reinstated.' : 'User suspended.');
=======
        showToast(nextStatus === 'active' ? 'User reinstated.' : 'User suspended and session terminated.');
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (userId: number) => {
<<<<<<< HEAD
    if (!window.confirm('Delete this user?')) return;
=======
    if (!window.confirm('Mark this user suspended/deleted in MySQL?')) return;
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
<<<<<<< HEAD
        showToast('User deleted.');
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete user.');
=======
        showToast('User state suspended.');
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Operation failed.');
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
        showToast('User updated.');
=======
        showToast('User modifications saved to database.');
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
      const res = await fetch('/api/holidays?all=true', { headers: { 'Authorization': `Bearer ${token}` } });
=======
      const res = await fetch('/api/holidays');
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
        showToast('');
=======
        showToast('Special public date registered.');
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
        setNewHolidayName('');
        setNewHolidayDate('');
        fetchHolidays();
      }
    } catch (e) {
      console.error(e);
    }
  };

<<<<<<< HEAD
  const deleteHoliday = async (id: number) => {
    if (!window.confirm('')) return;
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
    try {
      const res = await fetch(`/api/admin/holidays/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
<<<<<<< HEAD
        showToast('');
=======
        showToast('Holiday event purged.');
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
        showToast('');
=======
        showToast('Holiday revised.');
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
        setEditingHolidayId(null);
        fetchHolidays();
      }
    } catch (e) {
      console.error(e);
    }
  };

<<<<<<< HEAD
  // ==================== OPERATORS APPROVAL ====================
  const fetchOperators = async () => {
    setLoadingOperators(true);
    try {
      const res = await fetch('/api/admin/operators', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setOperatorList(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOperators(false);
    }
  };

  const handleApproveOperator = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/operators/${id}/approve`, {
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
<<<<<<< HEAD
        showToast('');
        fetchOperators();
=======
        showToast('Ridership tables formatted.');
        fetchDataset();
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
      }
    } catch (e) {
      console.error(e);
    }
  };

<<<<<<< HEAD
  const handleRejectOperator = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/operators/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('');
        fetchOperators();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==================== STATIONS & ROUTES MANAGEMENT ====================
  const fetchAdminStations = async () => {
    try {
      const res = await fetch('/api/stations');
      if (res.ok) setAdminStations(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRouteConnections = async () => {
    try {
      const res = await fetch('/api/routes/admin', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setRouteConnections(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStationName.trim() || !newStationState.trim()) return;
    try {
      const res = await fetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newStationName, state: newStationState })
      });
      if (res.ok) {
        showToast('');
        setNewStationName('');
        setNewStationState('');
        fetchAdminStations();
      } else {
        const d = await res.json();
        alert(d.error || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditStation = async (id: number) => {
    try {
      const res = await fetch(`/api/stations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editStationName, state: editStationState })
      });
      if (res.ok) {
        showToast('');
        setEditingStationId(null);
        fetchAdminStations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteStation = async (id: number) => {
    if (!window.confirm('')) return;
    try {
      const res = await fetch(`/api/stations/${id}`, {
=======
  const deleteDatasetRow = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/dataset/${id}`, {
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
<<<<<<< HEAD
        showToast('');
        fetchAdminStations();
        fetchRouteConnections();
=======
        showToast('Ridership log removed.');
        fetchDataset();
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
      }
    } catch (e) {
      console.error(e);
    }
  };

<<<<<<< HEAD
  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteOrigin || !newRouteDest) return;
    try {
      const res = await fetch('/api/routes/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ origin_station_id: parseInt(newRouteOrigin), destination_station_id: parseInt(newRouteDest) })
      });
      if (res.ok) {
        showToast('');
        setNewRouteOrigin('');
        setNewRouteDest('');
        fetchRouteConnections();
      } else {
        const d = await res.json();
        alert(d.error || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditRoute = async (id: number) => {
    try {
      const res = await fetch(`/api/routes/admin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ origin_station_id: parseInt(editRouteOrigin), destination_station_id: parseInt(editRouteDest) })
      });
      if (res.ok) {
        showToast('');
        setEditingRouteId(null);
        fetchRouteConnections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRoute = async (id: number) => {
    if (!window.confirm('')) return;
    try {
      const res = await fetch(`/api/routes/admin/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('');
        fetchRouteConnections();
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
    setTrainLogs(['Starting training...']);
    setTrainProgress(0);

    try {
      const res = await fetch('/api/admin/model/retrain', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      const d = await res.json();

      if (!res.ok) {
        alert(d.error || 'Failed to start training.');
        setTrainingModel(false);
        return;
      }

      // Poll for real progress from the Python process
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/admin/model/status', {
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
            setTrainLogs(prev => [...prev, `Training failed: ${status.error}`]);
            setTrainProgress(0);
            setTrainingModel(false);
            alert(`Training failed: ${status.error}`);
            return;
          }

          // Training completed successfully
          const metricsRes = await fetch('/api/admin/model', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const metrics = await metricsRes.json();
          setModelMetrics(metrics);

          setTrainLogs(prev => [
            ...prev,
            `Training complete${metrics.processingTime ? ` (${metrics.processingTime}s elapsed)` : ''}`,
            'Model ready',
          ]);
          setTrainProgress(100);
          showToast('Training completed.');
          setTrainingModel(false);
        } catch (e) {
          // Ignore polling errors
        }
      }, 2000);
    } catch (e) {
      console.error(e);
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
      setTrainingModel(false);
    }
  };

<<<<<<< HEAD
  const handleResetModel = async () => {
    if (!window.confirm('Reset the model? This will clear all training data.')) return;
    try {
      const res = await fetch('/api/admin/model/reset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) {
        showToast('Model reset successfully.');
        setModelMetrics(d.metrics);
        setTrainLogs([]);
        setTrainProgress(0);
      } else {
        alert(d.error || 'Failed to reset model.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to reset model.');
    }
  };

  const handleDownloadModel = async () => {
    try {
      const res = await fetch('/api/admin/model/download', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to download report.');
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
      alert(e.message || 'Failed to download report.');
    }
  };

  const handleDownloadPkl = async () => {
    try {
      const res = await fetch('/api/admin/model/download-pkl', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to download model.');
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
      alert(e.message || 'Failed to download model.');
    }
  };

  // ==================== PROFILE SETTINGS ====================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (profileNewPw !== profileConfirmPw) {
      setPasswordMsg({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    if (profileNewPw.length < 8) {
      setPasswordMsg({ ok: false, text: 'Password must be at least 8 characters.' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: profileOldPw, newPassword: profileNewPw })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ ok: true, text: data.message || 'Password changed successfully.' });
        setProfileOldPw(''); setProfileNewPw(''); setProfileConfirmPw('');
      } else {
        setPasswordMsg({ ok: false, text: data.error || 'Failed to change password.' });
      }
    } catch { setPasswordMsg({ ok: false, text: 'Network error.' }); }
    finally { setSavingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/user/delete-account', {
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
        alert(data.error || 'Failed to delete account.');
      }
    } catch { alert('Network error.'); }
    finally { setDeletingAccount(false); setShowDeleteConfirm(false); }
  };

  // ==================== DATASET UPLOAD ====================
  const fetchDatasetOverview = async () => {
    try {
      const res = await fetch('/api/admin/dataset', { headers: { 'Authorization': `Bearer ${token}` } });
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
      const res = await fetch('/api/admin/dataset/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        showToast('Dataset uploaded successfully.');
        setCsvFile(null);
        fetchDatasetOverview();
      } else {
        const data = await res.json();
        alert(data.error || 'Upload failed.');
      }
    } catch { alert('Upload failed.'); }
    finally { setUploadingCsv(false); }
  };

  const fetchDatasetPreview = async () => {
    try {
      const res = await fetch('/api/admin/dataset/preview', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setDatasetPreview(await res.json());
    } catch {}
  };

  const handleClearDataset = async () => {
    if (!confirm('Are you sure you want to delete this dataset? This cannot be undone.')) return;
    setClearingDataset(true);
    try {
      const res = await fetch('/api/admin/dataset/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Dataset cleared.');
        setDatasetOverview({ exists: false, fileName: null, totalRows: 0 });
        setDatasetPreview(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to clear dataset.');
      }
    } catch { alert('Failed to clear dataset.'); }
    finally { setClearingDataset(false); }
  };

=======
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
              <p className="text-[10px] font-extrabold text-[#64748b] tracking-wider leading-none">{'ADMIN CONSOLE'}</p>
              <h2 className="text-sm font-bold text-[#1e293b] font-display mt-0.5">{'Welcome back, '}{user.username}</h2>
=======
              <p className="text-[10px] font-extrabold text-[#64748b] tracking-wider leading-none">SYSTEM ADMINISTRATION</p>
              <h2 className="text-sm font-bold text-[#1e293b] font-display mt-0.5">Control Terminal</h2>
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" id="admin-tabs">
<<<<<<< HEAD
              {(['users', 'telemetry', 'operators', 'stations', 'holidays', 'dataset', 'model', 'profile'] as const).map((tab) => (
=======
            {(['users', 'telemetry', 'holidays', 'dataset', 'model'] as const).map((tab) => (
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
                 tab === 'operators' ? 'Operator Approval' :
                 tab === 'stations' ? 'Stations & Routes' :
                 tab === 'holidays' ? 'Holidays Calendar' : 
                 tab === 'model' ? 'ML Model' :
                 tab === 'profile' ? 'Profile Settings' :
                 tab === 'dataset' ? 'Dataset Upload' : ''}
=======
                 tab === 'holidays' ? 'Holidays Calendar' : 
                 tab === 'dataset' ? 'Dataset (CSV)' : 'ML Retrain Panel'}
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto animate-fade-in" id="admin-viewport">
        {/* ==================== SUBTAB: USER CRUD ==================== */}
        {activeSubTab === 'users' && (
<<<<<<< HEAD
          <div className="space-y-6" id="admin-users-row">
            {/* Provision Modal */}
            {showProvisionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">{'Provision New Account'}</h3>
                  <p className="text-xs text-slate-500 mb-4">{'Create a new user account in the system.'}</p>
                  <form onSubmit={handleCreateUser} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Full Name'}</label>
                      <input type="text" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"                     placeholder={''} value={newFullname} onChange={(e) => setNewFullname(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Username'}</label>
                      <input type="text" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"                     placeholder={''} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Password'}</label>
                      <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"                     placeholder={''} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Role'}</label>
                      <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                        {'Administrator'}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" disabled={savingUser} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50">
                        {savingUser ? 'Provisioning...' : 'Create Account'}
                      </button>
                      <button type="button" onClick={() => setShowProvisionModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer">
                        {'Cancel'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Admin Accounts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="user-section-admin">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-extrabold text-[#111827] text-base">{'Administrator'}</h3>
                <button onClick={() => { setNewRole('admin'); setShowProvisionModal(true); }} className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> {'Add Administrator'}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3 w-[45%]">{'User Profile'}</th>
                      <th className="p-3 w-[25%]">{'Username ID'}</th>
                      <th className="p-3 w-[20%]">{'Account Status'}</th>
                      <th className="p-3 text-right w-[10%]">{'Action Panel'}</th>
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
                            {usr.status.charAt(0).toUpperCase() + usr.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button id={`btn-delete-user-${usr.id}`} onClick={() => deleteUser(usr.id)} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition" title={'Delete'}><Trash2 className="h-3.5 w-3.5" /></button>
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
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-4">{'Operators'}</h3>
=======
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

>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
<<<<<<< HEAD
                      <th className="p-3 w-[45%]">{'User Profile'}</th>
                      <th className="p-3 w-[25%]">{'Username ID'}</th>
                      <th className="p-3 w-[20%]">{'Account Status'}</th>
                      <th className="p-3 text-right w-[10%]">{'Action Panel'}</th>
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
                            {usr.status === 'approved' ? 'Active' : usr.status.charAt(0).toUpperCase() + usr.status.slice(1)}
                          </span>
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {editingUserId === usr.id ? (
<<<<<<< HEAD
                              <>
                                <select className="py-1 px-2 border border-slate-200 rounded text-xs" value={editRole} onChange={(e) => setEditRole(e.target.value as any)}>
                                  <option value="passenger">{'Passenger'}</option>
                                  <option value="operator">{'ETS Operator'}</option>
                                  <option value="admin">{'Administrator'}</option>
                                </select>
                                <select className="py-1 px-2 border border-slate-200 rounded text-xs" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                                  <option value="active">{'Active'}</option>
                                  <option value="suspended">{'Suspended'}</option>
                                </select>
                                <button id={`btn-save-edit-user-${usr.id}`} onClick={() => saveEditUser(usr.id)} className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition text-[10px] font-bold">{'Save Changes'}</button>
                              </>
                            ) : (
                              <>
                                <button id={`btn-edit-user-${usr.id}`} onClick={() => { setEditingUserId(usr.id); setEditRole(usr.role); setEditStatus(usr.status); }} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition">{'Edit'}</button>
                                {usr.status !== 'active' && usr.status !== 'approved' && (
                                  <button id={`btn-suspend-toggle-user-${usr.id}`} onClick={() => toggleSuspension(usr.id, usr.status)} className="p-1 hover:bg-slate-100 rounded transition font-bold text-[10px] text-emerald-600">{'Reinstate'}</button>
                                )}
                                <button id={`btn-delete-user-${usr.id}`} onClick={() => deleteUser(usr.id)} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition" title={'Delete'}><Trash2 className="h-3.5 w-3.5" /></button>
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
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-4">{'Passengers'}</h3>
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3 w-[45%]">{'User Profile'}</th>
                      <th className="p-3 w-[25%]">{'Username ID'}</th>
                      <th className="p-3 w-[20%]">{'Account Status'}</th>
                      <th className="p-3 text-right w-[10%]">{'Action Panel'}</th>
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
                            {usr.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {editingUserId === usr.id ? (
                              <>
                                <select className="py-1 px-2 border border-slate-200 rounded text-xs" value={editRole} onChange={(e) => setEditRole(e.target.value as any)}>
                                  <option value="passenger">{'Passenger'}</option>
                                  <option value="operator">{'ETS Operator'}</option>
                                  <option value="admin">{'Administrator'}</option>
                                </select>
                                <select className="py-1 px-2 border border-slate-200 rounded text-xs" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                                  <option value="active">{'Active'}</option>
                                  <option value="suspended">{'Suspended'}</option>
                                </select>
                                <button id={`btn-save-edit-user-${usr.id}`} onClick={() => saveEditUser(usr.id)} className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition text-[10px] font-bold">{'Save Changes'}</button>
                              </>
                            ) : (
                              <>
                                <button id={`btn-edit-user-${usr.id}`} onClick={() => { setEditingUserId(usr.id); setEditRole(usr.role); setEditStatus(usr.status); }} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition">{'Edit'}</button>
                                {usr.status !== 'active' && usr.status !== 'approved' && (
                                  <button id={`btn-suspend-toggle-user-${usr.id}`} onClick={() => toggleSuspension(usr.id, usr.status)} className="p-1 hover:bg-slate-100 rounded transition font-bold text-[10px] text-emerald-600">{'Reinstate'}</button>
                                )}
                                <button id={`btn-delete-user-${usr.id}`} onClick={() => deleteUser(usr.id)} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition" title={'Delete'}><Trash2 className="h-3.5 w-3.5" /></button>
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{'Total Users by Role'}</span>
                  <div className="mt-2 space-y-1">
                    {telemetry?.userCounts ? (
                      Object.entries(telemetry.userCounts).map(([role, count]) => (
                        <p key={role} className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-slate-900 font-mono">{count}</span>
                          <span className="text-xs font-bold text-slate-400">{role === 'passenger' ? 'Users' : role === 'operator' ? 'Operators' : role === 'admin' ? 'Admins' : role}</span>
                        </p>
                      ))
                    ) : (
                      <>
                        <p className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-slate-900 font-mono">0</span>
                          <span className="text-xs font-bold text-slate-400">{'Users'}</span>
                        </p>
                        <p className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-slate-900 font-mono">0</span>
                          <span className="text-xs font-bold text-slate-400">{'Operators'}</span>
                        </p>
                      </>
                    )}
                  </div>
=======
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Secured Accounts</span>
                  <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                    {telemetry?.activeUsers || 0}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Registries matching database user row indices</p>
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
<<<<<<< HEAD
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{'Total Stations'}</span>
                  <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                    {telemetry?.stationsByState?.reduce((s, r) => s + r.count, 0) || 0}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{'Total Stations'}</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <MapPin className="h-5 w-5" />
=======
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Aggregated System Usage</span>
                  <h4 className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                    {telemetry?.totalPredictions || 0} <span className="text-xs font-sans text-slate-400 font-bold">queries</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Total run iterations with active saving triggers</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Cpu className="h-5 w-5" />
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                </div>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
<<<<<<< HEAD
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'System Integrity'}</span>
                  <h4 className="text-3xl font-extrabold text-white mt-1.5 font-mono">OK</h4>
                  <p className="text-xs text-indigo-400 mt-1 font-bold">{'System Integrity'}</p>
=======
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">System Integrity</span>
                  <h4 className="text-3xl font-extrabold text-white mt-1.5 font-mono">OK</h4>
                  <p className="text-xs text-indigo-400 mt-1 font-bold">SSL & Relational PRAGMA parameters active</p>
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
                  <Cpu className="h-4 w-4 text-indigo-600" /> {'Daily Query Traffic (14 Days)'}
=======
                  <Cpu className="h-4 w-4 text-indigo-600" /> API Query Traffic Index (Requests over Time)
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
                  <div className="text-center py-24 text-slate-400 text-xs">{'Loading...'}</div>
=======
                  <div className="text-center py-24 text-slate-400 text-xs">Awaiting log compilations...</div>
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                )}
              </div>

              {/* Busiest Queries */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-h-96 overflow-y-auto" id="top-predicted-queries">
<<<<<<< HEAD
                <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest mb-3">{'Top Searched Routes'}</h4>
                
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
                              <span className="text-[10px] text-slate-400 font-semibold">{'Rank'} #{i + 1}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                                {route.demandLevel}
                              </span>
                            </div>
                          </div>
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold px-2.5 py-0.5 rounded-lg">
                            {'Total: '}{route.volume}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">{'No prediction requests logged yet.'}</div>
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: HOLIDAYS ==================== */}
        {activeSubTab === 'holidays' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="holidays-grid">
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="holiday-creation-wrapper">
<<<<<<< HEAD
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">{'Add Special Calendar Day'}</h3>
              <p className="text-[11px] text-slate-400 mb-4">{'Introduce Malaysian national events directly into SQLite.'}</p>

              <form onSubmit={handleCreateHoliday} className="space-y-4" id="holiday-form">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="h-name">{'Holiday Theme Name'}</label>
=======
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">Add Exceptional Calendar Day</h3>
              <p className="text-[11px] text-slate-400 mb-4">Introduce national Malaysian milestones directly into SQLite.</p>

              <form onSubmit={handleCreateHoliday} className="space-y-4" id="holiday-form">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="h-name">Holiday Theme Name</label>
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                  <input
                    id="h-name"
                    type="text"
                    required
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none"
<<<<<<< HEAD
                    placeholder={''}
=======
                    placeholder="e.g. Hari Kaamatan"
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                  />
                </div>

                <div>
<<<<<<< HEAD
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="h-date">{'Actual Holiday Date'}</label>
=======
                  <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="h-date">Holiday Real Date</label>
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
                    {'Insert New Holiday'}
=======
                    Insert New Holiday
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                  </button>
                </div>
              </form>

<<<<<<< HEAD
              <div className="mt-8 border-t border-slate-100 pt-6" id="static-holiday-note">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{'Static Holiday List'}</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {'Holidays are managed as static data. Add, change, or delete holidays as needed.'}
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                </p>
              </div>
            </div>

            {/* List Holidays */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="holidays-grid-card">
<<<<<<< HEAD
              <h3 className="font-display font-extrabold text-[#111827] text-base mb-4">{'Official Holiday Transit Multiplier'}</h3>

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
                                <button id={`btn-save-inline-holiday-${h.id}`} onClick={() => saveEditHoliday(h.id)} className="p-1 px-1.5 bg-emerald-100 hover:bg-emerald-200 rounded text-emerald-800 text-[10px] font-bold">{'Save'}</button>
                                <button id={`btn-cancel-inline-holiday-${h.id}`} onClick={() => setEditingHolidayId(null)} className="p-1 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 text-[10px] font-bold">✖</button>
                              </>
                            ) : (
                              <>
                                <button id={`btn-edit-holiday-${h.id}`} onClick={() => { setEditingHolidayId(h.id); setEditHolidayName(h.name); setEditHolidayDate(h.date); }} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded text-[10px] transition font-bold">{'Edit'}</button>
                                <button id={`btn-delete-holiday-${h.id}`} onClick={() => deleteHoliday(h.id)} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-red-500 rounded text-[10px] transition font-bold">{'Delete'}</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

<<<<<<< HEAD
        {/* ==================== SUBTAB: OPERATOR APPROVAL ==================== */}
        {activeSubTab === 'operators' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="operator-approval-tab">
            <div className="mb-6">
              <h3 className="font-display font-extrabold text-slate-800 text-lg">{'Operator Approval Management'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{'Review and approve/reject operator registrations.'}</p>
            </div>

            {loadingOperators ? (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-semibold">{'Loading...'}</p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h4 className="font-display font-bold text-sm text-amber-700 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {'Pending Operators'}
                  </h4>
                  {operatorList.filter(o => o.status === 'pending').length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 bg-slate-50 rounded-xl text-center">{'No pending operators.'}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-amber-50 text-amber-700 font-bold border-b border-amber-100">
                            <th className="p-3">{'Full Name'}</th>
                            <th className="p-3">{'Username'}</th>
                            <th className="p-3">{'Registered Date'}</th>
                            <th className="p-3 text-right">{'Action Panel'}</th>
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
                                    {'Approve'}
                                  </button>
                                  <button
                                    onClick={() => handleRejectOperator(op.id)}
                                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  >
                                    {'Reject'}
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
                    <CheckCircle2 className="h-4 w-4" /> {'Approved Operators'}
                  </h4>
                  {operatorList.filter(o => o.status === 'approved' || o.status === 'active').length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 bg-slate-50 rounded-xl text-center">{'No data available.'}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-emerald-50 text-emerald-700 font-bold border-b border-emerald-100">
                            <th className="p-3">{'Full Name'}</th>
                            <th className="p-3">{'Username'}</th>
                            <th className="p-3">{'Account Status'}</th>
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
                                  {'Active'}
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
                    <AlertCircle className="h-4 w-4" /> {'Rejected Operators'}
                  </h4>
                  {operatorList.filter(o => o.status === 'rejected').length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 bg-slate-50 rounded-xl text-center">{'No data available.'}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-red-50 text-red-700 font-bold border-b border-red-100">
                            <th className="p-3">{'Full Name'}</th>
                            <th className="p-3">{'Username'}</th>
                            <th className="p-3">{'Account Status'}</th>
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
                                  {'Suspended'}
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
              <h3 className="font-display font-extrabold text-slate-800 text-lg mb-4">{'Station Management'}</h3>

              <form onSubmit={handleAddStation} className="flex gap-2 mb-6">
                <input
                  type="text"
                  required
                  placeholder={'Station Name'}
                  className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                />
                <input
                  type="text"
                  required
                  placeholder={'State'}
                  className="w-28 py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  value={newStationState}
                  onChange={(e) => setNewStationState(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {'Add Station'}
                </button>
              </form>

              <div className="overflow-x-auto rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3">{'Station Name'}</th>
                      <th className="p-3">{'State'}</th>
                      <th className="p-3 text-right">{'Action Panel'}</th>
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
                                {'Save'}
                              </button>
                              <button
                                onClick={() => setEditingStationId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Cancel'}
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
                                {'Edit Station'}
                              </button>
                              <button
                                onClick={() => handleDeleteStation(st.id)}
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

            {/* Route Connection Management */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="route-management-card">
              <h3 className="font-display font-extrabold text-slate-800 text-lg mb-4">{'Route Connection Management'}</h3>

              <form onSubmit={handleAddRoute} className="flex gap-2 mb-6">
                <select
                  required
                  className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                  value={newRouteOrigin}
                  onChange={(e) => { setNewRouteOrigin(e.target.value); setNewRouteDest(''); }}
                >
                  <option value="">{'Select origin station...'}</option>
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
                  <option value="">{'Select destination station...'}</option>
                  {filteredDestStations.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {'Add Connection'}
                </button>
              </form>

              <div className="overflow-x-auto rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="p-3">{'Origin Station'}</th>
                      <th className="p-3">{'Destination Station'}</th>
                      <th className="p-3 text-right">{'Action Panel'}</th>
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
                                {'Save'}
                              </button>
                              <button
                                onClick={() => setEditingRouteId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                {'Cancel'}
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
                                {'Edit'}
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
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: ML MODEL CONTROLS ==================== */}
        {activeSubTab === 'model' && (
          <div className="max-w-3xl mx-auto space-y-6" id="model-management-panel">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="model-info-intro">
<<<<<<< HEAD
              <h3 className="font-display font-extrabold text-slate-800 text-lg">{'ML Model'}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {'Trains a Random Forest model on Ridership table data using an 80:20 split. Retrain after adding new data to improve accuracy.'}
=======
              <h3 className="font-display font-extrabold text-slate-800 text-lg">Machine Learning Decission Tree Training Controller</h3>
              <p className="text-xs text-slate-500 mt-1">
                Trigger mathematical fits against entries in the Ridership table to adjust day metrics, commute multipliers and seasonal coefficients dynamically.
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
              </p>
            </div>

            {modelMetrics ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="model-grid-metrics">
                <div className="bg-white p-5 border border-slate-200 rounded-2xl text-center shadow-sm">
<<<<<<< HEAD
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'Mean Absolute Error (MAE)'}</p>
                  <p className="text-3xl font-extrabold text-[#4F46E5] mt-3 font-mono">{modelMetrics.mae} {'passengers'}</p>
                  <p className="text-[10px] text-slate-450 text-slate-500 mt-1 font-semibold">{'Average absolute deviation from actual'}</p>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-2xl text-center shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'Root Mean Squared Error'}</p>
                  <p className="text-3xl font-extrabold text-[#D97706] mt-3 font-mono">{modelMetrics.rmse} {'passengers'}</p>
                  <p className="text-[10px] text-slate-450 text-slate-500 mt-1 font-semibold">{'Penalizes large prediction errors with weight'}</p>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-2xl text-center shadow-sm font-sans">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{'R-Squared Accuracy (R²)'}</p>
                  <p className="text-3xl font-extrabold text-[#10B981] mt-3 font-mono">{(modelMetrics.r2 * 100).toFixed(0)}% {'match'}</p>
                  <p className="text-[10px] text-slate-450 text-slate-500 mt-1 font-semibold">{'Percentage of variance successfully predicted'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl">{'Loading metrics...'}</div>
            )}

            {modelMetrics && !trainingModel && modelMetrics.totalRecords > 0 && (
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPkl}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <DownloadCloud className="h-4 w-4" />
                  {'Download Model (.pkl)'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadModel}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <DownloadCloud className="h-4 w-4" />
                  {'Download Report (.txt)'}
                </button>
              </div>
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
            )}

            {/* Train triggers */}
            <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-sm text-center relative overflow-hidden" id="training-console">
              <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-5">
                <Cpu className="w-64 h-64" />
              </div>

<<<<<<< HEAD
              <h4 className="font-display font-extrabold text-base mb-3 text-indigo-400">{'Random Forest Trainer'}</h4>
              <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed mb-6">
                {'Exports Ridership data from the database, trains a Random Forest model on an 80:20 split, and saves the model as a Pickle (.pkl) file.'}
              </p>

              {!datasetExists && !trainingModel && (
                <div className="mb-4 bg-amber-900/30 border border-amber-700/50 text-amber-300 px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {'Upload a dataset CSV first before retraining the model.'}
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
                  {'Retrain Model'}
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
                  {'Delete Pipeline & Reset Model'}
                </button>
              </div>

              {(trainingModel || trainLogs.length > 0) && (
                <div className="mt-6 w-full text-left bg-slate-950 rounded-xl border border-slate-700 p-4 shadow-inner max-w-lg mx-auto">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-slate-400 font-mono tracking-widest font-bold">
                      {trainingModel ? 'PIPELINE RUNNING' : 'LAST PIPELINE LOG'}
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
                  <p>{'Last Pipeline Execution'}: {new Date(modelMetrics.trainedAt).toLocaleString()} | {'Rows Evaluated'}: {modelMetrics.totalRecords}</p>
                  <p className="text-indigo-300 bg-indigo-900/40 inline-block px-3 py-1 rounded-full">{modelMetrics.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SUBTAB: PROFILE SETTINGS ==================== */}
        {activeSubTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6" id="admin-profile-tab">
            {/* Account Info Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-indigo-500" />
                <h3 className="font-display text-lg font-bold text-slate-800">{'Account Information'}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{'Full Name'}</p>
                  <p className="font-semibold text-slate-800 mt-1">{user.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{'Username'}</p>
                  <p className="font-semibold text-slate-800 mt-1">{user.username}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{'Role'}</p>
                  <span className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 capitalize">{user.role}</span>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{'Status'}</p>
                  <span className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 capitalize">{user.status}</span>
                </div>
              </div>
            </div>


            {/* Change Password Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-indigo-500" />
                <h3 className="font-display text-lg font-bold text-slate-800">{'Change Password'}</h3>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Current Password'}</label>
                  <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400" value={profileOldPw} onChange={(e) => setProfileOldPw(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'New Password'}</label>
                  <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400" value={profileNewPw} onChange={(e) => setProfileNewPw(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{'Confirm New Password'}</label>
                  <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400" value={profileConfirmPw} onChange={(e) => setProfileConfirmPw(e.target.value)} />
                </div>
                {passwordMsg && (
                  <p className={`text-xs font-semibold ${passwordMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{passwordMsg.text}</p>
                )}
                <button type="submit" disabled={savingPassword} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50">
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* Danger Zone Card */}
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-display text-lg font-bold text-red-700">{'Danger Zone'}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">{'Once you delete your account, there is no going back. Please be certain.'}</p>
              <button onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer">
                {'Delete My Account'}
              </button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <h3 className="font-display font-extrabold text-red-700 text-base mb-1">{'Confirm Account Deletion'}</h3>
                  <p className="text-xs text-slate-500 mb-4">{'Enter your password to confirm deletion of your account. This action cannot be undone.'}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{'Your Password'}</label>
                      <input type="password" required className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-400" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition cursor-pointer">{'Cancel'}</button>
                      <button onClick={handleDeleteAccount} disabled={deletingAccount || !deletePassword} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50">
                        {deletingAccount ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== SUBTAB: DATASET UPLOAD ==================== */}
        {activeSubTab === 'dataset' && (
          <div className="max-w-5xl mx-auto space-y-6" id="admin-dataset-tab">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <UploadCloud className="w-5 h-5 text-indigo-500" />
                <h3 className="font-display text-lg font-bold text-slate-800">{'Upload Dataset CSV'}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">{'Upload a CSV file with historical ridership data. The file will be saved to the server for training. No database changes are made.'}</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input type="file" accept=".csv" onChange={handleFileChange} className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                  <button onClick={handleUploadCsv} disabled={uploadingCsv || !csvFile} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                    {uploadingCsv ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                {csvFile && (
                  <p className="text-[11px] text-slate-400 font-medium">{'Selected'}: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</p>
                )}
              </div>
            </div>

            {/* Current Dataset Info & Clear */}
            {datasetOverview && datasetOverview.exists && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-display text-lg font-bold text-slate-800">{'Current Dataset'}</h3>
                  </div>
                  <button onClick={handleClearDataset} disabled={clearingDataset} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                    {clearingDataset ? 'Clearing...' : 'Empty Dataset'}
                  </button>
                </div>
                <div className="space-y-1 text-sm mb-4">
                  <p><span className="font-semibold text-slate-500">{'File'}:</span> <span className="font-mono text-slate-800">{datasetOverview.fileName}</span></p>
                  <p><span className="font-semibold text-slate-500">{'Total Rows'}:</span> <span className="font-bold text-slate-800">{datasetOverview.totalRows.toLocaleString()}</span></p>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {datasetPreview && datasetPreview.rows.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-x-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-display text-lg font-bold text-slate-800">{'Data Preview (First 50 Rows)'}</h3>
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
=======
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
          </div>
        )}
      </div>
    </div>
  );
}
