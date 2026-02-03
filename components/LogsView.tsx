
import React, { useState, useMemo, useEffect } from 'react';
import { 
  History, Search, Download, User, Activity, CheckCircle2, 
  Info, ShieldAlert, ChevronRight, Clock, Shield, Briefcase, 
  X, Terminal, Calendar, Layers, MousePointer2, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ActivityLog } from '../types';

export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'backoffice' | 'users'>('backoffice');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    // Inscrição Realtime para atualizações imediatas
    const channel = supabase.channel('audit_stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false });
    if (!error && data) setLogs(data);
    setLoading(false);
  };

  const formatLogDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}.${month}.${year} ás ${hours}:${minutes}`;
    } catch (e) {
      return dateString;
    }
  };

  const filteredLogs = useMemo(() => 
    logs.filter(log => {
      const author = log.user_name || 'Sistema';
      const role = log.user_role || '';
      const action = log.action || '';

      const isBackoffice = 
        role === 'MASTER_ADMIN' || 
        role === 'ADMIN' || 
        role === 'SUPORTE' || 
        role === 'SYSTEM' || 
        role === 'AUTOMATION' ||
        author === 'Backoffice Admin' ||
        author === 'Sistema';

      if (activeTab === 'backoffice' && !isBackoffice) return false;
      if (activeTab === 'users' && isBackoffice) return false;

      const matchesSearch = author.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          action.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || log.type === filterType;
      return matchesSearch && matchesType;
    }), [searchTerm, filterType, logs, activeTab]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase italic">Activity Stream</h2>
          <p className="text-slate-500 dark:text-gray-400 font-medium">Fluxo global de transações e auditoria em tempo real via Supabase.</p>
        </div>
        <button onClick={fetchLogs} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center space-x-2 shadow-sm">
          <History size={16} className={loading ? 'animate-spin' : ''} />
          <span>Sincronizar Fluxo</span>
        </button>
      </div>

      <div className="flex items-center space-x-6 border-b border-slate-200 dark:border-white/5 mb-6 px-2">
        <button
          onClick={() => setActiveTab('backoffice')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
            activeTab === 'backoffice' 
            ? 'text-blue-500 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-500' 
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Logs do Backoffice
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
            activeTab === 'users' 
            ? 'text-blue-500 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-500' 
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Logs Usuários
        </button>
      </div>

      <div className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden min-h-[500px]">
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar por autor ou ação..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 shadow-inner" 
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
            {['all', 'success', 'info', 'warning', 'critical'].map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                {t === 'all' ? 'TUDO' : t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading && logs.length === 0 ? (
             <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" /></div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/5">
                  <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Responsável</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Módulo</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Ação</th>
                  <th className="px-6 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer group" onClick={() => setSelectedLog(log)}>
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all font-black text-xs uppercase">{log.user_name?.charAt(0) || 'S'}</div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white text-xs leading-tight group-hover:text-blue-500 transition-colors">{log.user_name || 'Sistema'}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{log.user_role || 'AUTOMATION'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-500/10">{log.module}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                       <p className="font-black text-slate-900 dark:text-white text-xs">{log.action}</p>
                       <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter mt-0.5">{formatLogDate(log.timestamp)}</p>
                    </td>
                    <td className="px-6 py-3 text-right">
                       <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedLog && (
        <>
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedLog(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md z-[130] bg-white dark:bg-[#0A0D14] border-l border-slate-200 dark:border-white/5 shadow-[-30px_0_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-right duration-500 flex flex-col">
             <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.01]">
                <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/40"><History size={20} /></div>
                   <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Detalhes Auditoria</h3>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={20} /></button>
             </div>
             <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                <DetailBox label="Executado por" value={selectedLog.user_name || 'Sistema'} icon={User} />
                <DetailBox label="Módulo Afetado" value={selectedLog.module} icon={Layers} />
                <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-6 italic text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">"{selectedLog.details}"</div>
                <div className="bg-slate-100 dark:bg-black/40 rounded-2xl p-6 font-mono text-[10px] space-y-2 border border-slate-200 dark:border-white/5 shadow-inner">
                   <p className="text-slate-400 uppercase font-black tracking-widest mb-3">Metadados da Transação</p>
                   <p className="text-slate-500 dark:text-slate-600 truncate">ID_LOG: {selectedLog.id}</p>
                   <p className="text-blue-500 dark:text-blue-400">TIMESTAMP_UTC: {selectedLog.timestamp}</p>
                   <p className="text-slate-500 dark:text-slate-400 uppercase">Status: Sincronizado com Supabase Cloud</p>
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
};

const DetailBox: React.FC<{ label: string, value: string, icon: any }> = ({ label, value, icon: Icon }) => (
  <div className="space-y-1.5">
     <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</p>
     <div className="bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/5 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
        <Icon size={16} className="text-blue-500" />
        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{value}</span>
     </div>
  </div>
);
