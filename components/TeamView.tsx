
import React, { useState, useEffect } from 'react';
import {
  Users2, Plus, Search, Shield, ShieldCheck, Trash2, RefreshCcw, X,
  CheckCircle2, Lock, UserPlus, LayoutDashboard, Users, Building2,
  DollarSign, Zap, Scale, ChevronDown, Mail, Megaphone
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TeamMember, View } from '../types';

export const TeamView: React.FC = () => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string, role: string } | null>(null);

  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'Time' as 'Master' | 'Time',
    custom_role: '', // Título customizado (ex: Suporte, Analista)
    permissions: {} as Record<string, 'none' | 'view' | 'full'>,
    description: ''
  });


  useEffect(() => {
    fetchTeam();
    fetchCurrentUserProfile();
  }, []);

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

  const fetchTeam = async () => {
    setLoading(true);
    // Buscando perfis de ADMIN e ALMOXARIFE
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['ADMIN', 'ALMOXARIFE'])
      .order('name');

    if (!error && data) {
      setTeam(data as any);
    }
    setLoading(false);
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email) return;

    // Se for Master, permissões totais
    const permissionsToSave = newMember.role === 'Master'
      ? { all: true }
      : newMember.permissions.reduce((acc, curr) => ({ ...acc, [curr]: true }), {});

    // Envia magic link para o email do novo membro
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: newMember.email,
      options: {
        emailRedirectTo: 'https://admin.auraalmoxarifado.com.br',
        data: {
          name: newMember.name,
          role: newMember.role === 'Master' ? 'ADMIN' : 'ALMOXARIFE',
          custom_role: newMember.custom_role || (newMember.role === 'Master' ? 'MASTER' : 'TIME')
        }
      }
    });

    if (authError) {
      console.warn("Aviso Auth:", authError.message);
      // Não interrompemos pois pode ser apenas que o usuário já exista
    }

    // Tenta verificar se o usuário já existe
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', newMember.email)
      .single();

    let data, error;

    if (existingUser) {
      // Atualiza usuário existente
      const result = await supabase
        .from('profiles')
        .update({
          name: newMember.name,
          role: newMember.role === 'Master' ? 'ADMIN' : 'ALMOXARIFE',
          permissions: permissionsToSave,
          custom_role: newMember.custom_role || (newMember.role === 'Master' ? 'MASTER' : 'TIME')
        })
        .eq('id', existingUser.id)
        .select();

      data = result.data;
      error = result.error;

      // Se atualizou com sucesso, removemos da lista antiga (para readicionar atualizado)
      if (!error && data) {
        setTeam(prev => prev.filter(p => p.email !== newMember.email));
      }
    } else {
      // Insere novo usuário
      const result = await supabase.from('profiles').insert([{
        name: newMember.name,
        email: newMember.email,
        role: newMember.role === 'Master' ? 'ADMIN' : 'ALMOXARIFE',
        permissions: permissionsToSave,
        custom_role: newMember.custom_role || (newMember.role === 'Master' ? 'MASTER' : 'TIME')
      }]).select();

      data = result.data;
      error = result.error;
    }

    if (!error && data) {
      let currentName = currentUserProfile?.name;
      let currentRole = currentUserProfile?.role;

      if (!currentName) {
        try {
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
        } catch (e) {
          console.error("Erro ao buscar usuário para log:", e);
        }
      }

      await supabase.from('activity_logs').insert([{
        user_name: currentName || 'Usuário Backoffice',
        user_role: currentRole || 'MASTER_ADMIN',
        action: 'Novo Membro do Time',
        details: `O membro ${newMember.name} foi cadastrado como ${newMember.role}.`,
        module: 'TEAM',
        type: 'success',
        timestamp: new Date().toISOString()
      }]);
      setTeam([data[0] as any, ...team]);
      setShowAddModal(false);
      setNewMember({
        name: '',
        email: '',
        role: 'Time',
        custom_role: '',
        permissions: {},
        description: ''
      });

      // Avisa que link mágico foi enviado
      alert(`Link de acesso enviado para ${newMember.email}!`);
    } else {
      // Se falhar por constraint de role, tentar ajustar
      alert("Erro ao salvar membro: " + error?.message);
    }
  };

  const togglePermission = (perm: string) => {
    setNewMember(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  useEffect(() => {
    if (newMember.description) {
      updatePermissionsFromDescription(newMember.description);
    }
  }, [newMember.description]);

  const updatePermissionsFromDescription = (description: string) => {
    const text = description.toLowerCase();
    const newPermissions: Record<string, 'none' | 'view' | 'full'> = {};

    // Forçar reset para 'none' antes de processar
    Object.values(View).forEach(v => {
      newPermissions[v] = 'none';
    });

    const keywordMapping: { [key: string]: string[] } = {
      [View.DASHBOARD]: ['dashboard', 'visão geral', 'indicadores', 'graficos', 'gráficos', 'resumo', 'métricas', 'performance'],
      [View.TEAM]: ['time', 'equipe', 'membros', 'acessos', 'permissoes', 'permissões', 'usuarios backoffice', 'gestão de pessoas'],
      [View.LOG]: ['logs', 'atividades', 'historico', 'histórico', 'rastreamento', 'auditoria', 'eventos', 'quem fez o que'],
      [View.USERS]: ['usuarios', 'usuários', 'clientes', 'contas', 'saas', 'gestão de usuários', 'ver usuários'],
      [View.COMPANIES]: ['empresas', 'negocios', 'negócios', 'cnpj', 'parceiros', 'unidades', 'ver empresas', 'cadastrar parceiros'],
      [View.FINANCE]: ['financeiro', 'pagamentos', 'faturamento', 'dinheiro', 'vendas', 'cobrança', 'asaas', 'faturas', 'contas a pagar', 'contas a receber', 'realizando cobranças'],
      [View.SUBSCRIPTIONS]: ['assinaturas', 'planos', 'mensalidades', 'ciclos', 'recorrência', 'cancelamentos'],
      [View.TAX_RECOVERY]: ['tributaria', 'tributária', 'impostos', 'recuperação', 'fiscal', 'revisão fiscal', 'créditos'],
      [View.MARKETING]: ['marketing', 'banners', 'cupons', 'campanhas', 'promoções', 'propaganda', 'avisos'],
    };

    // Detecção de Intensidade
    const isFullAccess = (p: string) => {
      const fullKeywords = ['tudo', 'total', 'gerenciar', 'setar', 'mudar', 'excluir', 'editar', 'admin', 'chefe', 'gerente', 'completo'];
      return fullKeywords.some(kw => text.includes(kw));
    };

    const isViewOnly = (p: string) => {
      const viewKeywords = ['ver', 'olhar', 'apenas', 'consultar', 'visualizar', 'acompanhar', 'observar'];
      return viewKeywords.some(kw => text.includes(kw));
    };

    // Especial: Suporte
    if (text.includes('suporte') || text.includes('atendimento')) {
      newPermissions[View.COMPANIES] = 'view';
      newPermissions[View.DASHBOARD] = 'view';
    }

    Object.entries(keywordMapping).forEach(([perm, keywords]) => {
      if (keywords.some(kw => text.includes(kw))) {
        if (isFullAccess(text)) {
          newPermissions[perm] = 'full';
        } else if (isViewOnly(text)) {
          newPermissions[perm] = 'view';
        } else {
          // Default se citou o nome do módulo mas não especificou nível
          newPermissions[perm] = 'full';
        }
      }
    });

    setNewMember(prev => ({
      ...prev,
      permissions: newPermissions
    }));
  };


  const filteredTeam = team.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const permissionOptions = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: View.TEAM, label: 'Time', icon: Users2 },
    { id: View.LOG, label: 'Logs', icon: RefreshCcw },
    { id: View.USERS, label: 'Usuários SaaS', icon: Users },
    { id: View.COMPANIES, label: 'Empresas', icon: Building2 },
    { id: View.FINANCE, label: 'Financeiro', icon: DollarSign },
    { id: View.SUBSCRIPTIONS, label: 'Assinaturas', icon: Zap },
    { id: View.TAX_RECOVERY, label: 'Recup. Tributária', icon: Scale },
    { id: View.MARKETING, label: 'Marketing', icon: Megaphone },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase italic">Gestão do Time</h2>
          <p className="text-slate-500 dark:text-gray-400 font-medium tracking-tight">Administradores e analistas sincronizados com Supabase Cloud.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 flex items-center space-x-3 transition-all">
          <UserPlus size={18} strokeWidth={3} />
          <span>Novo Acesso</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#0A0D14] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando infraestrutura...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/5">
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Membro</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Email</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Nível</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredTeam.map((member: any) => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all group">
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-500 border border-blue-500/10 uppercase font-black text-xs">{member.name.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight group-hover:text-blue-500 transition-colors">{member.name}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ID: {member.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="inline-flex items-center space-x-2 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                        <Mail size={12} className="text-slate-500" />
                        <span className="font-medium text-slate-600 dark:text-slate-400 text-xs truncate max-w-[150px]">{member.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded border border-slate-200 dark:border-white/5">{member.role}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center space-x-2 text-emerald-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Sincronizado</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Novo Acesso */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#111827] w-full max-w-md rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden relative animate-in zoom-in-50 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Novo Acesso</h3>
                  <p className="text-slate-400 text-xs font-medium mt-1">Cadastrar membro com acesso ao BackOffice.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                    <div className="relative">
                      <Users2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="text"
                        value={newMember.name}
                        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-medium"
                        placeholder="Ex: André Costa"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cargo / Função</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="text"
                        value={newMember.custom_role}
                        onChange={(e) => setNewMember({ ...newMember, custom_role: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-medium"
                        placeholder="Ex: Suporte, Analista..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail Corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-medium"
                      placeholder="Ex: andre@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Poder de Acesso</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: 'Master', label: 'Master (Acesso Total)', desc: 'Pode gerenciar tudo' },
                      { id: 'Time', label: 'Time (Limitado)', desc: 'Permissões customizadas' }
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setNewMember({ ...newMember, role: r.id as any })}
                        className={`p-3 rounded-xl text-left border transition-all ${newMember.role === r.id
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                          : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/10'
                          }`}
                      >
                        <p className="text-[10px] font-black uppercase tracking-tight">{r.label}</p>
                        <p className={`text-[8px] mt-0.5 ${newMember.role === r.id ? 'text-blue-100' : 'text-slate-600'}`}>{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {newMember.role === 'Time' && (
                  <div className="animate-in slide-in-from-top-2 duration-400 space-y-4">
                    <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-500/10">
                      <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Zap size={12} className="fill-current" />
                        Descrição para a IA
                      </label>
                      <textarea
                        value={newMember.description}
                        onChange={(e) => setNewMember({ ...newMember, description: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-sm text-white placeholder-slate-600 focus:ring-0 outline-none font-medium min-h-[50px] resize-none"
                        placeholder="Ex: Ele pode apenas ver o financeiro e o dashboard, mas tem acesso total ao marketing."
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Refinar Permissões por Módulo</label>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                        {permissionOptions.map((option) => (
                          <div key={option.id} className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${newMember.permissions[option.id] === 'full' ? 'bg-blue-600 text-white' : newMember.permissions[option.id] === 'view' ? 'bg-emerald-600/20 text-emerald-500' : 'bg-white/5 text-slate-600'}`}>
                                <option.icon size={14} />
                              </div>
                              <span className="text-[11px] font-bold text-slate-300">{option.label}</span>
                            </div>

                            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                              {[
                                { id: 'none', label: 'Nada', color: 'hover:text-red-500' },
                                { id: 'view', label: 'Ver', color: 'hover:text-emerald-500' },
                                { id: 'full', label: 'Tudo', color: 'hover:text-blue-500' }
                              ].map((lvl) => (
                                <button
                                  key={lvl.id}
                                  onClick={() => setNewMember({
                                    ...newMember,
                                    permissions: { ...newMember.permissions, [option.id]: lvl.id as any }
                                  })}
                                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${newMember.permissions[option.id] === lvl.id
                                    ? (lvl.id === 'full' ? 'bg-blue-600 text-white' : lvl.id === 'view' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white')
                                    : `text-slate-600 ${lvl.color}`
                                    }`}
                                >
                                  {lvl.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-white/5 flex justify-end items-center space-x-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddMember}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 flex items-center space-x-3 transition-all active:scale-95"
                >
                  <ShieldCheck size={16} strokeWidth={2.5} />
                  <span>Cadastrar Acesso</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
