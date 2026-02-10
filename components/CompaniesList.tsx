
import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2, MapPin, Phone, Mail, Users, CreditCard, PauseCircle, Info,
  ChevronRight, ArrowLeft, Shield, Download, ExternalLink, Settings,
  AlertTriangle, FileText, CheckCircle2, Clock, DollarSign, Activity,
  Package, User, ArrowRightLeft, Zap, Search, LayoutGrid, List as ListIcon,
  Ban, RefreshCcw, MoreVertical, X, PlayCircle, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const CompaniesList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*, profiles(id), plans(name)')
        .order('name');

      if (!error && data) {
        const companiesWithCounts = data.map((company: any) => ({
          ...company,
          // Garantir que status sempre tenha um valor mesmo se a coluna for nula
          status: company.status || 'Ativo',
          users_count: company.profiles?.length || 0,
          plan: company.plans?.name || company.plan || 'Standard'
        }));
        setCompanies(companiesWithCounts);
      }
    } catch (err) {
      console.error("Erro ao carregar empresas:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.cnpj.includes(searchTerm)
    );
  }, [searchTerm, companies]);

  const selectedCompany = useMemo(() =>
    companies.find(c => c.id === selectedCompanyId),
    [selectedCompanyId, companies]
  );

  const handleUpdateLocalCompany = (updatedCompany: any) => {
    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? { ...c, ...updatedCompany } : c));
  };

  if (selectedCompanyId && selectedCompany) {
    return (
      <CompanyDetails
        company={selectedCompany}
        onBack={() => setSelectedCompanyId(null)}
        onUpdate={handleUpdateLocalCompany}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase italic">Empresas Aura</h2>
          <p className="text-slate-500 dark:text-gray-400 font-medium">Ecossistema de instâncias conectadas em tempo real.</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-full md:w-64 lg:w-80"
            />
          </div>

          <div className="flex bg-white dark:bg-[#0F172A] p-1 rounded-xl border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              title="Visualização em Lista"
            >
              <ListIcon size={18} />
            </button>
          </div>

          <button onClick={fetchCompanies} className="p-2.5 bg-white dark:bg-white/5 border border-white/10 rounded-xl text-blue-500 hover:bg-blue-600/10 transition-all">
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Sincronizando Cloud DB...</p>
        </div>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="bg-white dark:bg-[#0A0D14] rounded-3xl p-5 border border-slate-200 dark:border-white/5 hover:border-blue-500/20 transition-all group relative overflow-hidden shadow-xl flex flex-col justify-between min-h-[250px]">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1 pr-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner flex-shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors tracking-tight truncate leading-tight uppercase">{company.name}</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{company.cnpj}</p>
                      </div>
                    </div>
                    <StatusLabel status={company.status} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="space-y-1.5 py-1">
                      <ContactItem icon={MapPin} text={company.address || 'Endereço não informado'} />
                      <ContactItem icon={Mail} text={company.email || 'E-mail não informado'} />
                    </div>
                    <div className="bg-[#0F172A] dark:bg-white/[0.03] rounded-xl p-3 border border-slate-200 dark:border-white/10 shadow-inner space-y-2">
                      <InfoRow label="Plano" value={company.plan || 'Standard'} icon={CreditCard} color="indigo" />
                      <div className="h-px bg-white/5 w-full" />
                      <InfoRow label="Usuários" value={company.users_count?.toString() || '0'} icon={Users} color="blue" />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => setSelectedCompanyId(company.id)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/40 active:scale-[0.98]"
                  >
                    <ExternalLink size={12} strokeWidth={3} />
                    <span>Acessar Empresa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Empresa</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Contatos</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Plano</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner flex-shrink-0">
                            <Building2 size={20} />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors tracking-tight uppercase">{company.name}</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{company.cnpj}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                            <Mail size={12} />
                            <span className="truncate max-w-[150px]">{company.email || '-'}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin size={12} />
                            <span className="truncate max-w-[150px]">{company.address || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-lg ${company.plan === 'Enterprise' ? 'bg-purple-500/10 text-purple-500' :
                            company.plan === 'Pro' ? 'bg-blue-500/10 text-blue-500' :
                              'bg-slate-500/10 text-slate-500'
                            }`}>
                            <CreditCard size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{company.plan || 'Standard'}</p>
                            <p className="text-[9px] text-slate-500">{company.users_count || 0} usuários</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusLabel status={company.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedCompanyId(company.id)}
                          className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg text-slate-400 hover:text-blue-500 transition-all hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

const CompanyDetails: React.FC<{ company: any, onBack: () => void, onUpdate: (c: any) => void }> = ({ company, onBack, onUpdate }) => {
  const formatLogDate = (dateString: string) => {
    if (!dateString) return '-';
    if (dateString === 'Agora') return 'Agora';

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

  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string, role: string } | null>(null);

  // Plan change modal states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [planModalError, setPlanModalError] = useState<string | null>(null);

  useEffect(() => {
    const loadCompanyData = async () => {
      setLoading(true);
      const [logsRes, usersRes, invRes] = await Promise.all([
        supabase.from('activity_logs').select('*').eq('company_id', company.id).order('timestamp', { ascending: false }).limit(20),
        supabase.from('profiles').select('*').eq('company_id', company.id),
        supabase.from('invoices').select('*').eq('company_id', company.id).order('date', { ascending: false })
      ]);

      if (logsRes.data) setLogs(logsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (invRes.data) setInvoices(invRes.data);
      setLoading(false);
    };
    loadCompanyData();
    fetchCurrentUserProfile();
  }, [company.id]);

  const fetchCurrentUserProfile = async () => {
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

        setCurrentUserProfile({
          name: name || 'Usuário Backoffice',
          role: role || 'ADMIN'
        });
      }
    } catch (error) {
      console.error("Error fetching current user profile:", error);
    }
  };

  const handleToggleStatus = async () => {
    setIsUpdatingStatus(true);
    setModalError(null);
    const newStatus = (company.status === 'Ativo' || company.status === 'active') ? 'Suspenso' : 'Ativo';

    try {
      // 1. Tentar Atualizar Tabela de Empresas
      const updates: any = { status: newStatus };

      if (newStatus === 'Suspenso') {
        if (!statusReason) {
          throw new Error("Selecione um motivo para pausar o acesso.");
        }
        updates.status_reason = statusReason;
      } else {
        updates.status_reason = null; // Limpa o motivo ao reativar
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', company.id);

      if (updateError) {
        // Tratamento específico para erro de coluna faltante
        if (updateError.message.includes("column 'status'")) {
          throw new Error("A coluna 'status' não existe no banco de dados. Por favor, execute o comando SQL: ALTER TABLE companies ADD COLUMN status text DEFAULT 'Ativo';");
        }
        if (updateError.message.includes("column 'status_reason'")) {
          throw new Error("A coluna 'status_reason' não existe. Execute o SQL: ALTER TABLE companies ADD COLUMN status_reason text;");
        }
        throw updateError;
      }

      // 2. Tentar Registrar Log (Opcional)
      try {
        const logDetails = newStatus === 'Suspenso'
          ? `O acesso da empresa foi pausado. Motivo: ${statusReason}`
          : 'O acesso da empresa foi reativado pelo administrador.';

        let currentName = currentUserProfile?.name;
        let currentRole = currentUserProfile?.role;

        if (!currentName) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Fallback: Tenta profile primeiro
            const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
            if (profile) {
              currentName = profile.name;
              currentRole = profile.role;
            }

            if (!currentName) {
              currentName = user.user_metadata?.name;
              currentRole = user.user_metadata?.role;
            }
          }
        }

        await supabase.from('activity_logs').insert([{
          company_id: company.id,
          user_name: currentName || 'Usuário Backoffice',
          action: `Status Alterado: ${newStatus}`,
          details: logDetails,
          module: 'COMPANIES',
          type: newStatus === 'Ativo' ? 'success' : 'warning',
          timestamp: new Date().toISOString()
        }]);
      } catch (logErr) {
        console.warn("Log não pôde ser salvo, mas o status foi atualizado.");
      }

      // 3. Atualizar Estado Local com sucesso
      onUpdate({ ...company, status: newStatus, status_reason: updates.status_reason });
      setShowStatusModal(false);
      setStatusReason(''); // Resetar motivo

      // Atualizar logs na UI local imediatamente
      const newLocalLog = {
        id: Math.random().toString(),
        action: `Status Alterado: ${newStatus}`,
        details: newStatus === 'Suspenso' ? `O acesso da empresa foi pausado. Motivo: ${statusReason}` : 'O acesso da empresa foi reativado pelo administrador.',
        user_name: currentUserProfile?.name || 'Usuário Backoffice',
        timestamp: 'Agora'
      };
      setLogs([newLocalLog, ...logs]);

    } catch (err: any) {
      console.error("Falha ao alterar status:", err);
      setModalError(err.message || "Ocorreu um erro inesperado ao tentar salvar no banco.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Fetch available plans for plan change modal
  const fetchPlansForModal = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('status', 'active')
        .order('value');

      if (!error && data) {
        setAvailablePlans(data);
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
    }
  };

  // Open plan change modal
  const openPlanModal = async () => {
    setShowPlanModal(true);
    setPlanModalError(null);
    setSelectedPlanId(null);
    await fetchPlansForModal();
  };

  // Handle plan change
  const handleUpdatePlan = async () => {
    if (!selectedPlanId) return;

    setIsUpdatingPlan(true);
    setPlanModalError(null);

    try {
      const selectedPlan = availablePlans.find(p => p.id === selectedPlanId);
      if (!selectedPlan) throw new Error("Plano não encontrado");

      // Update company plan
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          plan: selectedPlan.name,
          plan_id: selectedPlan.id
        })
        .eq('id', company.id);

      if (updateError) throw updateError;

      // Log the change
      try {
        await supabase.from('activity_logs').insert([{
          company_id: company.id,
          user_name: currentUserProfile?.name || 'Usuário Backoffice',
          action: 'Plano Alterado',
          details: `Plano alterado para: ${selectedPlan.name}`,
          module: 'COMPANIES',
          type: 'success',
          timestamp: new Date().toISOString()
        }]);
      } catch (logErr) {
        console.warn("Log não pôde ser salvo");
      }

      // Update local state
      onUpdate({ ...company, plan: selectedPlan.name, plan_id: selectedPlan.id });

      // Add log to UI
      const newLocalLog = {
        id: Math.random().toString(),
        action: 'Plano Alterado',
        details: `Plano alterado para: ${selectedPlan.name}`,
        user_name: currentUserProfile?.name || 'Usuário Backoffice',
        timestamp: 'Agora'
      };
      setLogs([newLocalLog, ...logs]);

      setShowPlanModal(false);
    } catch (err: any) {
      console.error("Falha ao alterar plano:", err);
      setPlanModalError(err.message || "Erro ao atualizar plano");
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const isAtivo = company.status === 'Ativo' || company.status === 'active';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Dashboard de Gestão SaaS</span>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <StatusLabel status={company.status} />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none italic max-w-2xl truncate">{company.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowStatusModal(true); setModalError(null); }}
            className={`flex-1 lg:flex-initial px-4 py-3 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isAtivo
              ? 'bg-red-600/10 border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white'
              : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white'
              }`}
          >
            {isAtivo ? <Ban size={14} /> : <PlayCircle size={14} />}
            <span>{isAtivo ? 'Pausar Acesso' : 'Ativar Acesso'}</span>
          </button>
          <button
            onClick={openPlanModal}
            className="flex-1 lg:flex-initial px-4 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
          >
            <RefreshCcw size={14} />
            <span>Alterar Plano</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <section className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
                  <Users size={20} />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">Usuários Vinculados</h4>
              </div>
              <span className="bg-blue-600/10 text-blue-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-500/10">
                {users.length} Colaboradores
              </span>
            </div>
            {!isAtivo && (
              <div className="bg-red-500/10 p-3 flex items-center justify-center space-x-2 border-b border-red-500/20">
                <Ban size={14} className="text-red-500" />
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest text-center">Acesso Bloqueado: Estes usuários não conseguirão entrar no sistema até a reativação.</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Usuário</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">E-mail</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Função</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group ${!isAtivo ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 font-black text-xs border border-blue-500/10">
                            {u.name?.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/10">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                  <DollarSign size={20} />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">Histórico Financeiro</h4>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Data / ID</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{inv.date}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5 tracking-tighter">REF: #{inv.id.substring(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full ${inv.status === 'Pago' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {inv.status === 'Pago' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                          <span className="text-[9px] font-black uppercase tracking-widest">{inv.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white text-sm">
                        R$ {inv.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg text-slate-400 hover:text-blue-500 transition-all">
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/10">
                  <Activity size={20} />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">Logs de Atividade</h4>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-2xl transition-colors group">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 p-1.5 bg-slate-100 dark:bg-white/5 rounded-lg text-blue-500">
                      <Zap size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white mb-0.5 group-hover:text-blue-500 transition-colors">{log.action}</p>
                      <p className="text-[10px] text-slate-500 italic font-medium">"{log.details}"</p>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <User size={10} /> {log.user_name || 'Sistema'}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={10} /> {formatLogDate(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#0A0D14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-white/5 pb-3">Dados Cadastrais</h4>
            <div className="space-y-6">
              <DetailItem label="Nome Fantasia" value={company.name} icon={Building2} />
              <DetailItem label="CNPJ" value={company.cnpj} icon={Shield} />
              <DetailItem label="Telefone" value={company.phone || 'Não vinculado'} icon={Phone} />
              <DetailItem label="E-mail Administrativo" value={company.email || 'Não informado'} icon={Mail} />
              <DetailItem label="Endereço Fiscal" value={company.address || 'Endereço não informado'} icon={MapPin} />
            </div>
          </div>

          <div className="bg-[#0A0D14] p-6 rounded-3xl border border-blue-500/10 shadow-xl shadow-blue-950/20">
            <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-6">Informações do Contrato</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                <div className="flex items-center space-x-3">
                  <CreditCard size={16} className="text-indigo-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Plano Ativo</span>
                </div>
                <span className="text-xs font-black text-white">{company.plan || 'Standard'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                <div className="flex items-center space-x-3">
                  <Users size={16} className="text-blue-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuários</span>
                </div>
                <span className="text-xs font-black text-white">{users.length} Slots</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showStatusModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0A0D14] w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className={`flex items-center space-x-3 ${isAtivo ? 'text-red-500' : 'text-emerald-500'}`}>
                {isAtivo ? <Ban size={24} /> : <PlayCircle size={24} />}
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {isAtivo ? 'Pausar Acesso' : 'Ativar Acesso'}
                </h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-slate-500 hover:text-white"
                disabled={isUpdatingStatus}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                {isAtivo
                  ? `Você tem certeza que deseja PAUSAR o acesso de ${company.name}? Todos os ${users.length} usuários serão impedidos de acessar os terminais Aura imediatamente.`
                  : `Deseja reativar o acesso de ${company.name}? Os usuários vinculados poderão acessar os terminais novamente.`
                }
              </p>

              {isAtivo && (
                <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Motivo da Pausa</label>
                  <div className="space-y-2">
                    {['Falta de pagamento', 'Violou a politicas de uso', 'Manutenção do sistema'].map((reason) => (
                      <label key={reason} className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="pauseReason"
                          value={reason}
                          checked={statusReason === reason}
                          onChange={(e) => setStatusReason(e.target.value)}
                          className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500 bg-transparent"
                        />
                        <span className={`text-xs font-bold ${statusReason === reason ? 'text-slate-900 dark:text-white' : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {modalError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3">
                  <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
                  <p className="text-xs text-red-400 font-bold leading-relaxed">{modalError}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => { setShowStatusModal(false); setStatusReason(''); }}
                  disabled={isUpdatingStatus}
                  className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleToggleStatus}
                  disabled={isUpdatingStatus || (isAtivo && !statusReason)}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3 shadow-xl ${isAtivo
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                    }`}
                >
                  {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : (isAtivo ? 'Confirmar Pausa' : 'Ativar Agora')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Change Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0A0D14] w-full max-w-lg rounded-[2rem] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3 text-indigo-500">
                <CreditCard size={24} />
                <h3 className="text-xl font-black uppercase tracking-tight">Alterar Plano</h3>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-500 hover:text-white"
                disabled={isUpdatingPlan}
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-slate-400 font-medium mb-6">
              Selecione o novo plano para <span className="text-white font-bold">{company.name}</span>
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {availablePlans.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Carregando planos...</p>
                </div>
              ) : (
                availablePlans.map(plan => {
                  const isCurrentPlan = company.plan === plan.name;
                  const isSelected = selectedPlanId === plan.id;
                  const isPartners = plan.external_id === 'partners-exclusive';

                  return (
                    <button
                      key={plan.id}
                      onClick={() => !isCurrentPlan && setSelectedPlanId(plan.id)}
                      disabled={isCurrentPlan}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${isCurrentPlan
                        ? 'bg-emerald-500/10 border-emerald-500/30 cursor-default'
                        : isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/50 ring-2 ring-indigo-500/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${isPartners
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                            : 'bg-indigo-500/20'
                            } ${isPartners ? 'text-white' : 'text-indigo-500'}`}>
                            <Zap size={16} />
                          </div>
                          <div>
                            <p className={`font-black text-sm ${isCurrentPlan ? 'text-emerald-500' : 'text-white'}`}>
                              {plan.name}
                              {isPartners && (
                                <span className="ml-2 px-2 py-0.5 text-[8px] bg-gradient-to-r from-amber-500 to-orange-500 rounded-full uppercase tracking-widest">
                                  Exclusivo
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {plan.value === 0 ? 'Grátis' : `R$ ${plan.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`}
                            </p>
                          </div>
                        </div>
                        {isCurrentPlan && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                            Atual
                          </span>
                        )}
                        {isSelected && !isCurrentPlan && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                            <CheckCircle2 size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {planModalError && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3">
                <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
                <p className="text-xs text-red-400 font-bold leading-relaxed">{planModalError}</p>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowPlanModal(false)}
                disabled={isUpdatingPlan}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePlan}
                disabled={isUpdatingPlan || !selectedPlanId}
                className="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3 shadow-xl bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPlan ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusLabel: React.FC<{ status: string }> = ({ status }) => {
  const normalizedStatus = status?.toLowerCase() === 'active' || status === 'Ativo' ? 'Ativo' : 'Suspenso';
  const isAtivo = normalizedStatus === 'Ativo';

  return (
    <div className={`px-4 py-1.5 rounded-full border border-white/5 ${isAtivo ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 'bg-red-500/10 text-red-500 border-red-500/10'}`}>
      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{normalizedStatus}</span>
    </div>
  );
};

const ContactItem: React.FC<{ icon: any, text: string }> = ({ icon: Icon, text }) => (
  <div className="flex items-start space-x-3 text-slate-500 max-w-full">
    <Icon size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
    <span className="text-xs font-medium leading-tight line-clamp-2">{text}</span>
  </div>
);

const InfoRow: React.FC<{ label: string, value: string, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <Icon size={16} className={`text-${color}-500`} />
      <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{label}</span>
    </div>
    <span className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[100px]">{value}</span>
  </div>
);

const DetailItem: React.FC<{ label: string; value: string; icon: any }> = ({ label, value, icon: Icon }) => (
  <div className="space-y-3">
    <div className="flex items-center space-x-2 text-slate-500">
      <Icon size={14} />
      <p className="text-[9px] font-black uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed">{value}</p>
  </div>
);
