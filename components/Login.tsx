
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'https://admin.auraalmoxarifado.com.br',
        },
      });

      if (error) {
        throw error;
      }

      setLinkSent(true);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Falha ao enviar link. Verifique o email informado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-48 h-16 relative mb-4">
            <img
              src="https://zdgapmcalocdvdgvbwsj.supabase.co/storage/v1/object/public/AuraLogo/branco.png"
              alt="Aura Logo"
              className="w-full h-full object-contain hidden dark:block"
            />
            <img
              src="https://zdgapmcalocdvdgvbwsj.supabase.co/storage/v1/object/public/AuraLogo/preto.png"
              alt="Aura Logo"
              className="w-full h-full object-contain block dark:hidden"
            />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Backoffice Login
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acesse com um link mágico enviado por email
          </p>
        </div>

        {!linkSent ? (
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="group relative w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Enviar Link Mágico</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                Link Enviado!
              </h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-4">
                Enviamos um link de acesso para:
              </p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-4 py-2 rounded-lg inline-block">
                {email}
              </p>
              <p className="text-xs text-emerald-500 mt-4">
                Verifique sua caixa de entrada e clique no link para acessar.
              </p>
            </div>

            <button
              onClick={() => { setLinkSent(false); setEmail(''); }}
              className="w-full py-2.5 px-4 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Usar outro email
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
