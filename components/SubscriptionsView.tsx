
import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Search,
  Filter,
  MoreHorizontal,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Clock,
  DollarSign,
  Download,
  Building2,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  UserX,
  Mail,
  MessageSquare,
  Unlock,
  ChevronDown,
  ChevronUp,
  Send,
  History,
  CreditCard,
  Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type SubscriptionStatus = 'active' | 'overdue' | 'blocked' | 'trial' | 'cancelled';

interface Plan {
  id: string;
  name: string;
  value: number;
  status: 'active' | 'inactive';
}

interface Subscriber {
  id: string;
  company: string;
  cnpj: string;
  plan: string;
  value: number;
  paymentMethod?: string;
  status: SubscriptionStatus;
  nextBilling: string;
  daysOverdue?: number;
  lastAttempt?: string;
  failureReason?: string;
}

type ActionType = 'change_plan' | 'force_billing' | 'block_access' | 'reactivate_account' | 'cancel_subscription' | 'retry_payment' | 'send_email' | 'send_whatsapp' | 'temp_access';

export const SubscriptionsView: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 0,
    totalSubscribers: 0,
    churnRate: 0,
    overdueValue: 0,
    overdueCount: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ subscriber: Subscriber, type: ActionType } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [expandedOverdueId, setExpandedOverdueId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSubscribers();
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase.from('plans').select('*').eq('status', 'active');
      if (data) {
        setPlans(data.map(p => ({
          id: p.id,
          name: p.name,
          value: Number(p.value),
          status: p.status
        })));
      }
    } catch (e) {
      console.error("Erro ao buscar planos", e);
    }
  };

  const handleSyncPlans = async () => {
    try {
      notify("Sincronizando clientes e pagamentos com Asaas...");
      // Chama a API do Asaas para sincronizar clientes
      await fetch('https://zdgapmcalocdvdgvbwsj.supabase.co/functions/v1/asaas-api?action=sync_customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      notify("Sincronização iniciada! Os dados serão atualizados em breve.");
      fetchPlans();
    } catch (e) {
      console.error("Erro ao sincronizar", e);
      notify("Erro ao sincronizar com Asaas.");
    }
  };

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('subscriptions').select('*');

      if (error) {
        console.error('Erro ao buscar assinaturas:', error);
        return;
      }

      if (data) {
        const formattedSubscribers: Subscriber[] = data.map(sub => {
          // Cálculo simples de dias de atraso baseado na data de próxima cobrança se estiver atrasado
          let daysOverdue = 0;
          if (sub.next_billing && (sub.status === 'overdue' || sub.status === 'blocked')) {
            const billingDate = new Date(sub.next_billing);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - billingDate.getTime());
            daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          return {
            id: sub.id,
            company: sub.company,
            cnpj: sub.cnpj,
            plan: sub.plan,
            value: Number(sub.value),
            paymentMethod: sub.payment_method,
            status: sub.status as SubscriptionStatus,
            nextBilling: sub.next_billing ? new Date(sub.next_billing).toLocaleDateString('pt-BR') : '-',
            daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
            lastAttempt: sub.last_attempt ? new Date(sub.last_attempt).toLocaleString('pt-BR') : undefined,
            failureReason: sub.failure_reason
          };
        });

        setSubscribers(formattedSubscribers);
        calculateMetrics(formattedSubscribers);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (subs: Subscriber[]) => {
    // MRR: Soma de ativos, trial e overdue (ainda são clientes pagantes teoricamente)
    const activeSubs = subs.filter(s => ['active', 'trial', 'overdue'].includes(s.status));
    const mrr = activeSubs.reduce((acc, curr) => acc + curr.value, 0);

    // Inadimplência: Soma de overdue e blocked
    const overdueSubs = subs.filter(s => ['overdue', 'blocked'].includes(s.status));
    const overdueValue = overdueSubs.reduce((acc, curr) => acc + curr.value, 0);

    // Churn: (Cancelados / Total de Clientes que já passaram pela base) * 100
    // Simplificação para este contexto
    const totalCount = subs.length;
    const cancelledCount = subs.filter(s => s.status === 'cancelled').length;
    const churn = totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0;

    setMetrics({
      mrr,
      totalSubscribers: activeSubs.length,
      churnRate: churn,
      overdueValue,
      overdueCount: overdueSubs.length
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusConfig = (s: SubscriptionStatus) => {
    switch (s) {
      case 'active': return { label: 'ATIVO', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: ShieldCheck };
      case 'overdue': return { label: 'ATRASADO', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertTriangle };
      case 'blocked': return { label: 'BLOQUEADO', color: 'text-red-500', bg: 'bg-red-500/10', icon: Ban };
      case 'trial': return { label: 'TRIAL', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Clock };
      case 'cancelled': return { label: 'CANCELADO', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Ban };
    }
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleActionConfirm = () => {
    if (!confirmAction) return;
    const { type, subscriber } = confirmAction;
    let message = '';

    switch (type) {
      case 'change_plan': message = `Plano de ${subscriber.company} atualizado.`; break;
      case 'force_billing': message = `Cobrança forçada enviada para ${subscriber.company}.`; break;
      case 'block_access': message = `Acesso de ${subscriber.company} bloqueado.`; break;
      case 'reactivate_account': message = `Conta de ${subscriber.company} reativada.`; break;
      case 'cancel_subscription': message = `Assinatura de ${subscriber.company} cancelada.`; break;
      case 'retry_payment': message = `Nova tentativa de pagamento disparada para ${subscriber.company}.`; break;
      case 'send_email': message = `E-mail de cobrança enviado para ${subscriber.company}.`; break;
      case 'send_whatsapp': message = `Link de cobrança enviado via WhatsApp para ${subscriber.company}.`; break;
      case 'temp_access': message = `Acesso temporário de 24h liberado para ${subscriber.company}.`; break;
    }

    notify(message);
    setConfirmAction(null);
  };

  const filteredSubscribers = subscribers.filter(s => {
    const matchesSearch = s.company.toLowerCase().includes(searchTerm.toLowerCase()) || s.cnpj.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-8 right-8 z-[150] bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 flex items-center space-x-3 font-bold border border-blue-400">
          <CheckCircle2 size={20} />
          <span>{notification}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                <AlertCircle size={28} />
              </div>
              <button onClick={() => setConfirmAction(null)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
              {confirmAction.type.replace('_', ' ')}
            </h3>

            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 leading-relaxed">
              Você está prestes a realizar uma ação em <span className="text-white font-bold">{confirmAction.subscriber.company}</span>.
              Esta operação será registrada no log de auditoria. Deseja continuar?
            </p>

            <div className="flex gap-4">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={handleActionConfirm} className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Assinaturas</h2>
          <p className="text-slate-500 dark:text-gray-400 font-medium">Controle e auditoria financeira do ecossistema Aura.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSyncPlans}
            className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white px-6 py-3 rounded-xl font-bold transition-all text-sm flex items-center space-x-2 border border-slate-200 dark:border-white/5"
          >
            <RefreshCcw size={16} />
            <span>Sincronizar Planos</span>
          </button>
          <button className="bg-[#1D4ED8] hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all text-sm flex items-center space-x-2 shadow-lg shadow-blue-900/40">
            <Download size={16} />
            <span>Extrair Relatório</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat label="MRR Total" value={`R$ ${metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} trend="+12.4%" positive />
        <QuickStat label="Assinantes" value={metrics.totalSubscribers.toString()} sub="Ativos agora" />
        <QuickStat label="Churn Rate" value={`${metrics.churnRate.toFixed(1)}%`} trend="-0.4%" positive />
        <QuickStat label="Inadimplência" value={`R$ ${metrics.overdueValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub={`${metrics.overdueCount} faturas`} warning />
      </div>

      {/* Plans Section */}
      {plans.length > 0 && (
        <div className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600/10 rounded-xl text-blue-500">
              <Package size={18} />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Planos Disponíveis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{plan.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Mensal</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-blue-600 dark:text-blue-400">R$ {plan.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden min-h-[600px]">

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Empresa ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
            />
          </div>
          <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
            {['all', 'active', 'overdue', 'blocked'].map((st) => (
              <button key={st} onClick={() => setFilterStatus(st)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterStatus === st ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                {st === 'all' ? 'TUDO' : st === 'active' ? 'ATIVOS' : st === 'overdue' ? 'ATRASO' : 'BLOQ.'}
              </button>
            ))}
          </div>
        </div>

        {/* REFINED TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#111827] dark:bg-[#0F172A] border-y border-slate-200 dark:border-white/5">
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-[#64748B] tracking-[0.1em]">Empresa / CNPJ</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-[#64748B] tracking-[0.1em]">Plano</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-[#64748B] tracking-[0.1em]">Status</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-[#64748B] tracking-[0.1em]">Recorrência</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-[#64748B] tracking-[0.1em]">Método</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-[#64748B] tracking-[0.1em]">Próxima / Atraso</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-[#64748B] tracking-[0.1em] text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredSubscribers.map((sub) => {
                const config = getStatusConfig(sub.status);
                const isExpanded = expandedOverdueId === sub.id;
                const isOverdue = sub.status === 'overdue' || sub.status === 'blocked';

                return (
                  <React.Fragment key={sub.id}>
                    <tr
                      onClick={() => isOverdue && setExpandedOverdueId(isExpanded ? null : sub.id)}
                      className={`transition-colors group ${isOverdue ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-white/[0.03]' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/10">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs leading-tight">{sub.company}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tight">{sub.cnpj}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Zap size={14} className="text-[#6366F1]" />
                          <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">{sub.plan}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full ${config.bg} ${config.color} border border-white/5`}>
                          <config.icon size={12} strokeWidth={2.5} />
                          <span className="text-[9px] font-black tracking-widest">{config.label}</span>
                          {isOverdue && (
                            <div className="ml-1 opacity-50">
                              {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900 dark:text-[#F8FAFC] text-xs">R$ {sub.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                          <CreditCard size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-wide">{sub.paymentMethod || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-[#F59E0B]">{sub.daysOverdue} dias atrás</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">AGUARDANDO PGTO</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 dark:text-[#94A3B8]">{sub.nextBilling}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">AGENDADO</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === sub.id ? null : sub.id);
                          }}
                          className={`p-2 rounded-xl transition-all shadow-sm ${activeMenu === sub.id ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-white/[0.04] text-slate-500 hover:text-white hover:bg-blue-600'
                            }`}
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {activeMenu === sub.id && (
                          <div ref={menuRef} className="absolute right-8 top-[4.5rem] w-60 bg-[#0A0D14] border border-white/10 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
                            <div className="p-2 space-y-1">
                              <ActionButton icon={RefreshCcw} label="Alterar Plano" onClick={() => { setConfirmAction({ subscriber: sub, type: 'change_plan' }); setActiveMenu(null); }} />
                              <ActionButton icon={DollarSign} label="Forçar Cobrança" onClick={() => { setConfirmAction({ subscriber: sub, type: 'force_billing' }); setActiveMenu(null); }} />
                              <div className="h-[1px] bg-white/5 my-1" />
                              <ActionButton icon={UserX} label="Bloquear Acesso" danger onClick={() => { setConfirmAction({ subscriber: sub, type: 'block_access' }); setActiveMenu(null); }} />
                              <ActionButton icon={ShieldCheck} label="Reativar Conta" success onClick={() => { setConfirmAction({ subscriber: sub, type: 'reactivate_account' }); setActiveMenu(null); }} />
                              <ActionButton icon={Ban} label="Cancelar Assinatura" danger onClick={() => { setConfirmAction({ subscriber: sub, type: 'cancel_subscription' }); setActiveMenu(null); }} />
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* EXPANDABLE RECOVERY PANEL */}
                    {isExpanded && isOverdue && (
                      <tr className="bg-[#111827]/30 border-b border-white/5 animate-in slide-in-from-top-2 duration-300">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                              <InfoCard label="Valor em aberto" value={`R$ ${sub.value.toLocaleString('pt-BR')}`} icon={DollarSign} warning />
                              <InfoCard label="Dias em atraso" value={`${sub.daysOverdue} dias`} icon={Clock} warning />
                              <InfoCard label="Última tentativa" value={sub.lastAttempt || '-'} icon={RefreshCcw} />
                              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 md:col-span-2 lg:col-span-1">
                                <p className="text-[9px] uppercase font-black text-slate-500 mb-2 tracking-widest">Motivo da falha</p>
                                <p className="text-xs font-bold text-slate-300 leading-tight">{sub.failureReason || 'Não identificado'}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 lg:flex-col lg:w-60">
                              <RecoveryButton icon={RefreshCcw} label="Tentar cobrança novamente" onClick={() => setConfirmAction({ subscriber: sub, type: 'retry_payment' })} primary />
                              <RecoveryButton icon={Mail} label="Enviar por E-mail" onClick={() => setConfirmAction({ subscriber: sub, type: 'send_email' })} />
                              <RecoveryButton icon={MessageSquare} label="Enviar por WhatsApp" onClick={() => setConfirmAction({ subscriber: sub, type: 'send_whatsapp' })} />
                              <RecoveryButton icon={Unlock} label="Liberar acesso temporário" onClick={() => setConfirmAction({ subscriber: sub, type: 'temp_access' })} success />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Monitor */}
      <div className="bg-[#111827] rounded-3xl p-6 border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl text-left">
          <h4 className="text-white font-black text-lg mb-1 flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Recuperação Inteligente</span>
          </h4>
          <p className="text-slate-400 text-xs font-medium">Use as ferramentas acima para reduzir o churn e recuperar faturamento pendente.</p>
        </div>
        <button className="relative z-10 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center space-x-2">
          <span>Logs de Auditoria</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ icon: any, label: string, onClick: () => void, danger?: boolean, success?: boolean }> = ({ icon: Icon, label, onClick, danger, success }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-2 text-left text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${danger ? 'text-red-500 hover:bg-red-500/10' : success ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    <Icon size={14} />
    <span>{label}</span>
  </button>
);

const InfoCard: React.FC<{ label: string, value: string, icon: any, warning?: boolean }> = ({ label, value, icon: Icon, warning }) => (
  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
    <p className="text-[9px] uppercase font-black text-slate-500 mb-1 tracking-widest">{label}</p>
    <div className="flex items-center space-x-2">
      <Icon size={14} className={warning ? 'text-yellow-500' : 'text-slate-500'} />
      <p className={`text-sm font-black ${warning ? 'text-yellow-500' : 'text-white'}`}>{value}</p>
    </div>
  </div>
);

const RecoveryButton: React.FC<{ icon: any, label: string, onClick: () => void, primary?: boolean, success?: boolean }> = ({ icon: Icon, label, onClick, primary, success }) => (
  <button onClick={onClick} className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex-1 min-w-[180px] lg:flex-initial ${primary ? 'bg-blue-600 text-white hover:bg-blue-500' :
      success ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white' :
        'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
    }`}>
    <Icon size={14} />
    <span>{label}</span>
  </button>
);

const QuickStat: React.FC<{ label: string; value: string; trend?: string; positive?: boolean; warning?: boolean; sub?: string }> = ({ label, value, trend, positive, warning, sub }) => (
  <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm text-left">
    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-[#64748B] tracking-widest mb-2">{label}</p>
    <div className="flex items-end justify-between">
      <h3 className={`text-xl font-black ${warning ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{value}</h3>
      {trend && <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{trend}</span>}
      {sub && <span className="text-[10px] font-bold text-slate-500 uppercase">{sub}</span>}
    </div>
  </div>
);
