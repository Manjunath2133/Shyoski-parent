import { useEffect, useState, Fragment } from "react";
import { useAuth } from "../context/AuthContext";
import { authenticatedFetch } from "../api";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Shield, Activity, FileText, Database, ShieldAlert,
  Server, Clock, TrendingUp, AlertTriangle, ArrowRight, Download, Search, ChevronLeft, ChevronRight
} from "lucide-react";

export default function SuperAdmin() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("platform");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Super Admin Data States
  const [platformData, setPlatformData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);

  // Audit Logs Pagination & Filters
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditActions, setAuditActions] = useState([]);
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    severity: "",
    resourceType: "",
    startDate: "",
    endDate: "",
    limit: "15"
  });
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Load appropriate data based on tab
  useEffect(() => {
    if (!currentUser || (currentUser.globalRole !== "super_admin" && currentUser.role !== "admin")) {
      navigate("/");
      return;
    }

    if (activeTab === "platform") {
      fetchPlatformData();
    } else if (activeTab === "security") {
      fetchSecurityData();
    } else if (activeTab === "performance") {
      fetchPerformanceData();
    } else if (activeTab === "audits") {
      fetchAuditActions();
      fetchAuditLogs(1);
    }
  }, [activeTab, currentUser]);

  async function fetchPlatformData() {
    setLoading(true);
    setError("");
    try {
      const data = await authenticatedFetch("/api/v2/dashboard/super-admin?forceReload=true");
      setPlatformData(data);
    } catch (err) {
      setError(err.message || "Failed to load platform data");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSecurityData() {
    setLoading(true);
    setError("");
    try {
      const data = await authenticatedFetch("/api/v2/system/security");
      setSecurityData(data);
    } catch (err) {
      setError(err.message || "Failed to load security metrics");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPerformanceData() {
    setLoading(true);
    setError("");
    try {
      const data = await authenticatedFetch("/api/v2/system/performance");
      setPerformanceData(data);
    } catch (err) {
      setError(err.message || "Failed to load performance metrics");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAuditActions() {
    try {
      const actions = await authenticatedFetch("/api/v2/audit-logs/actions");
      setAuditActions(actions || []);
    } catch (err) {
      console.error("Failed to load audit actions catalog", err);
    }
  }

  async function fetchAuditLogs(page = 1) {
    setAuditLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("limit", auditFilters.limit);
      if (auditFilters.action) queryParams.append("action", auditFilters.action);
      if (auditFilters.severity) queryParams.append("severity", auditFilters.severity);
      if (auditFilters.resourceType) queryParams.append("resourceType", auditFilters.resourceType);
      if (auditFilters.startDate) queryParams.append("startDate", auditFilters.startDate);
      if (auditFilters.endDate) queryParams.append("endDate", auditFilters.endDate);

      const data = await authenticatedFetch(`/api/v2/audit-logs?${queryParams.toString()}`);
      setAuditLogs(data.data || []);
      setAuditTotalPages(data.pagination?.totalPages || 1);
      setAuditPage(page);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setAuditLoading(false);
    }
  }

  const handleAuditFilterChange = (e) => {
    const { name, value } = e.target;
    setAuditFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleAuditFilterSubmit = (e) => {
    e.preventDefault();
    fetchAuditLogs(1);
  };

  const exportAuditsToCSV = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("limit", "1000"); // Backend cap
      if (auditFilters.action) queryParams.append("action", auditFilters.action);
      if (auditFilters.severity) queryParams.append("severity", auditFilters.severity);
      if (auditFilters.resourceType) queryParams.append("resourceType", auditFilters.resourceType);

      const res = await authenticatedFetch(`/api/v2/audit-logs?${queryParams.toString()}`);
      const logsToExport = res.data || [];

      if (logsToExport.length === 0) {
        alert("No logs available for export");
        return;
      }

      // Generate CSV
      const headers = ["Timestamp", "Action", "Actor UID", "Resource Type", "Resource ID", "Severity", "Details"];
      const rows = logsToExport.map(log => [
        new Date(log.createdAt).toISOString(),
        log.action,
        log.actorUid,
        log.resourceType || "",
        log.resourceId || "",
        log.severity || "INFO",
        JSON.stringify(log.metadata || {})
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.map(val => {
        const strVal = val === null || val === undefined ? "" : val.toString();
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `platform_compliance_logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to export compliance logs: " + err.message);
    }
  };

  return (
    <div className="bg-transparent text-gray-900 flex flex-col w-full">
      {/* Header */}
      <header className="bg-white/40 border border-white/40 shadow-sm backdrop-blur-md rounded-2xl p-4 mb-8 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-605 animate-pulse" />
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-gray-950">Shyoski Workspace</h1>
            <p className="text-[10px] text-gray-500 font-mono">Platform Admin Engine v2.0</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] font-mono bg-blue-50 text-blue-750 px-3 py-1.5 rounded-full border border-blue-100 uppercase tracking-wider font-bold">
            Role: Super Admin
          </span>
          <button onClick={() => navigate("/dashboard")} className="text-[10px] font-bold text-gray-600 hover:text-blue-650 px-4 py-2 border border-gray-200 hover:bg-white bg-white/60 rounded-xl transition-all cursor-pointer">
            Exit to Tenant Dashboards
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-150 mb-8 overflow-x-auto">
        <button onClick={() => setActiveTab("platform")} className={`py-3 px-6 font-bold text-xs transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === "platform" ? "border-blue-605 text-blue-650" : "border-transparent text-gray-555 hover:text-gray-900"}`}>
          Platform Metrics
        </button>
        <button onClick={() => setActiveTab("audits")} className={`py-3 px-6 font-bold text-xs transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === "audits" ? "border-blue-605 text-blue-650" : "border-transparent text-gray-555 hover:text-gray-900"}`}>
          Compliance Auditing
        </button>
        <button onClick={() => setActiveTab("security")} className={`py-3 px-6 font-bold text-xs transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === "security" ? "border-blue-605 text-blue-650" : "border-transparent text-gray-555 hover:text-gray-900"}`}>
          Security Center
        </button>
        <button onClick={() => setActiveTab("performance")} className={`py-3 px-6 font-bold text-xs transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === "performance" ? "border-blue-605 text-blue-650" : "border-transparent text-gray-555 hover:text-gray-900"}`}>
          System Performance
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-1 w-full">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl mb-6 flex items-start space-x-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Execution Error</h4>
              <p className="text-xs mt-0.5 text-red-750 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600 mb-4" />
            <p className="text-gray-500 text-xs font-semibold">Aggregating global metric matrices...</p>
          </div>
        ) : (
          <>
            {/* PLATFORM OVERVIEW */}
            {activeTab === "platform" && platformData && (
              <div className="space-y-8 animate-fadeIn">
                {/* KPI Deck */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white/40 p-6 rounded-2xl border border-white/60 flex flex-col justify-between hover:shadow-md transition duration-300">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Organizations</span>
                    <div className="mt-4 flex items-baseline space-x-2">
                      <span className="text-3xl font-extrabold tracking-tight text-gray-950">{platformData.summary.totalOrganizations}</span>
                      <span className="text-[10px] font-bold text-green-600 font-mono">({platformData.summary.activeOrganizations} Active)</span>
                    </div>
                  </div>
                  <div className="bg-white/40 p-6 rounded-2xl border border-white/60 flex flex-col justify-between hover:shadow-md transition duration-300">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Total Memberships</span>
                    <div className="mt-4 flex items-baseline space-x-2">
                      <span className="text-3xl font-extrabold tracking-tight text-gray-950">{platformData.summary.totalUsers}</span>
                      <span className="text-[10px] font-bold text-blue-600 font-mono">({platformData.summary.totalStudents} Students)</span>
                    </div>
                  </div>
                  <div className="bg-white/40 p-6 rounded-2xl border border-white/60 flex flex-col justify-between hover:shadow-md transition duration-300">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Active Batches</span>
                    <div className="mt-4 flex items-baseline space-x-2">
                      <span className="text-3xl font-extrabold tracking-tight text-gray-950">{platformData.summary.activeBatches}</span>
                      <span className="text-[10px] font-bold text-gray-500 font-mono">/ {platformData.summary.totalBatches} Total</span>
                    </div>
                  </div>
                  <div className="bg-white/40 p-6 rounded-2xl border border-white/60 flex flex-col justify-between hover:shadow-md transition duration-300">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Certificates Claimed</span>
                    <div className="mt-4 flex items-baseline space-x-2">
                      <span className="text-3xl font-extrabold tracking-tight text-gray-950">{platformData.summary.totalCertificates}</span>
                      <span className="text-[10px] font-bold text-purple-600 font-mono">({platformData.summary.activeCertificates} Active)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Left Column: Recent Organizations & Payments */}
                  <div className="xl:col-span-2 space-y-8">
                    {/* Organizations */}
                    <div className="bg-white/40 rounded-2xl border border-white/60 p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-950 mb-4 flex items-center">
                        <Database className="w-4 h-4 mr-2 text-blue-650" /> Recent Organizations
                      </h3>
                      <div className="divide-y divide-gray-150">
                        {platformData.recentOrganizations.map(org => (
                          <div key={org._id} className="py-3 flex justify-between items-center">
                            <div>
                              <span className="text-xs font-bold text-gray-800">{org.name}</span>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{org.slug}</p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className={`px-2.5 py-0.5 text-[9px] font-bold font-mono rounded ${org.status === "active" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                                {org.status.toUpperCase()}
                              </span>
                              <span className="text-[10px] text-gray-500 font-semibold">{new Date(org.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payments */}
                    <div className="bg-white/40 rounded-2xl border border-white/60 p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-950 mb-4 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-green-600" /> Recent Platform Payments
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-150 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                              <th className="pb-3 font-bold">Order ID</th>
                              <th className="pb-3 font-bold">Candidate</th>
                              <th className="pb-3 font-bold">Amount</th>
                              <th className="pb-3 font-bold">Status</th>
                              <th className="pb-3 text-right font-bold">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs font-medium">
                            {platformData.recentPayments.map(p => (
                              <tr key={p._id} className="hover:bg-white/40 transition">
                                <td className="py-3 font-mono text-gray-600">{p.orderId || "N/A"}</td>
                                <td className="py-3 text-gray-800">{p.displayName}</td>
                                <td className="py-3 font-mono font-bold text-gray-900">₹{p.amount / 100}</td>
                                <td className="py-3">
                                  <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${p.status === "captured" ? "bg-green-50 text-green-700 border border-green-100" : "bg-yellow-50 text-yellow-700 border border-yellow-100"}`}>
                                    {p.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right text-[10px] text-gray-500 font-semibold">{new Date(p.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Platform Activity Logs */}
                  <div className="bg-white/40 rounded-2xl border border-white/60 p-6 flex flex-col shadow-sm">
                    <h3 className="text-sm font-bold text-gray-950 mb-4 flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-purple-650" /> Platform Logs
                    </h3>
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2">
                      {platformData.recentActivity.map((act, index) => (
                        <div key={index} className="p-3 bg-white/60 rounded-xl border border-white/85 flex flex-col space-y-1 hover:shadow-xs hover:border-gray-200 transition">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono font-bold text-blue-600">{act.type.toUpperCase()}</span>
                            <span className="text-[9px] text-gray-400 font-mono">{new Date(act.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-800 leading-normal">{act.title}</span>
                          <span className="text-[9px] text-gray-400 truncate font-mono">UID: {act.metadata?.uid || "system"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIT LOGS INTERFACE */}
            {activeTab === "audits" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Search / Filter Deck */}
                <div className="bg-white/40 p-6 rounded-2xl border border-white/60 shadow-sm">
                  <form onSubmit={handleAuditFilterSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Catalog Action</label>
                      <select name="action" value={auditFilters.action} onChange={handleAuditFilterChange} className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-850 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono cursor-pointer">
                        <option value="">All Actions</option>
                        {auditActions.map(act => (
                          <option key={act.action} value={act.action}>{act.action}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Severity Level</label>
                      <select name="severity" value={auditFilters.severity} onChange={handleAuditFilterChange} className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-850 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                        <option value="">All Severities</option>
                        <option value="INFO">INFO</option>
                        <option value="WARNING">WARNING</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Resource Type</label>
                      <input name="resourceType" type="text" placeholder="e.g. certificate" value={auditFilters.resourceType} onChange={handleAuditFilterChange} className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-850 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    </div>
                    <div>
                      <button type="submit" className="w-full p-2.5 bg-blue-650 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex justify-center items-center shadow-xs transition duration-200 cursor-pointer">
                        <Search className="w-3.5 h-3.5 mr-1.5" /> Query Logs
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={exportAuditsToCSV} className="w-full p-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex justify-center items-center transition border border-gray-200 shadow-xs cursor-pointer">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                      </button>
                    </div>
                  </form>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white/40 rounded-2xl border border-white/60 p-6 shadow-sm">
                  {auditLoading ? (
                    <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" /></div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-20 text-center text-gray-400 text-xs font-semibold">No matching audit trails found.</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-150 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                              <th className="pb-3 font-bold">Timestamp</th>
                              <th className="pb-3 font-bold">Action</th>
                              <th className="pb-3 font-bold">Actor</th>
                              <th className="pb-3 font-bold">Resource Type</th>
                              <th className="pb-3 font-bold">Resource ID</th>
                              <th className="pb-3 font-bold">Severity</th>
                              <th className="pb-3 text-right font-bold">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs font-medium">
                            {auditLogs.map(log => (
                              <Fragment key={log._id}>
                                <tr className="hover:bg-white/40 transition">
                                  <td className="py-3 text-[10px] text-gray-500 font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                                  <td className="py-3 font-mono font-bold text-gray-800">{log.action}</td>
                                  <td className="py-3 text-[10px] text-gray-500 font-mono">{log.actorUid}</td>
                                  <td className="py-3 font-mono text-[10px] text-gray-600">{log.resourceType || "N/A"}</td>
                                  <td className="py-3 font-mono text-[10px] text-gray-600">{log.resourceId || "N/A"}</td>
                                  <td className="py-3">
                                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${log.severity === "CRITICAL" ? "bg-red-50 text-red-700 border border-red-100" : log.severity === "WARNING" ? "bg-yellow-50 text-yellow-700 border border-yellow-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                                      {log.severity || "INFO"}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    <button onClick={() => setExpandedLogId(expandedLogId === log._id ? null : log._id)} className="text-[10px] text-blue-700 hover:text-blue-800 font-bold bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg transition cursor-pointer">
                                      {expandedLogId === log._id ? "Collapse" : "Expand"}
                                    </button>
                                  </td>
                                </tr>
                                {expandedLogId === log._id && (
                                  <tr className="bg-gray-50/50">
                                    <td colSpan={7} className="p-4 border-b border-gray-150">
                                      <div className="text-[10px] text-gray-700 font-mono whitespace-pre-wrap text-left bg-white p-3 rounded-lg border border-gray-150 shadow-xs max-w-full overflow-x-auto">
                                        {JSON.stringify(log.metadata || {}, null, 2)}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Control */}
                      <div className="flex justify-between items-center border-t border-gray-150 pt-4 text-xs font-semibold text-gray-500">
                        <span>Page <strong className="text-gray-800">{auditPage}</strong> of <strong className="text-gray-800">{auditTotalPages}</strong></span>
                        <div className="flex space-x-2">
                          <button disabled={auditPage === 1} onClick={() => fetchAuditLogs(auditPage - 1)} className="p-2 bg-white/60 hover:bg-white border border-gray-200 rounded-xl transition disabled:opacity-30 cursor-pointer shadow-xs">
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                          </button>
                          <button disabled={auditPage === auditTotalPages} onClick={() => fetchAuditLogs(auditPage + 1)} className="p-2 bg-white/60 hover:bg-white border border-gray-200 rounded-xl transition disabled:opacity-30 cursor-pointer shadow-xs">
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECURITY METRICS */}
            {activeTab === "security" && securityData && (
              <div className="space-y-8 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/40 p-6 rounded-2xl border border-red-200 flex items-center space-x-4 shadow-sm">
                    <div className="p-4 bg-red-50 rounded-xl text-red-650 border border-red-100"><ShieldAlert className="w-6 h-6" /></div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Rate Limit Hits</span>
                      <h4 className="text-2xl font-extrabold text-gray-900 mt-1">{securityData.rateLimitViolations}</h4>
                    </div>
                  </div>
                  <div className="bg-white/40 p-6 rounded-2xl border border-yellow-200 flex items-center space-x-4 shadow-sm">
                    <div className="p-4 bg-yellow-50 rounded-xl text-yellow-650 border border-yellow-100"><AlertTriangle className="w-6 h-6" /></div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Permission Denials</span>
                      <h4 className="text-2xl font-extrabold text-gray-900 mt-1">{securityData.permissionDeniedEvents}</h4>
                    </div>
                  </div>
                  <div className="bg-white/40 p-6 rounded-2xl border border-blue-200 flex items-center space-x-4 shadow-sm">
                    <div className="p-4 bg-blue-50 rounded-xl text-blue-650 border border-blue-100"><Server className="w-6 h-6" /></div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Failed Webhook Sigs</span>
                      <h4 className="text-2xl font-extrabold text-gray-900 mt-1">{securityData.failedWebhookSignatures}</h4>
                    </div>
                  </div>
                </div>

                <div className="bg-white/40 rounded-2xl border border-white/60 p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-950 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-red-650" /> Security State Aggregates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
                    <div className="p-4 bg-white/60 border border-gray-150 rounded-xl space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Suspicious Requests:</span>
                        <span className="text-gray-900 font-mono font-bold">{securityData.suspiciousRequests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Authentication Failures:</span>
                        <span className="text-gray-900 font-mono font-bold">{securityData.authFailures}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white/60 border border-gray-150 rounded-xl space-y-2 flex flex-col justify-center">
                      <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Last Logged Security Event</span>
                      <span className="text-gray-800 font-bold mt-1 text-xs">
                        {securityData.lastSecurityEventAt ? new Date(securityData.lastSecurityEventAt).toLocaleString() : "None Logged Since Boot"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-400 font-mono text-right mt-4">Security matrix generated at: {securityData.generatedAt}</p>
                </div>
              </div>
            )}

            {/* PERFORMANCE METRICS */}
            {activeTab === "performance" && performanceData && (
              <div className="space-y-8 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/40 p-6 rounded-2xl border border-white/60 flex items-center space-x-4 shadow-sm">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-650"><Clock className="w-6 h-6" /></div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Engine Uptime</span>
                      <h4 className="text-xl font-extrabold text-gray-900 mt-1">{(performanceData.uptimeSeconds / 3600).toFixed(1)} Hours</h4>
                    </div>
                  </div>
                  <div className="bg-white/40 p-6 rounded-2xl border border-white/60 flex items-center space-x-4 shadow-sm">
                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-green-650"><Activity className="w-6 h-6" /></div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Avg Response Time</span>
                      <h4 className="text-xl font-extrabold text-gray-900 mt-1">{performanceData.averageResponseTimeMs.toFixed(1)} ms</h4>
                    </div>
                  </div>
                  <div className="bg-white/40 p-6 rounded-2xl border border-white/60 flex items-center space-x-4 shadow-sm">
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-purple-650"><TrendingUp className="w-6 h-6" /></div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Slow Queries (&gt;= 500ms)</span>
                      <h4 className="text-xl font-extrabold text-gray-900 mt-1">{performanceData.slowQueries.length} Recorded</h4>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Slowest Endpoints list */}
                  <div className="bg-white/40 rounded-2xl border border-white/60 p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-950 mb-4 flex items-center">
                      <Server className="w-4 h-4 mr-2 text-blue-600" /> Slowest API Routes
                    </h3>
                    {performanceData.slowestEndpoints.length === 0 ? (
                      <p className="text-xs text-gray-400 p-10 text-center font-semibold">No slow route latency data registered.</p>
                    ) : (
                      <div className="divide-y divide-gray-150">
                        {performanceData.slowestEndpoints.map((ep, idx) => (
                          <div key={idx} className="py-3 flex justify-between items-center text-xs font-mono">
                            <span className="text-gray-700 font-semibold break-all">{ep.route}</span>
                            <span className="text-red-650 font-bold">{ep.maxLatency} ms</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Slow queries logs */}
                  <div className="bg-white/40 rounded-2xl border border-white/60 p-6 flex flex-col shadow-sm">
                    <h3 className="text-xs font-bold text-gray-950 mb-4 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" /> Latency Queries Log (Last 50)
                    </h3>
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2">
                      {performanceData.slowQueries.length === 0 ? (
                        <p className="text-xs text-gray-400 p-10 text-center font-semibold">No queries exceeded performance caps.</p>
                      ) : (
                        performanceData.slowQueries.map((q, index) => (
                          <div key={index} className="p-3 bg-white/60 rounded-xl border border-white/80 text-[10px] font-mono flex justify-between items-center">
                            <div className="truncate pr-4">
                              <span className="text-yellow-700 font-bold mr-2">{q.method}</span>
                              <span className="text-gray-700 break-all">{q.path}</span>
                              <p className="text-[8px] text-gray-400 mt-1">{new Date(q.timestamp).toLocaleString()}</p>
                            </div>
                            <span className="text-red-650 font-bold shrink-0">{q.durationMs} ms</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
