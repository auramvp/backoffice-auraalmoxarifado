
import React, { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { UsersList } from './components/UsersList';
import { CompaniesList } from './components/CompaniesList';
import { FinanceView } from './components/FinanceView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { TeamView } from './components/TeamView';
import { LogsView } from './components/LogsView';
import { SupportView } from './components/SupportView';
import { Login } from './components/Login';
import { View } from './types';
import { supabase } from './lib/supabase';
import { Ban, Lock, PhoneCall, LogOut, ShieldAlert, Loader2, RefreshCcw } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // Estados de segurança
  const [isSuspended, setIsSuspended] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentCompanyName, setCurrentCompanyName] = useState('');
  const pollIntervalRef = useRef<number | null>(null);

  // ID atualizado conforme o UUID visto no screenshot (empresa CARLOS GABRIEL)
  // const TARGET_COMPANY_ID = 'dce86f24-1154-43e8-8b27-1a9c6fe2ce8a'; 
  const TARGET_COMPANY_ID = ''; // Desativando bloqueio manual hardcoded 

  useEffect(() => {
    // Auth Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Logo URLs
  const logoUrl = theme === 'dark' 
    ? 'https://zdgapmcalocdvdgvbwsj.supabase.co/storage/v1/object/public/AuraLogo/branco.png'
    : 'https://zdgapmcalocdvdgvbwsj.supabase.co/storage/v1/object/public/AuraLogo/preto.png';

  // Função centralizada de verificação de status
  const verifySecurityStatus = async () => {
    if (!TARGET_COMPANY_ID) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name, status')
        .eq('id', TARGET_COMPANY_ID)
        .maybeSingle();

      if (!error && data) {
        // Assume 'Ativo' se o status for null ou vazio
        const currentStatus = data.status || 'Ativo';
        const suspended = currentStatus === 'Suspenso';
        
        if (suspended !== isSuspended) {
          console.log(`Segurança Aura: Status alterado para ${currentStatus}`);
          setIsSuspended(suspended);
        }
        setCurrentCompanyName(data.name);
      }
    } catch (err) {
      console.error("Falha no pulso de segurança:", err);
    }
  };

  useEffect(() => {
    if (!session) return;
    
    if (!TARGET_COMPANY_ID) {
      setCheckingAccess(false);
      return;
    }

    // 1. Verificação Inicial
    const init = async () => {
      setCheckingAccess(true);
      await verifySecurityStatus();
      setCheckingAccess(false);
    };
    init();

    // 2. Pulso de Segurança (Fallback para Realtime desativado)
    // Verifica a cada 3 segundos se o administrador suspendeu a conta
    pollIntervalRef.current = window.setInterval(verifySecurityStatus, 3000);

    // 3. Inscrição Realtime
    const channel = supabase
      .channel('security_monitor')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${TARGET_COMPANY_ID}`,
        },
        (payload) => {
          console.log('Realtime Aura: Bloqueio imediato disparado!');
          setIsSuspended(payload.new.status === 'Suspenso');
        }
      )
      .subscribe();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [session]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full bg-[#05070A] flex flex-col items-center justify-center space-y-6">
        <img src="https://zdgapmcalocdvdgvbwsj.supabase.co/storage/v1/object/public/AuraLogo/branco.png" className="h-10 opacity-50 animate-pulse" alt="Aura Logo" />
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Iniciando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (checkingAccess) {
    return (
      <div className="h-screen w-full bg-[#05070A] flex flex-col items-center justify-center space-y-6">
        <img src="https://zdgapmcalocdvdgvbwsj.supabase.co/storage/v1/object/public/AuraLogo/branco.png" className="h-10 opacity-50 animate-pulse" alt="Aura Logo" />
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Verificando Credenciais...</p>
        </div>
      </div>
    );
  }

  // TELA DE BLOQUEIO (KILL SWITCH)
  if (isSuspended) {
    return (
      <div className="h-screen w-full bg-[#05070A] flex items-center justify-center p-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-red-600/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse" />
        
        <div className="max-w-2xl w-full bg-[#0A0D14] rounded-[3rem] p-12 border border-red-500/20 shadow-[0_50px_100px_rgba(220,38,38,0.3)] text-center relative z-10 animate-in zoom-in-95 duration-500">
           <img 
              src="https://zdgapmcalocdvdgvbwsj.supabase.co/storage/v1/object/public/AuraLogo/branco.png" 
              alt="Aura" 
              className="h-12 mx-auto mb-10 opacity-80"
           />

           <div className="w-24 h-24 bg-red-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-red-900/40 animate-bounce">
              <ShieldAlert size={48} strokeWidth={2.5} />
           </div>
           
           <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 italic leading-tight">
             SISTEMA BLOQUEADO
           </h1>
           
           <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-8 inline-block">
              <p className="text-red-500 font-black uppercase text-xs tracking-widest">
                ID INSTÂNCIA: {TARGET_COMPANY_ID.substring(0, 8)}
              </p>
           </div>

           <p className="text-slate-400 text-lg font-medium mb-10 leading-relaxed max-w-lg mx-auto">
             O acesso da empresa <span className="text-white font-black">{currentCompanyName || 'CARLOS GABRIEL'}</span> foi suspenso manualmente pela administração central. 
             <br/><br/>
             Todos os terminais e acessos mobile foram desativados por precaução de segurança.
           </p>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="flex items-center justify-center space-x-3 bg-white text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95">
                 <PhoneCall size={18} />
                 <span>Suporte Financeiro</span>
              </button>
              <button onClick={() => window.location.reload()} className="flex items-center justify-center space-x-3 bg-red-600/10 border border-red-500/20 text-red-500 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                 <RefreshCcw size={18} />
                 <span>Re-validar Acesso</span>
              </button>
           </div>

           <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center">
              <div className="flex items-center space-x-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                <span>Protocolo de Segurança AURA v4.6</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD: return <Dashboard />;
      case View.USERS: return <UsersList />;
      case View.COMPANIES: return <CompaniesList />;
      case View.FINANCE: return <FinanceView />;
      case View.SUBSCRIPTIONS: return <SubscriptionsView />;
      case View.TEAM: return <TeamView />;
      case View.LOG: return <LogsView />;
      case View.SUPPORT: return <SupportView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#05070A] text-slate-900 dark:text-gray-100 overflow-hidden transition-colors duration-300">
      <Sidebar 
        activeView={currentView} 
        setView={setCurrentView} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 transition-all duration-300 ease-in-out">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
