import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { TripList } from './components/TripList';
import { FinancialView } from './components/FinancialView';
import { IdentificationView } from './components/IdentificationView';
import { CalendarView } from './components/CalendarView';
import { DebtView } from './components/DebtView';
import { FleetPuzzleView } from './components/FleetPuzzleView';
import { CompanyExpensesView } from './components/CompanyExpensesView';
import { CompanyDocumentsView } from './components/CompanyDocumentsView';
import { Login } from './components/Login';
import { Search, Bell, User, Menu, X, AlertTriangle, Database, Sun, Moon, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastProvider } from './components/ui/Toast';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [bypassAuth, setBypassAuth] = useState(() => localStorage.getItem('bypass_auth') === 'true');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthReady(true);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthReady(true);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const renderContent = () => {
    const filterProps = { month: selectedMonth, year: selectedYear };

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} {...filterProps} />;
      case 'puzzle':
        return <FleetPuzzleView />;
      case 'fretes':
        return <TripList {...filterProps} />;
      case 'financeiro':
      case 'dre':
        return <FinancialView {...filterProps} />;
      case 'gastos_gerais':
        return <CompanyExpensesView {...filterProps} />;
      case 'drivers':
      case 'trucks':
        return <IdentificationView defaultTab={activeTab as 'drivers' | 'trucks'} />;
      case 'documents':
        return <CompanyDocumentsView />;
      case 'cronograma':
        return <CalendarView {...filterProps} />;
      case 'dividas':
        return <DebtView {...filterProps} />;
      default:
        return (
          <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 capitalize">
              {activeTab.replace('_', ' ')}
            </h2>
            <div className="flex items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
              Módulo em desenvolvimento...
            </div>
          </div>
        );
    }
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Visão Geral';
      case 'puzzle': return 'Gestão de Tráfego';
      case 'fretes': return 'Controle de Fretes';
      case 'financeiro': return 'Financeiro';
      case 'dre': return 'DRE / Lucros';
      case 'gastos_gerais': return 'Gastos Gerais da Empresa';
      case 'drivers': return 'Motoristas';
      case 'trucks': return 'Frotas';
      case 'documents': return 'Documentos Empresa';
      case 'cronograma': return 'Cronograma';
      case 'dividas': return 'Dívidas';
      default: return tab.replace('_', ' ').toUpperCase();
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (isSupabaseConfigured && !session && !bypassAuth) {
    return (
      <ToastProvider>
        <Login onBypass={() => {
          localStorage.setItem('bypass_auth', 'true');
          setBypassAuth(true);
        }} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row overflow-hidden font-sans text-brand-text">
        {/* Sidebar (Desktop) */}
        <div className="hidden md:block w-[260px] shrink-0 h-screen sticky top-0 print:hidden">
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
              />
              <motion.div 
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[280px] bg-brand-dark z-50 md:hidden shadow-2xl flex flex-col"
              >
                <div className="absolute top-4 right-4 z-10">
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/60 hover:text-white p-2">
                    <X size={24} />
                  </button>
                </div>
                <Navigation 
                  activeTab={activeTab} 
                  onTabChange={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false);
                  }} 
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-brand-bg print:bg-white print:h-auto print:overflow-visible">
          {/* Header */}
          <header className="flex items-center justify-between px-4 md:px-8 py-4 bg-header-bg border-b border-brand-border sticky top-0 z-30 transition-colors duration-200 shadow-sm print:hidden">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 bg-brand-primary/10 border border-brand-primary/20 rounded-md transition-colors text-brand-primary"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-brand-text tracking-tight leading-none mb-1">
                  {getTabTitle(activeTab)}
                </h1>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-brand-bg border border-brand-border text-[10px] font-bold text-brand-text-muted uppercase tracking-widest cursor-pointer px-2 py-0.5 rounded focus:ring-1 focus:ring-brand-primary/20 outline-none"
                  >
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-brand-bg border border-brand-border text-[10px] font-bold text-brand-text-muted uppercase tracking-widest cursor-pointer px-2 py-0.5 rounded focus:ring-1 focus:ring-brand-primary/20 outline-none"
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 md:gap-6">
              <button 
                onClick={toggleDarkMode}
                className="p-2 border border-brand-border rounded-full text-brand-text-muted hover:text-brand-primary hover:bg-brand-bg transition-all"
                title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {!isSupabaseConfigured ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg text-[10px] font-bold uppercase tracking-widest animate-pulse">
                  <AlertTriangle size={14} />
                  <span>Offline</span>
                </div>
              ) : null}
              
              <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-brand-border">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-brand-text leading-none mb-1">
                    {session?.user?.email?.split('@')[0] || 'Administrador'}
                  </p>
                  <p className="text-[9px] text-brand-primary font-bold uppercase tracking-widest">FR TRANSPORTES</p>
                </div>
                <button 
                  onClick={async () => {
                    localStorage.removeItem('bypass_auth');
                    setBypassAuth(false);
                    if (isSupabaseConfigured) {
                      await supabase.auth.signOut();
                    }
                  }}
                  className="w-10 h-10 bg-brand-bg rounded-full flex items-center justify-center text-brand-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Sair do Sistema"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 print:p-0 print:overflow-visible print:h-auto">
            {!isSupabaseConfigured && activeTab !== 'dashboard' && (
              <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-red-800">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="shrink-0 mt-1" />
                  <div className="text-sm">
                    <p className="font-bold text-lg mb-1">Banco de Dados não conectado!</p>
                    <p className="opacity-90 leading-relaxed">
                      Para salvar e editar dados, você precisa configurar o Supabase.<br/>
                      Vá em <b>Settings &gt; Secrets</b> e adicione as chaves <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="print:block print:p-0 print:m-0 print:h-auto print:overflow-visible"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
