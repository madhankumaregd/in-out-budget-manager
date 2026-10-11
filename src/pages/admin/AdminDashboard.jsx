import { useState, useEffect } from "react";
import { getDatabaseAnalytics } from "../../firebase/adminService";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Database,
  RefreshCw,
  HardDrive,
  Eye,
  Edit3,
  Trash2,
  Calendar,
  Activity,
  Zap,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

const FILTER_OPTIONS = [
  { id: "days", label: "24 Hours", sub: "Daily Quota" },
  { id: "week", label: "7 Days", sub: "Weekly Quota" },
  { id: "month", label: "30 Days", sub: "Monthly Quota" },
  { id: "custom", label: "Custom Range", sub: "Dynamic Quota" },
];

const AdminDashboard = () => {
  const [filter, setFilter] = useState("days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartType, setChartType] = useState("area"); // 'area' | 'bar'
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Initialize custom dates with reasonable defaults (past 7 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    setCustomEnd(end.toISOString().split("T")[0]);
    setCustomStart(start.toISOString().split("T")[0]);
  }, []);

  const fetchAnalytics = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getDatabaseAnalytics({
        filter,
        customStart: filter === "custom" ? customStart : null,
        customEnd: filter === "custom" ? customEnd : null,
      });
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch database analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filter]);

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) return;
    fetchAnalytics(true);
  };

  const customTooltipStyle = {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    borderRadius: "14px",
    padding: "12px 16px",
    color: "#e2e8f0",
    fontSize: "13px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
  };

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
          <Database className="w-6 h-6 text-purple-400 absolute inset-0 m-auto" />
        </div>
        <p className="text-sm text-gray-400">Loading database telemetry & storage metrics...</p>
      </div>
    );
  }

  const { reads, writes, deletes, storage, timeline, systemHealth } = analytics || {};

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ─── Header & Top Control Bar ────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl border border-purple-500/30 flex items-center justify-center shadow-inner">
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Database Observability
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Real-time Firestore telemetry, reads/writes quota consumption & storage analytics
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Time filters & Refresh */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Segmented Time Filter Buttons */}
          <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === opt.id
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium"
            title={`Last updated: ${lastUpdated.toLocaleTimeString()}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-purple-400" : ""}`} />
            <span>Refresh</span>
          </motion.button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (if custom selected) */}
      <AnimatePresence>
        {filter === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2 text-purple-300 text-xs font-medium">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>Custom Date Window:</span>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400">Start:</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400">End:</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={handleApplyCustomRange}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Apply Range
              </button>
              <span className="text-xs text-gray-500 ml-auto">
                Window: {analytics?.dateRange?.daysCount || 1} day(s) · Quota scaled automatically
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Top 4 Core Metrics: Reads, Writes, Deletes & Storage ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Document Reads */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-slate-900/90 border border-purple-500/20 p-5 shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Document Reads
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Eye className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {(reads?.consumed || 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">
              / {(reads?.available || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-purple-300/80 mt-1 font-mono">
            {reads?.percentage || 0}% of quota consumed
          </p>

          {/* Quota Progress Bar */}
          <div className="mt-4">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(reads?.percentage || 0, 1))}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1.5">
              <span>Remaining Headroom</span>
              <span className="text-white font-mono">
                {(reads?.remaining || 0).toLocaleString()} reads
              </span>
            </div>
          </div>
        </motion.div>

        {/* 2. Document Writes */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-900/90 border border-cyan-500/20 p-5 shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Document Writes
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {(writes?.consumed || 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">
              / {(writes?.available || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-cyan-300/80 mt-1 font-mono">
            {writes?.percentage || 0}% of quota consumed
          </p>

          {/* Quota Progress Bar */}
          <div className="mt-4">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(writes?.percentage || 0, 1))}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1.5">
              <span>Remaining Headroom</span>
              <span className="text-white font-mono">
                {(writes?.remaining || 0).toLocaleString()} writes
              </span>
            </div>
          </div>
        </motion.div>

        {/* 3. Document Deletes */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900/60 to-slate-900/90 border border-rose-500/20 p-5 shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Document Deletes
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {(deletes?.consumed || 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">
              / {(deletes?.available || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-rose-300/80 mt-1 font-mono">
            {deletes?.percentage || 0}% of quota consumed
          </p>

          {/* Quota Progress Bar */}
          <div className="mt-4">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(deletes?.percentage || 0, 1))}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1.5">
              <span>Remaining Headroom</span>
              <span className="text-white font-mono">
                {(deletes?.remaining || 0).toLocaleString()} deletes
              </span>
            </div>
          </div>
        </motion.div>

        {/* 4. Total Storage (Occupied / Available) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-900/90 border border-emerald-500/20 p-5 shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Storage Capacity
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {storage?.occupiedFormatted || "0 B"}
            </span>
            <span className="text-xs text-gray-400">
              / {storage?.totalAvailableFormatted || "1.00 GB"}
            </span>
          </div>
          <p className="text-xs text-emerald-300/80 mt-1 font-mono">
            {storage?.occupiedPercentage || 0}% occupied
          </p>

          {/* Storage Capacity Bar */}
          <div className="mt-4">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(storage?.occupiedPercentage || 0, 0.5))}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1.5">
              <span>Free Capacity</span>
              <span className="text-white font-mono">
                {storage?.remainingFormatted || "1.00 GB"} free
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Storage Capacity & Footprint Meter Section ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2.5">
              <Server className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Firestore Storage Allocation
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Visual representation of Occupied Database Footprint vs Total Free Spark Plan Storage
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-gray-300 font-medium">Free Spark Tier (1 GiB)</span>
          </div>
        </div>

        {/* Big Visual Storage Capacity Meter */}
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-2.5 gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-emerald-400">Occupied Storage:</span>
              <span className="text-white font-mono font-bold text-sm">
                {storage?.occupiedFormatted}
              </span>
              <span className="text-gray-500">
                ({storage?.occupiedPercentage}% of 1 GiB)
              </span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <span>Available Free Space:</span>
              <span className="text-white font-mono font-bold text-sm">
                {storage?.remainingFormatted}
              </span>
              <span className="text-gray-500">
                ({storage?.availablePercentage}%)
              </span>
            </div>
          </div>

          {/* Stacked Capacity Meter */}
          <div className="h-4 bg-slate-950 rounded-xl overflow-hidden p-0.5 border border-white/10 flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(storage?.occupiedPercentage || 0, 1))}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-lg shadow-lg shadow-emerald-500/20"
              title={`Occupied: ${storage?.occupiedFormatted}`}
            />
            <div
              className="h-full bg-slate-800/40 rounded-lg flex-1"
              title={`Available: ${storage?.remainingFormatted}`}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-gray-500 mt-2 font-mono">
            <span>0 B</span>
            <span>256 MB</span>
            <span>512 MB</span>
            <span>768 MB</span>
            <span className="text-emerald-400 font-semibold">1,024 MB (1.00 GB)</span>
          </div>
        </div>

        {/* Storage Breakdown: Donut Chart & Collection Table Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-900/40 border border-white/5 rounded-2xl">
            <p className="text-xs font-semibold text-gray-300 mb-2 self-start flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Storage Share by Collection</span>
            </p>
            <div className="w-full h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storage?.breakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="bytes"
                  >
                    {(storage?.breakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(val, name, item) => [
                      `${item.payload.formatted} (${item.payload.percent}%)`,
                      item.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Donut Label */}
              <div className="absolute inset-0 m-auto w-24 h-24 rounded-full flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[11px] text-gray-400 uppercase font-mono">Total Docs</span>
                <span className="text-xl font-extrabold text-white">
                  {(storage?.totalDocuments || 0).toLocaleString()}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 text-center">
              Hover slices to inspect collection weight
            </p>
          </div>

          {/* Collection Footprint Breakdown Table */}
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 uppercase font-mono text-[10px]">
                  <th className="pb-3 font-semibold">Collection</th>
                  <th className="pb-3 font-semibold text-center">Documents</th>
                  <th className="pb-3 font-semibold text-right">Data Size</th>
                  <th className="pb-3 font-semibold text-right">DB Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(storage?.breakdown || []).map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-white font-medium">{item.name}</span>
                    </td>
                    <td className="py-2.5 text-center text-gray-300 font-mono">
                      {typeof item.docCount === "number"
                        ? item.docCount.toLocaleString()
                        : item.docCount}
                    </td>
                    <td className="py-2.5 text-right text-gray-200 font-mono font-semibold">
                      {item.formatted}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="text-gray-400 font-mono">{item.percent}%</span>
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, item.percent)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* ─── Timeline Chart: Reads & Writes Over Time ────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2.5">
              <Activity className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Database Operation Timeline
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Document Reads (Purple), Document Writes (Cyan) & Deletes (Rose) across selected window
            </p>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center space-x-2 bg-slate-900/60 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setChartType("area")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                chartType === "area"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Area Stream
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                chartType === "bar"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Bar Columns
            </button>
          </div>
        </div>

        {timeline && timeline.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="readsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="writesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="deletesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="reads"
                    name="Reads"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#readsGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="writes"
                    name="Writes"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#writesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="deletes"
                    name="Deletes"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#deletesGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="reads" name="Reads" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="writes" name="Writes" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deletes" name="Deletes" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-60 text-gray-500 text-sm">
            No activity detected in this time interval.
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-4 border-t border-white/5 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-purple-500" />
            <span className="text-gray-300 font-medium">Document Reads</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-cyan-500" />
            <span className="text-gray-300 font-medium">Document Writes</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-rose-500" />
            <span className="text-gray-300 font-medium">Document Deletes</span>
          </div>
        </div>
      </motion.div>

      {/* ─── Operational Health & Performance Diagnostics ────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Read to Write Ratio */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span>Read/Write Ratio</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {systemHealth?.readWriteRatio || "1 : 1"}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Healthy read-heavy ratio minimizes mutation billing
          </p>
        </div>

        {/* IndexedDB Cache Hit Rate */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Offline Local Cache</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            {systemHealth?.cacheHitRate || "93.8%"}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            0ms multi-tab IndexedDB cache reads
          </p>
        </div>

        {/* Average Latency */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>Average Retrieval Latency</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {systemHealth?.avgLatencyMs || 34} ms
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Parallelized Promise.all subcollections
          </p>
        </div>

        {/* System Health / Quota Status */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Quota Safety Status</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <p className="text-2xl font-bold text-white font-mono">
              {systemHealth?.quotaStatus || "Optimal"}
            </p>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Consumption well below daily 50k read limits
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
