
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  Zap,
  LogOut,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  DollarSign,
  Scale,
  Users2,
  History,
  ShieldCheck,
  ShieldAlert,
  Headphones,
  Layers,
  Handshake,
  Megaphone
} from 'lucide-react';
import { View } from '../types';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  activeView: View;
  setView: (view: View) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setView,
  isCollapsed,
  setIsCollapsed,
  theme,
  toggleTheme
}) => {
  const [status, setStatus] = useState('Ativo');
  const [userProfile, setUserProfile] = useState({
    name: 'Carregando...',
    role: '...',
    custom_role: '',
    initials: '..',
    permissions: {} as Record<string, 'none' | 'view' | 'full'>
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, role, custom_role, permissions')
            .eq('id', user.id)
            .single();

          if (profile) {
            const initials = profile.name
              .split(' ')
              .slice(0, 2)
              .map((n: string) => n[0])
              .join('')
              .toUpperCase();

            setUserProfile({
              name: profile.name,
              role: profile.role,
              custom_role: profile.custom_role,
              initials,
              permissions: (profile.permissions || {}) as Record<string, 'none' | 'view' | 'full'>
            });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Monitorar status da empresa atual para fins de lógica interna (embora o card visual tenha sido removido)
  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase.from('companies').select('status').limit(1).single();
      if (data) setStatus(data.status);
    };
    fetchStatus();

    const channel = supabase.channel('sidebar_status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'companies' }, (payload) => {
        setStatus(payload.new.status);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const navItems = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: View.TEAM, label: 'Time', icon: Users2 },
    { id: View.LOG, label: 'Logs', icon: History },
    { id: View.USERS, label: 'Usuários SaaS', icon: Users },
    { id: View.COMPANIES, label: 'Empresas', icon: Building2 },
    { id: View.PARTNERS, label: 'Partners', icon: Handshake },
    { id: View.FINANCE, label: 'Financeiro', icon: DollarSign },
    { id: View.SUBSCRIPTIONS, label: 'Assinaturas', icon: Zap },
    { id: View.PLANS, label: 'Planos', icon: Layers },
    { id: View.SUPPORT, label: 'Suporte', icon: Headphones },
    { id: View.MARKETING, label: 'Marketing', icon: Megaphone },
  ].filter(item => {
    // Admin (Master) sempre vê tudo
    if (userProfile.role === 'ADMIN') return true;

    // Se for Almoxarife (Time), verifica se o nível é 'none'
    const perm = userProfile.permissions[item.id];
    return perm !== 'none';
  });

  // Definição do Logo baseada no tema
  const logoUrl = theme === 'dark'
    ? 'https://zdgapmcalocdvdgvbwsj.supabase.co/storage/v1/object/public/AuraLogo/branco.png'
    : 'https://zdgapmcalocdvdgvbwsj.supabase.co/storage/v1/object/public/AuraLogo/preto.png';

  return (
    <aside
      className={`bg-white dark:bg-[#0A0D14] flex flex-col border-r border-slate-200 dark:border-white/5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] relative ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div className={`pt-6 px-4 mb-6 flex items-center justify-between overflow-hidden whitespace-nowrap`}>
        <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
          <img
            src={logoUrl}
            alt="Aura Logo"
            className="h-10 md:h-12 w-auto object-contain select-none pointer-events-none"
          />
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-500 hover:text-blue-600 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-all backdrop-blur-md ${isCollapsed ? 'mx-auto' : ''
            }`}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            title={isCollapsed ? item.label : ''}
            className={`w-full flex items-center rounded-xl transition-all duration-300 group overflow-hidden whitespace-nowrap ${activeView === item.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-500 dark:text-gray-500 hover:text-blue-600 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-white/2'
              } ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'}`}
          >
            <item.icon className="flex-shrink-0" size={18} strokeWidth={activeView === item.id ? 2.5 : 2} />
            {!isCollapsed && (
              <span className="font-medium text-sm">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 mt-auto">
        <div className={`bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden transition-all duration-500 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-[10px] ring-2 ring-white dark:ring-[#0A0D14] shadow-lg">
                {userProfile.initials}
              </div>
              {!isCollapsed && (
                <div className="text-left overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">{userProfile.name}</p>
                  <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider truncate">
                    {userProfile.custom_role || userProfile.role}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-yellow-400 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-all"
                  title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Sair"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
