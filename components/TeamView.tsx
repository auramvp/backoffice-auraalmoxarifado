
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
    role: 'Master',
    permissions: [] as string[],
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
      // Filtra localmente para garantir que apenas quem tem acesso real apareça
      // ADMIN: Sempre tem acesso
      // ALMOXARIFE: Só aparece se tiver permissões definidas (objeto não vazio)
      // Isso remove usuários ALMOXARIFE antigos/operacionais que têm permissions: {}
      const activeBackofficeUsers = data.filter((user: any) => {
        if (user.role === 'ADMIN') return true;
        if (user.role === 'ALMOXARIFE') {
          return user.permissions && Object.keys(user.permissions).length > 0;
        }
        return false;
      });

      setTeam(activeBackofficeUsers as any);
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
          permissions: permissionsToSave
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
        role: 'Master',
        permissions: []
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
    const selectedPerms: string[] = [];

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

    // Mapeamento extra para "suporte" - se houver um módulo futuro específico, podemos redirecionar
    // Por enquanto, suporte costuma ver empresas e dashboards
    if (text.includes('suporte') || text.includes('atendimento') || text.includes('chamados')) {
      selectedPerms.push(View.COMPANIES);
      selectedPerms.push(View.DASHBOARD);
    }

    Object.entries(keywordMapping).forEach(([perm, keywords]) => {
      if (keywords.some(kw => text.includes(kw))) {
        selectedPerms.push(perm);
      }
    });

    setNewMember(prev => ({
      ...prev,
      permissions: selectedPerms
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
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                  <div className="relative">
                    <Users2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-medium"
                      placeholder="Ex: João Silva"
                    />
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
                      className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-medium"
                      placeholder="Ex: joao@aura.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível de Acesso</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {['Master', 'Time'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setNewMember({ ...newMember, role })}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${newMember.role === role
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50'
                          : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/10'
                          }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {newMember.role === 'Time' && (
                  <div className="animate-in slide-in-from-top-2 duration-300 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">O que essa pessoa fará? (IA)</label>
                      <textarea
                        value={newMember.description}
                        onChange={(e) => setNewMember({ ...newMember, description: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-medium min-h-[60px] resize-none"
                        placeholder="Ex: Pode dar suporte, cadastrar parceiros, ver a dashboard, olhar os logs, cuida do financeiro..."
                      />
                      <p className="text-[9px] text-slate-500 mt-1 italic">A IA marcará as permissões abaixo automaticamente.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Permissões de Acesso</label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {permissionOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => togglePermission(option.id)}
                            className={`flex items-center space-x-2 p-2 rounded-lg text-xs border transition-all ${newMember.permissions.includes(option.id)
                              ? 'bg-blue-600/10 border-blue-500/50 text-blue-400'
                              : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/10'
                              }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${newMember.permissions.includes(option.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-slate-600'
                              }`}>
                              {newMember.permissions.includes(option.id) && <CheckCircle2 size={10} className="text-white" />}
                            </div>
                            <span className="font-medium truncate">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}


              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddMember}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95"
                >
                  <UserPlus size={14} strokeWidth={3} />
                  <span>Cadastrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
