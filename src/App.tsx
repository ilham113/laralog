import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  Upload, 
  FileText, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  X, 
  BarChart3, 
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Filter,
  Trash2,
  Copy,
  Check,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { parseLaravelLogs, getFrequencies, type LaravelLog, type LogFrequency } from './lib/logParser';
import { cn } from './lib/utils';

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  INFO: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  NOTICE: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  WARNING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  ERROR: 'text-red-400 bg-red-400/10 border-red-400/20',
  CRITICAL: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  ALERT: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  EMERGENCY: 'text-fuchsia-600 bg-fuchsia-600/10 border-fuchsia-600/20',
};

const CHART_COLORS: Record<string, string> = {
  DEBUG: '#94a3b8',
  INFO: '#60a5fa',
  NOTICE: '#22d3ee',
  WARNING: '#fbbf24',
  ERROR: '#f87171',
  CRITICAL: '#f43f5e',
  ALERT: '#a855f7',
  EMERGENCY: '#c026d3',
};

const LEVEL_PRIORITY: Record<string, number> = {
  EMERGENCY: 7,
  ALERT: 6,
  CRITICAL: 5,
  ERROR: 4,
  WARNING: 3,
  NOTICE: 2,
  INFO: 1,
  DEBUG: 0,
};

export default function App() {
  const [logs, setLogs] = useState<LaravelLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'frequency'>('table');
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'timestamp' | 'level'; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });

  const frequencies = useMemo(() => getFrequencies(logs), [logs]);

  const filteredAndSortedLogs = useMemo(() => {
    const filtered = logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           log.timestamp.includes(searchTerm);
      const matchesLevel = !selectedLevel || log.level === selectedLevel;
      return matchesSearch && matchesLevel;
    });

    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'timestamp') {
        return sortConfig.direction === 'asc' 
          ? a.timestamp.localeCompare(b.timestamp)
          : b.timestamp.localeCompare(a.timestamp);
      }
      
      if (sortConfig.key === 'level') {
        const priorityA = LEVEL_PRIORITY[a.level] ?? -1;
        const priorityB = LEVEL_PRIORITY[b.level] ?? -1;
        return sortConfig.direction === 'asc' 
          ? priorityA - priorityB
          : priorityB - priorityA;
      }
      
      return 0;
    });
  }, [logs, searchTerm, selectedLevel, sortConfig]);

  const requestSort = (key: 'timestamp' | 'level') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseLaravelLogs(content);
      setLogs(parsed);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseLaravelLogs(content);
      setLogs(parsed);
    };
    reader.readAsText(file);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseLaravelLogs(text);
      if (parsed.length > 0) {
        setLogs(parsed);
      }
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  }, []);

  const clearLogs = () => {
    setLogs([]);
    setSearchTerm('');
    setSelectedLevel(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">LaraLog <span className="text-slate-500 font-normal italic">Insight</span></h1>
          </div>
          
          {logs.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                <button 
                  onClick={() => setView('table')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                    view === 'table' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Logs
                </button>
                <button 
                  onClick={() => setView('frequency')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                    view === 'frequency' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Frequency
                </button>
              </div>
              <button 
                onClick={clearLogs}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Clear logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {logs.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto mt-20"
            >
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "relative group border-2 border-dashed rounded-3xl p-12 flex flex-col items-center text-center transition-all duration-300",
                  isDragging ? "border-blue-500 bg-blue-500/5 scale-105" : "border-white/10 bg-white/2 hover:border-white/20"
                )}
              >
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Analyze Laravel Logs</h2>
                <p className="text-slate-400 mb-8 max-w-sm">
                  Drag and drop your <code className="text-blue-400 font-mono">laravel.log</code> file here, or paste the content directly.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
                  <label className="flex-1 bg-white text-black font-medium px-6 py-3 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors text-center">
                    Select File
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".log,text/plain" />
                  </label>
                  <button 
                    onClick={handlePaste}
                    className="flex-1 bg-white/5 border border-white/10 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Paste Content
                  </button>
                </div>

                {isDragging && (
                  <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm rounded-3xl flex items-center justify-center pointer-events-none">
                    <p className="text-blue-400 font-bold text-xl">Drop it like it's hot</p>
                  </div>
                )}
              </div>
              
              <div className="mt-12 grid grid-cols-3 gap-6">
                {[
                  { icon: AlertCircle, label: 'Error Grouping', desc: 'Identify recurring issues instantly' },
                  { icon: BarChart3, label: 'Visual Trends', desc: 'See error spikes over time' },
                  { icon: Filter, label: 'Deep Filter', desc: 'Search by level, date, or message' },
                ].map((feature, i) => (
                  <div key={i} className="text-center">
                    <feature.icon className="w-5 h-5 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-sm font-medium mb-1">{feature.label}</h3>
                    <p className="text-xs text-slate-500">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Total Entries</p>
                  <p className="text-3xl font-light">{logs.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Unique Errors</p>
                  <p className="text-3xl font-light">{frequencies.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Error Level</p>
                  <p className="text-3xl font-light text-red-400">
                    {logs.filter(l => ['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'].includes(l.level)).length}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Warning Level</p>
                  <p className="text-3xl font-light text-amber-400">
                    {logs.filter(l => l.level === 'WARNING').length}
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/2 border border-white/5 p-4 rounded-2xl">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                  {['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'].map(level => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap",
                        selectedLevel === level 
                          ? LEVEL_COLORS[level] 
                          : "border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main View */}
              <div className="bg-white/2 border border-white/5 rounded-2xl overflow-hidden">
                {view === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/2">
                          <th 
                            className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48 cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() => requestSort('timestamp')}
                          >
                            <div className="flex items-center gap-2">
                              Timestamp
                              {sortConfig.key === 'timestamp' ? (
                                sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                              ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                            </div>
                          </th>
                          <th 
                            className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32 cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() => requestSort('level')}
                          >
                            <div className="flex items-center gap-2">
                              Level
                              {sortConfig.key === 'level' ? (
                                sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                              ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredAndSortedLogs.length > 0 ? (
                          filteredAndSortedLogs.map((log) => (
                            <React.Fragment key={log.id}>
                              <tr 
                                className={cn(
                                  "group hover:bg-white/5 transition-colors cursor-pointer",
                                  expandedLog === log.id && "bg-white/5"
                                )}
                                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                              >
                                <td className="px-6 py-4 text-xs font-mono text-slate-400">{log.timestamp}</td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold border",
                                    LEVEL_COLORS[log.level]
                                  )}>
                                    {log.level}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-slate-300 line-clamp-1 group-hover:line-clamp-none transition-all">
                                    {log.message.split('\n')[0]}
                                  </p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {expandedLog === log.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                </td>
                              </tr>
                              <AnimatePresence>
                                {expandedLog === log.id && (
                                  <tr>
                                    <td colSpan={4} className="px-6 py-0">
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="py-6 space-y-4">
                                          <div className="bg-black/60 rounded-xl p-4 border border-white/10">
                                            <div className="flex justify-between items-start mb-2">
                                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Message</span>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigator.clipboard.writeText(log.raw);
                                                  setCopied(true);
                                                  setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className="text-slate-500 hover:text-white transition-colors"
                                              >
                                                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                              </button>
                                            </div>
                                            <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-all leading-relaxed">
                                              {log.message}
                                            </pre>
                                          </div>
                                          
                                          {log.context && (
                                            <div className="bg-black/60 rounded-xl p-4 border border-white/10">
                                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Context</span>
                                              <pre className="text-xs font-mono text-blue-400/80 whitespace-pre-wrap break-all">
                                                {JSON.stringify(JSON.parse(log.context), null, 2)}
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    </td>
                                  </tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-20 text-center text-slate-500">
                              <Search className="w-8 h-8 mx-auto mb-4 opacity-20" />
                              <p>No logs found matching your criteria</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 space-y-12">
                    {/* Frequency Chart */}
                    <div className="h-[400px] w-full">
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Top Recurring Issues</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={frequencies.slice(0, 10)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis 
                            dataKey="message" 
                            type="category" 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            width={150}
                            tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + '...' : val}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            cursor={{ fill: '#ffffff05' }}
                            contentStyle={{ 
                              backgroundColor: '#1a1a1a', 
                              borderColor: '#ffffff10',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                          />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                            {frequencies.slice(0, 10).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.level] || '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Frequency List */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Frequency Breakdown</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {frequencies.map((freq, i) => (
                          <div 
                            key={i} 
                            className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 transition-colors group"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border",
                                LEVEL_COLORS[freq.level]
                              )}>
                                {freq.count}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate pr-4">{freq.message}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{freq.level}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setSearchTerm(freq.message);
                                setView('table');
                              }}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-400 hover:text-white transition-all"
                            >
                              View Occurrences
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center">
        <p className="text-xs text-slate-600">
          LaraLog Insight • Professional Log Analysis Tool
        </p>
      </footer>
    </div>
  );
}
