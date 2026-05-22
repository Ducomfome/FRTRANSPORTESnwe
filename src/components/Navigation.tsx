import React from 'react';
import { 
  Truck, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  DollarSign, 
  FileText, 
  LayoutDashboard,
  Settings,
  LogOut,
  MapPin,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Puzzle,
  FolderOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'bg-brand-primary' },
  { id: 'puzzle', label: 'Operação / Tráfego', icon: Puzzle, color: 'bg-brand-primary' },
  { id: 'fretes', label: 'Controle de Fretes', icon: FileText, color: 'bg-brand-primary' },
  { id: 'financeiro', label: 'Fluxo de Caixa', icon: DollarSign, color: 'bg-brand-primary' },
  { id: 'dre', label: 'DRE / Performance', icon: TrendingUp, color: 'bg-brand-primary' },
  { id: 'dividas', label: 'Contas Fixas', icon: CreditCard, color: 'bg-brand-primary' },
  { id: 'gastos_gerais', label: 'Despesas Adm', icon: AlertCircle, color: 'bg-brand-primary' },
  { id: 'cronograma', label: 'Agenda Geral', icon: Calendar, color: 'bg-brand-primary' },
];

const resourceItems: NavItem[] = [
  { id: 'drivers', label: 'Motoristas', icon: Users, color: 'bg-brand-primary' },
  { id: 'trucks', label: 'Frotas / Veículos', icon: Truck, color: 'bg-brand-primary' },
  { id: 'documents', label: 'Documentos Empresa', icon: FolderOpen, color: 'bg-brand-primary' },
];

interface NavigationProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="flex flex-col bg-brand-dark w-full h-full p-2 overflow-hidden border-r border-white/5">
      <div className="flex items-center gap-3 py-6 px-5 mb-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl mx-2 mt-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-brand-primary/5 group-hover:bg-brand-primary/10 transition-colors" />
        <div className="relative w-10 h-10 bg-white rounded-lg p-1 shadow-lg ring-1 ring-black/5">
          <img 
            src="https://pub-f953de47fb8c4b2495fa483b7bb94376.r2.dev/Design%20sem%20nome%20(1).png" 
            alt="Logo" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative">
          <h1 className="font-bold text-sm tracking-tight text-white uppercase">FR TRANSPORTES</h1>
        </div>
      </div>

      <div className="flex flex-col gap-8 flex-1 overflow-y-auto custom-scrollbar px-3 py-6">
        <div>
          <p className="mb-4 text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <span className="w-1 h-1 bg-brand-primary rounded-full" />
            Operacional
          </p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavButton 
                key={item.id} 
                item={item} 
                isActive={activeTab === item.id} 
                onClick={() => onTabChange(item.id)} 
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-4 text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <span className="w-1 h-1 bg-gray-500 rounded-full" />
            Cadastros
          </p>
          <div className="space-y-1">
            {resourceItems.map((item) => (
              <NavButton 
                key={item.id} 
                item={item} 
                isActive={activeTab === item.id} 
                onClick={() => onTabChange(item.id)} 
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto px-4 pb-6 pt-4 border-t border-white/5">
        <button 
          onClick={() => supabase.auth.signOut()}
          className="flex items-center justify-center gap-3 px-4 py-3 bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 border border-white/5 rounded-lg transition-all w-full text-[11px] font-bold uppercase tracking-widest group"
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
}

function NavButton({ item, isActive, onClick }: { key?: string, item: any, isActive: boolean, onClick: () => void }) {
  const Icon = item.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-semibold w-full group relative mb-1",
        isActive 
          ? "bg-brand-primary text-gray-900 shadow-xl shadow-brand-primary/20" 
          : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon size={18} className={cn("transition-transform group-hover:scale-110 shrink-0", isActive && "text-gray-900")} />
      <span className="whitespace-nowrap tracking-tight">{item.label}</span>
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-1 w-1 h-4 bg-gray-900/10 rounded-full"
        />
      )}
    </button>
  );
}
