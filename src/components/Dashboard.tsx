import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  AlertCircle, 
  Truck as TruckIcon,
  Users,
  Calendar,
  DollarSign,
  Puzzle
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { useTrips, useDrivers, useDebts } from '../lib/hooks';
import { isSupabaseConfigured } from '../lib/supabase';

interface DashboardProps {
  onNavigate: (id: string) => void;
  month: number;
  year: number;
}

export function Dashboard({ onNavigate, month, year }: DashboardProps) {
  const { trips, loading: tripsLoading } = useTrips();
  const { drivers, loading: driversLoading } = useDrivers();
  const { debts, loading: debtsLoading } = useDebts();

  const filteredTrips = trips.filter(t => {
    const date = new Date(t.loading_date);
    return date.getMonth() === month && date.getFullYear() === year;
  });

  const stats = [
    { 
      label: 'Volume Bruto Operacional', 
      value: formatCurrency(filteredTrips.reduce((acc, t) => acc + (t.freight_value || 0), 0)), 
      icon: DollarSign, 
      color: 'text-brand-primary',
      bg: 'bg-brand-primary',
    },
    { 
      label: 'Frota em Trajeto Ativo', 
      value: drivers.filter(d => d.work_status === 'road').length.toString(), 
      secondary: `/ ${drivers.length} motoras`,
      icon: TruckIcon, 
      color: 'text-white',
      bg: 'bg-black',
    },
    { 
      label: 'Agendamentos Pendentes', 
      value: filteredTrips.filter(t => t.status === 'pending').length.toString(), 
      icon: AlertCircle, 
      color: 'text-black',
      bg: 'bg-amber-400'
    },
    { 
      label: 'Vencimentos do Período', 
      value: formatCurrency(debts.filter(d => {
        if (!d.due_date) return false;
        const date = new Date(d.due_date);
        return d.status === 'pending' && date.getMonth() === month && date.getFullYear() === year && d.type === 'pagar';
      }).reduce((acc, d) => acc + (d.total_value || 0), 0)), 
      icon: TrendingUp, 
      color: 'text-white',
      bg: 'bg-red-600'
    },
  ];

  const quickMenu = [
    { id: 'fretes', label: 'Lançar Ordem de Frete', icon: DollarSign, color: 'bg-brand-primary' },
    { id: 'puzzle', label: 'Logística de Pátio', icon: Puzzle, color: 'bg-brand-secondary' },
    { id: 'financeiro', label: 'Painel de Fluxo', icon: TrendingUp, color: 'bg-white' },
  ];

  if (tripsLoading || driversLoading || debtsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!isSupabaseConfigured && (
        <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl flex items-center gap-4 text-red-800">
          <AlertCircle className="shrink-0" size={20} />
          <div className="text-sm">
            <p className="font-bold">Banco de Dados não configurado!</p>
            <p className="opacity-80">Vá na aba "Motoristas" ou "Frotas" para ver as instruções de configuração.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="panel p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-lg", stat.bg)}>
                <stat.icon className={cn("text-white")} size={20} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-bold text-brand-text tracking-tight">{stat.value}</h3>
                {(stat as any).secondary && <span className="text-[10px] text-brand-text-muted font-medium">{(stat as any).secondary}</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest pl-2 border-l-2 border-brand-primary">Lançamentos Rápidos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center justify-between p-4 bg-brand-panel border border-brand-border rounded-xl shadow-sm hover:border-brand-primary/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg text-white transition-colors", item.color)}>
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-semibold text-brand-text">{item.label}</span>
              </div>
              <ArrowUpRight size={14} className="text-brand-text-muted group-hover:text-brand-primary transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
