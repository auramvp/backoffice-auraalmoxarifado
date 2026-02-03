
import React, { useState, useEffect, useMemo } from 'react';
import { Search, MoreHorizontal, Shield, Building2, Key, Trash2, RefreshCcw, Loader2, Filter, Lock, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id: string;
  access_code?: string;
  companies?: {
    name: string;
  };
}

export const UsersList: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const [showPasswordModal, setShowPasswordModal] = useState<Profile | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string, role: string } | null>(null);

  useEffect(() => {
    fetchProfiles();
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

  const createLog = async (action: string, details: string, type: 'info' | 'success' | 'warning' | 'critical' = 'info') => {
    try {
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
        user_name: currentName || 'Usuário Backoffice',
        user_role: currentRole || 'MASTER_ADMIN',
        action,
        details,
        module: 'USERS',
        type,
        timestamp: new Date().toISOString()
      }]);
    } catch (e) {
      console.warn("Falha ao registrar log de auditoria:", e);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          role,
          company_id,
          companies (
            name
          )
        `);

      if (error) throw error;
      if (data) setProfiles(data as unknown as Profile[]);
    } catch (err) {
      console.error('Erro ao buscar perfis:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = profile.name?.toLowerCase().includes(searchLower);
      const emailMatch = profile.email?.toLowerCase().includes(searchLower);
      const roleMatch = profile.role?.toLowerCase().includes(searchLower);
      const companyMatch = profile.companies?.name?.toLowerCase().includes(searchLower);
      
      return nameMatch || emailMatch || roleMatch || companyMatch;
    });
  }, [searchTerm, profiles]);

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (confirm(`Deseja realmente excluir o perfil de ${profile?.name}?`)) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (!error) {
        await createLog('Exclusão de Usuário', `O perfil de ${profile?.name} (${profile?.role}) foi removido permanentemente.`, 'critical');
        setProfiles(profiles.filter(p => p.id !== id));
        setOpenMenuId(null);
      } else {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const handleUpdatePassword = async () => {
    if (!showPasswordModal || !newPassword) return;
    setIsSubmitting(true);
    
    const { error } = await supabase.auth.admin.updateUserById(showPasswordModal.id, {
      password: newPassword
    });

    if (error) {
      setFeedback({ type: 'error', msg: 'Erro ao alterar senha: ' + error.message });
    } else {
      await createLog('Alteração de Senha', `Senha do Almoxarife ${showPasswordModal.name} foi redefinida.`, 'warning');
      setFeedback({ type: 'success', msg: 'Senha alterada com sucesso!' });
      setTimeout(() => {
        setShowPasswordModal(null);
        setNewPassword('');
        setFeedback(null);
      }, 2000);
    }
    setIsSubmitting(false);
  };

  const handleGenerateCode = async () => {
    if (!showCodeModal) return;
    setIsSubmitting(true);
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    const { error } = await supabase
      .from('profiles')
      .update({ access_code: newCode })
      .eq('id', showCodeModal.id);

    if (error) {
      setFeedback({ type: 'error', msg: 'Erro ao gerar código: ' + error.message });
    } else {
      await createLog('Novo Código PIN', `Gerado novo PIN de acesso para o auxiliar ${showCodeModal.name}.`, 'info');
      setGeneratedCode(newCode);
      setFeedback({ type: 'success', msg: 'Código PIN gerado: ' + newCode });
      setProfiles(profiles.map(p => p.id === showCodeModal.id ? { ...p, access_code: newCode } : p));
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Usuários SaaS</h2>
          <p className="text-slate-500 dark:text-gray-400 font-medium">Gestão de acessos operacionais sincronizada com o Supabase.</p>
        </div>
        <button 
          onClick={fetchProfiles}
          className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-blue-500 hover:bg-blue-600/10 transition-all flex items-center space-x-2 shadow-sm"
        >
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">Sincronizar</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden relative">
        {loading && profiles.length === 0 && (
          <div className="absolute inset-0 z-10 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
            <Loader2 size={40} className="animate-spin text-blue-500" />
            <p className="text-sm font-black text-white uppercase tracking-widest">Acessando Cloud DB...</p>
          </div>
        )}

        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, email, empresa ou função..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 shadow-inner"
            />
          </div>
          <div className="flex items-center space-x-3">
             <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10">
               <Filter size={14} className="text-blue-500" />
               <span>{filteredProfiles.length} Usuários Filtrados</span>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/5">
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Perfil</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">E-mail</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">Função</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">Empresa</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all group relative">
                  <td className="px-6 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-500 border border-blue-500/10 font-bold text-xs shadow-inner shrink-0">
                        {profile.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight group-hover:text-blue-500 transition-colors truncate">{profile.name}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">ID: {profile.id.substring(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-400 font-medium italic">
                    {profile.email}
                  </td>
                  <td className="px-6 py-3 text-center">
                     <div className="inline-flex items-center space-x-2 text-blue-500 bg-blue-500/5 px-2.5 py-1 rounded-lg border border-blue-500/10">
                       <Shield size={12} className="opacity-70" />
                       <span className="text-[9px] font-black uppercase tracking-widest">{profile.role}</span>
                     </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex items-center justify-center space-x-2 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 max-w-[220px] mx-auto overflow-hidden group/company">
                      <Building2 size={12} className="text-slate-500 group-hover/company:text-blue-500 transition-colors flex-shrink-0" />
                      <span className="text-[10px] font-black text-slate-700 dark:text-blue-400/90 uppercase tracking-tight truncate">
                        {profile.companies?.name || 'Não vinculada'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(profile.id);
                      }}
                      className="p-2 text-slate-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all shadow-sm group-hover:bg-slate-200 dark:group-hover:bg-white/5"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openMenuId === profile.id && (
                      <div className="absolute right-8 top-10 w-56 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
                        
                        {profile.role === 'ALMOXARIFE' && (
                          <button 
                            onClick={() => { setShowPasswordModal(profile); setOpenMenuId(null); }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-blue-500 transition-colors"
                          >
                            <Key size={14} className="text-blue-500" />
                            <span>Alterar Senha</span>
                          </button>
                        )}

                        {profile.role === 'AUX_ALMOXARIFE' && (
                          <button 
                            onClick={() => { setShowCodeModal(profile); setOpenMenuId(null); }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-indigo-500 transition-colors"
                          >
                            <Lock size={14} className="text-indigo-500" />
                            <span>Novo Código</span>
                          </button>
                        )}

                        <div className="h-[1px] bg-slate-100 dark:bg-white/5 mx-2" />
                        
                        <button 
                          onClick={() => handleDelete(profile.id)}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                          <span>Excluir Perfil</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAIS (SENHA E PIN) OMITIDOS PARA BREVIDADE, MAS LÓGICA DE LOG INCLUÍDA ACIMA */}
    </div>
  );
};
