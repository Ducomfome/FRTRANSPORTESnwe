import React, { useState } from 'react';
import { useToast } from './ui/Toast';
import { User, Lock, Loader2, ShieldCheck, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export function Login({ onBypass }: { onBypass?: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      showToast('Por favor, insira o usuário.', 'error');
      return;
    }
    if (!cleanPassword) {
      showToast('Por favor, insira a senha.', 'error');
      return;
    }
    
    setLoading(true);

    // Simulação rápida para uma experiência de usuário ultra polida
    setTimeout(() => {
      const isUserValid = cleanUsername === 'fr transportes' || cleanUsername === 'frtransportes' || cleanUsername === 'admin';
      const isPasswordValid = cleanPassword === 'admin';

      if (isUserValid && isPasswordValid) {
        showToast('Acesso autorizado! Bem-vindo ao sistema.', 'success');
        if (onBypass) {
          onBypass();
        }
      } else {
        if (!isUserValid) {
          showToast('Usuário incorreto. Digite "FR TRANSPORTES".', 'error');
        } else {
          showToast('Senha incorreta. Tente novamente.', 'error');
        }
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-brand-panel border border-brand-border rounded-3xl shadow-2xl p-6 md:p-8 relative overflow-hidden"
      >
        {/* Detalhe estético de background */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
        
        <div className="flex flex-col items-center mb-8 relative z-10">
          <motion.div 
            initial={{ y: -10 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="w-20 h-20 mb-4 bg-brand-bg p-2 rounded-2xl border border-brand-border flex items-center justify-center shadow-inner"
          >
            <img 
              src="https://pub-f953de47fb8c4b2495fa483b7bb94376.r2.dev/Design%20sem%20nome%20(1).png" 
              alt="FR TRANSPORTES Logo" 
              className="w-full h-full object-contain filter drop-shadow"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-2xl font-black text-brand-text tracking-tight flex items-center gap-1.5 uppercase">
            FR TRANSPORTES <Sparkles size={16} className="text-brand-primary animate-pulse" />
          </h1>
          <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider mt-1">
            Painel Operacional & Financeiro
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          {/* Usuário */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase tracking-widest px-1">
              Usuário de Acesso
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-primary transition-colors duration-200">
                <User size={18} />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-brand-bg border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text text-sm transition-all placeholder:text-xs"
                placeholder="Ex de usuário: FR TRANSPORTES"
                autoFocus
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase tracking-widest px-1">
              Senha
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-primary transition-colors duration-200">
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-brand-bg border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text text-sm transition-all placeholder:text-xs"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-brand-primary/15 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Acessar Painel</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-brand-border text-center relative z-10">
          <p className="text-[9px] text-brand-text-muted uppercase tracking-widest font-bold">
            FR TRANSPORTES &copy; {new Date().getFullYear()} - Sistema Seguro
          </p>
        </div>
      </motion.div>
    </div>
  );
}
