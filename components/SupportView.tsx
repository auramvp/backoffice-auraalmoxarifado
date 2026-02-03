
import React, { useState, useEffect } from 'react';
import { 
  Headphones, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  MessageSquare,
  User,
  Building2,
  Calendar,
  Filter,
  MoreVertical,
  X,
  Send,
  History
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SupportTicket } from '../types';

export const SupportView: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Em aberto' | 'Em andamento' | 'Resolvido'>('all');
  const [resolutionText, setResolutionText] = useState('');
  
  const [currentUser, setCurrentUser] = useState({ name: '', role: '' });

  useEffect(() => {
    fetchTickets();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Prioridade 1: Buscar do perfil público (tabela profiles)
        let name = null;
        let role = null;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', user.id)
          .single();

        if (profile) {
            name = profile.name;
            role = profile.role;
        }

        // Prioridade 2: Metadados do Auth
        if (!name) {
             name = user.user_metadata?.name;
             role = user.user_metadata?.role;
        }
        
        setCurrentUser({ 
            name: name || 'Usuário Backoffice', 
            role: role || 'ADMIN'
        });
      }
    } catch (error) {
      console.error("Error fetching current user profile:", error);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    // Tenta buscar da tabela support_tickets. Se não existir, usa dados mockados para demonstração inicial.
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTickets(data);
      } else {
        console.error("Erro ao buscar tickets:", error);
        // Se der erro, não mostra dados falsos, apenas loga e mantém lista vazia ou estado anterior
      }
    } catch (err) {
      console.error("Erro ao buscar tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticket: SupportTicket, newStatus: 'Em andamento' | 'Resolvido') => {
    try {
      const updates: any = { status: newStatus };
      const now = new Date().toISOString();

      if (newStatus === 'Em andamento') {
        updates.started_at = now;
        updates.started_by = currentUser.name;
      } else if (newStatus === 'Resolvido') {
        updates.resolved_at = now;
        updates.resolved_by = currentUser.name;
        updates.resolution = resolutionText;
      }

      // Atualizar no Supabase
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticket.id);

      if (error) {
        // Se der erro (ex: tabela não existe), atualiza apenas localmente para demonstração
        console.warn("Erro ao atualizar no Supabase, atualizando localmente:", error);
      }

      // Log da ação (não bloqueante)
      // TODO: Descomentar quando a tabela activity_logs for criada
      /*
      try {
        await supabase.from('activity_logs').insert([{
          user_name: currentUser.name,
          user_role: 'ADMIN', // Ajustar conforme necessário
          action: `Ticket ${newStatus}`,
          details: `Ticket #${String(ticket.id).substring(0,8)} alterado para ${newStatus}.`,
          module: 'SUPPORT',
          type: 'info',
          timestamp: now
        }]);
      } catch (logError) {
        console.warn("Erro ao registrar log:", logError);
      }
      */

      // Atualizar estado local
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ...updates } : t));
      
      if (newStatus === 'Resolvido') {
        setSelectedTicket(null);
        setResolutionText('');
      } else {
        // Se mudou para em andamento, atualiza o ticket selecionado também
        setSelectedTicket(prev => prev ? { ...prev, ...updates } : null);
      }

    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em aberto': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Em andamento': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Resolvido': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight uppercase italic">Suporte ao Cliente</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium tracking-tight">Gerenciamento de chamados e solicitações de suporte.</p>
        </div>
        
        <div className="flex items-center space-x-2 bg-white dark:bg-[#0A0D14] p-1 rounded-xl border border-slate-200 dark:border-white/5">
          {['all', 'Em aberto', 'Em andamento', 'Resolvido'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === status 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {status === 'all' ? 'Todos' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
                <MessageSquare size={40} className="text-blue-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Chamados</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{tickets.length}</h3>
        </div>

        <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 relative overflow-hidden group hover:border-yellow-500/30 transition-all">
            <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertCircle size={40} className="text-yellow-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Em Aberto</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter text-yellow-500">{tickets.filter(t => t.status === 'Em aberto').length}</h3>
        </div>

        <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock size={40} className="text-blue-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Em Andamento</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter text-blue-500">{tickets.filter(t => t.status === 'Em andamento').length}</h3>
        </div>

        <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resolvidos</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter text-emerald-500">{tickets.filter(t => t.status === 'Resolvido').length}</h3>
        </div>
      </div>

      {/* Lista de Tickets */}
      <div className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
        {/* Barra de Busca */}
        <div className="p-5 border-b border-slate-100 dark:border-white/5">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por usuário, empresa ou descrição..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-medium text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando chamados...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center">
              <MessageSquare size={32} className="opacity-50" />
            </div>
            <p className="font-medium text-sm">Nenhum chamado encontrado.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-[#0F172A] z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Data/Hora</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Solicitante</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Descrição</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all group cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(ticket.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <User size={12} className="text-blue-500" />
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{ticket.user_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <Building2 size={10} />
                          <span>{ticket.company_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                        {ticket.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedTicket(null)}
          />
          
          {/* Drawer Lateral */}
          <div className="relative w-full max-w-md bg-white dark:bg-[#0A0D14] h-full shadow-2xl border-l border-white/10 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-[#0F172A]/50">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{String(selectedTicket.id).substring(0, 8)}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Detalhes do Chamado</h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Informações do Solicitante */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Solicitante</label>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-[9px]">
                      {selectedTicket.user_name.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{selectedTicket.user_name}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Empresa</label>
                  <div className="flex items-center gap-2">
                    <Building2 size={12} className="text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{selectedTicket.company_name}</span>
                  </div>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data de Abertura</label>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <Calendar size={12} />
                    {new Date(selectedTicket.created_at).toLocaleDateString('pt-BR')} às {new Date(selectedTicket.created_at).toLocaleTimeString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare size={12} className="text-blue-500" />
                  Descrição da Solicitação
                </h4>
                <div className="p-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5">
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>

              {/* Histórico / Andamento */}
              {(selectedTicket.started_at || selectedTicket.resolved_at) && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <History size={12} className="text-purple-500" />
                    Linha do Tempo
                  </h4>
                  <div className="space-y-3 relative pl-4 border-l-2 border-slate-100 dark:border-white/5 ml-1.5">
                    {selectedTicket.started_at && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-[#0A0D14]" />
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white">Em andamento</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Iniciado por <strong className="text-slate-700 dark:text-slate-300">{selectedTicket.started_by}</strong> em {new Date(selectedTicket.started_at).toLocaleString('pt-BR')}</p>
                      </div>
                    )}
                    {selectedTicket.resolved_at && (
                      <div className="relative pt-2">
                        <div className="absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0A0D14]" />
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white">Resolvido</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Finalizado por <strong className="text-slate-700 dark:text-slate-300">{selectedTicket.resolved_by}</strong> em {new Date(selectedTicket.resolved_at).toLocaleString('pt-BR')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resolução (se resolvido) */}
              {selectedTicket.status === 'Resolvido' && selectedTicket.resolution && (
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Detalhes da Resolução
                  </h4>
                  <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.resolution}
                    </p>
                  </div>
                </div>
              )}

              {/* Ações de Resolução */}
              {selectedTicket.status !== 'Resolvido' && (
                <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                   <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Ações</h4>
                   
                   {selectedTicket.status === 'Em aberto' ? (
                     <button 
                       onClick={() => handleStatusChange(selectedTicket, 'Em andamento')}
                       className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                     >
                       <Clock size={16} />
                       Iniciar Atendimento
                     </button>
                   ) : (
                     <div className="space-y-3">
                       <div>
                         <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição da Solução</label>
                         <textarea 
                           className="w-full h-24 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none font-medium resize-none"
                           placeholder="Descreva o que foi feito para resolver o problema..."
                           value={resolutionText}
                           onChange={(e) => setResolutionText(e.target.value)}
                         ></textarea>
                       </div>
                       <button 
                         onClick={() => handleStatusChange(selectedTicket, 'Resolvido')}
                         disabled={!resolutionText.trim()}
                         className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                       >
                         <CheckCircle2 size={16} />
                         Finalizar Chamado
                       </button>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
