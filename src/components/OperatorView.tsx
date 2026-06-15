import React, { useState, useEffect } from 'react';
import { User, ReportItem } from '../types.ts';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, FileSpreadsheet, RefreshCw, Trash2, CheckCircle2, ChevronRight, 
  Calendar, Clock, Award, AlertCircle, FileText, Info, Loader2, Landmark
} from 'lucide-react';

interface OperatorViewProps {
  user: User;
  token: string;
}

export default function OperatorView({ user, token }: OperatorViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'reports'>('analytics');
  
  // Selection
  const [selectedMonth, setSelectedMonth] = useState(6); // June
  const [selectedYear, setSelectedYear] = useState(2026);

  // States
  const [analyticsData, setAnalyticsData] = useState<{
    routesAnalytics: { name: string; ridership: number }[];
    peakHours: { hour: string; passengers: number }[];
    busiestRoutes: { name: string; ridership: number }[];
  } | null>(null);

  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
    fetchReports();
  }, [selectedMonth, selectedYear]);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/operator/analytics?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/operator/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setReports(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!analyticsData) return;
    setGenerating(true);
    try {
      // Build report details JSON
      const reportContent = {
        busiestRoute: analyticsData.busiestRoutes[0]?.name || 'N/A',
        totalMonthEstRidership: analyticsData.routesAnalytics.reduce((acc, r) => acc + r.ridership, 0),
        peakOperationalHour: '18:00',
        generatedBy: user.full_name,
        systemHealthIndex: '94%'
      };

      const res = await fetch('/api/operator/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          report_data: reportContent
        })
      });

      if (res.ok) {
        showToast('Monthly management report generated and cached in SQL database.');
        fetchReports();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this report from archives?')) return;
    try {
      const res = await fetch(`/api/operator/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Report deleted.');
        fetchReports();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  const getMonthName = (m: number) => {
    const list = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return list[m - 1];
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
              <p className="text-[10px] font-extrabold text-[#64748b] tracking-wider leading-none">OPERATORS CONTROL</p>
              <h2 className="text-sm font-bold text-[#1e293b] font-display mt-0.5">{user.full_name} Console</h2>
            </div>
          </div>

          <div className="flex items-center gap-2" id="op-tab-select">
            <button
              id="subtab-btn-analytics"
              onClick={() => {
                setActiveSubTab('analytics');
                fetchAnalytics();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'analytics' 
                  ? 'bg-[#4f46e5] text-white shadow-sm border border-[#4338ca]' 
                  : 'text-[#64748b] bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]'
              }`}
            >
              Home/Analytics
            </button>
            <button
              id="subtab-btn-reports"
              onClick={() => {
                setActiveSubTab('reports');
                fetchReports();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'reports' 
                  ? 'bg-[#4f46e5] text-white shadow-sm border border-[#4338ca]' 
                  : 'text-[#64748b] bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]'
              }`}
            >
              Management Reports Archive
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto" id="operator-viewport">
        {/* ==================== ANALYTICS VIEW ==================== */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-8" id="analytics-grid">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4" id="analytics-filter">
              <div>
                <h3 className="font-display font-extrabold text-slate-800 text-lg">Dynamic Travel Demand Trends</h3>
                <p className="text-xs text-slate-400 mt-0.5">Filter charts by month/year to see ridership logs and peaks.</p>
              </div>

              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Target Month</label>
                  <select
                    id="op-month-opt"
                    className="py-1 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Target Year</label>
                  <select
                    id="op-year-opt"
                    className="py-1 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    id="btn-op-refresh"
                    onClick={fetchAnalytics}
                    disabled={loadingAnalytics}
                    className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                  >
                    <RefreshCw className={`h-3 w-3 inline ${loadingAnalytics ? 'animate-spin' : ''}`} /> Sync
                  </button>
                </div>
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-semibold">Regenerating metric structures...</p>
              </div>
            ) : analyticsData ? (
              <>
                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="op-charts-row">
                  {/* CHART 1: Ridership Analytics by Route */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm" id="chart-routes-wrapper">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Total Ridership Volume by Transit Route
                    </h4>
                    <div className="h-72 w-full" id="routes-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.routesAnalytics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                          <Tooltip wrapperStyle={{ fontSize: 11, fontFamily: 'sans-serif' }} cursor={{ fill: '#f8fafc' }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Bar dataKey="ridership" name="Monthly Passengers" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CHART 2: Peak demand periods hours */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm" id="chart-hours-wrapper">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-indigo-500" /> Diurnal Commute Load Demands
                    </h4>
                    <div className="h-72 w-full" id="hours-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.peakHours} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                          <Tooltip wrapperStyle={{ fontSize: 11, fontFamily: 'sans-serif' }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Line type="monotone" dataKey="passengers" name="Estimated Passengers" stroke="#d97706" strokeWidth={2.5} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="op-bottom-analytics-row">
                  {/* Table Busiest routes */}
                  <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm" id="table-busiest-wrapper">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider">
                      Ranked Transit Routes ({getMonthName(selectedMonth)} {selectedYear})
                    </h4>
                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <th className="p-3">Rank No.</th>
                            <th className="p-3">Route Track Link</th>
                            <th className="p-3">Estimated Cumulative Passengers</th>
                            <th className="p-3 text-right">Operational Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                          {analyticsData.busiestRoutes.map((route, i) => (
                            <tr key={route.name} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-slate-400">#{i + 1}</td>
                              <td className="p-3 flex items-center gap-1.5 font-bold text-slate-800">
                                <span className="bg-indigo-50 text-indigo-600 p-1 rounded-md text-[10px]">ETS</span>
                                {route.name}
                              </td>
                              <td className="p-3 font-mono">{route.ridership.toLocaleString()} individuals</td>
                              <td className="p-3 text-right">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  Optimal Capacity
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Operational Management Brief */}
                  <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between" id="report-generate-card">
                    <div>
                      <span className="bg-indigo-600/30 text-indigo-400 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">Action Console</span>
                      <h4 className="font-display font-extrabold text-base mt-2">Generate Operational Assessment</h4>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Compile current analytical findings, customer crowd feedback metrics, and model trends for the selected monthly parameters to generate a signed digital board report.
                      </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-800 mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Busiest Route:</span>
                        <span className="text-white font-bold">{analyticsData.busiestRoutes[0]?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Agreed Day Peak:</span>
                        <span className="text-white font-bold">18:00 Commute Rush</span>
                      </div>

                      <button
                        id="btn-op-generate-report"
                        onClick={handleGenerateReport}
                        disabled={generating}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Archiving...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            Generate & Publish Report
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-slate-100 shadow-sm">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">Could not compute model trends. Click Sync or select different parameters.</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== REPORTS ARCHIVE TAB ==================== */}
        {activeSubTab === 'reports' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="reports-grid-wrapper">
            <div className="mb-6">
              <h3 className="font-display font-extrabold text-slate-800 text-lg">Archived Management Board Releases</h3>
              <p className="text-xs text-slate-500 mt-0.5">Officially stamped electronic reports for institutional operational auditing.</p>
            </div>

            {loadingReports ? (
              <div className="text-center py-20">
                <p className="text-slate-400 text-xs font-semibold">Accessing secure archives...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl max-w-md mx-auto">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-display text-sm font-semibold text-slate-700 mt-3">No published reports in database</h4>
                <p className="text-xs text-slate-400 mt-1">Go to Home/Analytics, filter desired dates, and select 'Generate Report'.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="reports-grid">
                {reports.map((report) => {
                  let rData = { busiestRoute: '-', totalMonthEstRidership: 0, peakOperationalHour: '-', generatedBy: 'Controller', systemHealthIndex: '95%' };
                  try {
                    rData = JSON.parse(report.report_data);
                  } catch (e) {
                    console.error('Failed to parse report data.');
                  }

                  return (
                    <div key={report.id} className="p-5 border border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm bg-slate-50/50 flex flex-col justify-between" id={`report-card-${report.id}`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-slate-900 text-slate-200 font-extrabold px-2 py-0.5 rounded">OFFICIAL STAMP</span>
                          <span className="text-[10px] font-mono text-slate-400 font-bold">ID: #{report.id}</span>
                        </div>

                        <h4 className="font-display text-slate-800 text-base font-extrabold mt-3 hover:text-indigo-600 transition">
                          ETS Performance Report
                        </h4>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">
                          Month Frame: {getMonthName(report.month)} {report.year}
                        </p>

                        <div className="space-y-2 mt-4 text-xs font-medium text-slate-600 border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between">
                            <span>High Demand Route:</span>
                            <span className="font-bold text-slate-800">{rData.busiestRoute}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Peak Work Hour:</span>
                            <span className="font-bold text-slate-800">{rData.peakOperationalHour}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Monthly Volume Estimate:</span>
                            <span className="font-bold text-slate-850 font-mono">{rData.totalMonthEstRidership.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Published By:</span>
                            <span className="text-indigo-600 font-bold bg-indigo-50/20 px-1 rounded">{report.operator_name || user.full_name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400" id="report-footer-actions">
                        <span className="font-mono">Locked: {new Date(report.generated_at).toLocaleDateString()}</span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            id={`btn-delete-report-${report.id}`}
                            onClick={() => handleDeleteReport(report.id)}
                            className="p-1 px-2 border border-slate-200 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition text-[9px] font-bold"
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
        )}
      </div>
    </div>
  );
}
