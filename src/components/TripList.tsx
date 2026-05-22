import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MapPin, 
  Calendar, 
  DollarSign, 
  MoreHorizontal,
  Truck as TruckIcon,
  Trash2,
  Edit2,
  ArrowRight,
  ChevronRight,
  Calculator,
  Merge
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { dbService } from '../lib/dbService';
import { Trip, Driver, Truck as TruckType } from '../types';
import { Modal } from './ui/Modal';
import { ConfirmModal } from './ui/ConfirmModal';
import { TripExpenseModal } from './TripExpenseModal.tsx';
import { MergeTripModal } from './MergeTripModal';
import { useTrips, useDrivers, useTrucks } from '../lib/hooks';
import { useToast } from './ui/Toast';

interface TripListProps {
  month: number;
  year: number;
}

export function TripList({ month, year }: TripListProps) {
  const { trips, loading, refresh } = useTrips();
  const { drivers } = useDrivers();
  const { trucks } = useTrucks();
  const { showToast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expenseTrip, setExpenseTrip] = useState<Trip | null>(null);
  const [mergeSourceTrip, setMergeSourceTrip] = useState<any>(null);

  const filteredTrips = trips.filter(trip => {
    // 1. Filter by search term
    const search = (searchTerm || '').toLowerCase();
    const driverName = (trip.drivers?.name || '').toLowerCase();
    const destination = (trip.destination || '').toLowerCase();
    const cte = (trip.cte || '');
    
    const matchesSearch = driverName.includes(search) || 
                         destination.includes(search) || 
                         cte.includes(search);

    if (!matchesSearch) return false;

    // 2. Filter by month and year
    if (trip.loading_date && typeof trip.loading_date === 'string') {
      const [y, m] = trip.loading_date.split('-').map(Number);
      if (y !== year || (m - 1) !== month) return false;
    } else {
      const date = new Date(trip.loading_date);
      if (date.getMonth() !== month || date.getFullYear() !== year) return false;
    }

    return true;
  });

  const handleSaveTrip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const tripData = {
      driver_id: (formData.get('driver_id') as string) || null,
      truck_id: (formData.get('truck_id') as string) || null,
      trailer_id: (formData.get('trailer_id') as string) || null,
      origin: formData.get('origin') as string,
      destination: formData.get('destination') as string,
      cte: formData.get('cte') as string,
      loading_date: formData.get('loading_date') as string,
      cte_date: (formData.get('cte_date') as string) || null,
      delivery_date: (formData.get('delivery_date') as string) || null,
      km_initial: Number(formData.get('km_initial')) || 0,
      km_final: Number(formData.get('km_final')) || 0,
      freight_value: Number(formData.get('freight_value')),
      advance_value: Number(formData.get('advance_value')),
      type: formData.get('type') as 'ida' | 'volta',
      status: formData.get('status') as any
    };

    // Remove any fields that are literally the string "undefined"
    Object.keys(tripData).forEach(key => {
      if ((tripData as any)[key] === 'undefined') {
        (tripData as any)[key] = null;
      }
    });

    try {
      if (editingTrip) {
        await dbService.updateTrip(editingTrip.id, tripData);
        showToast('Frete atualizado com sucesso!', 'success');
      } else {
        await dbService.addTrip(tripData);
        showToast('Frete cadastrado com sucesso!', 'success');
      }
      setIsModalOpen(false);
      setEditingTrip(null);
      refresh();
    } catch (error: any) {
      console.error('Erro ao salvar frete:', error);
      showToast(error.message || 'Erro ao salvar frete', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dbService.deleteTrip(deleteId);
      showToast('Frete excluído com sucesso!', 'success');
      refresh();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      showToast(error.message || 'Erro ao excluir', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-full max-w-md"></div>
        <div className="panel h-96 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por motorista, destino ou CTE..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-brand-panel border border-brand-border text-brand-text focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all rounded-xl shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button className="btn-secondary">
            <Filter size={16} />
            <span>Filtros Avançados</span>
          </button>
          <button 
            onClick={() => { setEditingTrip(null); setIsModalOpen(true); }}
            className="btn-primary"
          >
            <Plus size={16} />
            <span>Novo Frete</span>
          </button>
        </div>
      </div>

      <div className="hidden md:block panel">
        <div className="panel-header flex items-center justify-between">
          <span className="font-bold text-brand-text-muted">Gestão Unificada de Fretes</span>
          <span className="text-[10px] font-mono font-bold text-brand-text-muted bg-brand-bg px-2 py-0.5 rounded border border-brand-border">{filteredTrips.length} OPERAÇÕES</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-table-header">
                <th className="px-6 py-4 label-tech">Motorista / Frota</th>
                <th className="px-6 py-4 label-tech">Rota Operacional</th>
                <th className="px-6 py-4 label-tech">Documentação</th>
                <th className="px-6 py-4 label-tech text-right">Valor Líquido</th>
                <th className="px-6 py-4 label-tech text-center">Situação</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredTrips.length === 0 ? (
                <tr><td colSpan={6} className="p-20 text-center text-brand-text-muted font-medium">Nenhum registro encontrado para este período.</td></tr>
              ) : (
                filteredTrips.map((trip, index) => (
                  <motion.tr 
                    key={trip.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => setExpenseTrip(trip as any)}
                    className="hover:bg-brand-bg transition-colors group border-b border-brand-border last:border-0 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-dark text-white rounded-lg flex items-center justify-center text-xs font-bold leading-none">
                          {trip.drivers?.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-brand-text leading-tight">{trip.drivers?.name}</p>
                          <p className="text-[11px] text-brand-text-muted font-medium font-mono tracking-tighter uppercase">{trip.trucks?.plate} • {trip.trucks?.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-brand-text uppercase">
                        <span className="text-brand-text-muted font-medium">{trip.origin}</span>
                        <ArrowRight size={12} className="text-brand-text-muted" />
                        <span className="text-brand-primary">{trip.destination}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-bold text-brand-text font-mono tracking-tight mb-0.5">#{trip.cte}</p>
                        <p className="text-[10px] text-brand-text-muted font-medium uppercase tracking-wider">{formatDate(trip.loading_date)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-brand-text tracking-tight">{formatCurrency(trip.freight_value)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block",
                        trip.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                        trip.status === 'completed' ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" : "bg-brand-bg text-brand-text-muted border border-brand-border"
                      )}>
                        {trip.status === 'paid' ? 'Liquidado' : trip.status === 'completed' ? 'Entregue' : 'Aberto'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setMergeSourceTrip(trip); }}
                          className="p-1.5 text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/5 rounded-md transition-all"
                          title="Mesclar Viagens"
                        >
                          <Merge size={15} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setExpenseTrip(trip as any); }}
                          className="p-1.5 text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/5 rounded-md transition-all"
                          title="Custos"
                        >
                          <Calculator size={15} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingTrip(trip); setIsModalOpen(true); }}
                          className="p-1.5 text-brand-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-all"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteId(trip.id); }}
                          className="p-1.5 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-4">
        {filteredTrips.map((trip) => (
          <div 
            key={trip.id} 
            onClick={() => setExpenseTrip(trip as any)}
            className="panel p-5 space-y-5 cursor-pointer hover:border-brand-primary/30 transition-all active:scale-[0.98]"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-dark text-white rounded-lg flex items-center justify-center font-bold">
                  {trip.drivers?.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-text">{trip.drivers?.name}</p>
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{trip.trucks?.plate}</p>
                </div>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest",
                trip.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
              )}>
                {trip.status === 'paid' ? 'Pago' : 'Aberto'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-y border-brand-border">
              <div className="text-left flex-1">
                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Origem</p>
                <p className="text-xs font-semibold text-brand-text">{trip.origin}</p>
              </div>
              <ArrowRight size={14} className="text-brand-text-muted" />
              <div className="text-right flex-1">
                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Destino</p>
                <p className="text-xs font-semibold text-brand-primary">{trip.destination}</p>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-[9px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">CTE #{trip.cte}</p>
                <p className="text-lg font-bold text-brand-text tracking-tight">{formatCurrency(trip.freight_value)}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setMergeSourceTrip(trip); }}
                  className="p-2 border border-brand-border rounded-lg text-brand-text-muted transition-all"
                  title="Mesclar Viagens"
                >
                  <Merge size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setExpenseTrip(trip as any); }}
                  className="p-2 border border-brand-border rounded-lg text-brand-text-muted"
                >
                  <Calculator size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingTrip(trip); setIsModalOpen(true); }}
                  className="p-2 border border-brand-border rounded-lg text-brand-text-muted"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeleteId(trip.id); }}
                  className="p-2 border border-red-500/20 rounded-lg text-red-500 bg-red-500/5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trip Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTrip ? 'Ajustar Frete Existente' : 'Registrar Novo Frete'}
      >
        <form onSubmit={handleSaveTrip} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label-tech mb-1.5 block">Motorista Operador</label>
              <select name="driver_id" defaultValue={editingTrip?.driver_id} required className="w-full">
                <option value="">Selecionar motorista...</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-tech mb-1.5 block">Cavalo (Tração)</label>
              <select name="truck_id" defaultValue={editingTrip?.truck_id} required className="w-full">
                <option value="">Selecionar cavalo...</option>
                {trucks.filter(t => t.type === 'cavalo').map(t => <option key={t.id} value={t.id}>{t.plate} - {t.model}</option>)}
              </select>
            </div>
            <div>
              <label className="label-tech mb-1.5 block">Implemento (Carreta)</label>
              <select name="trailer_id" defaultValue={editingTrip?.trailer_id} className="w-full">
                <option value="">Selecionar carreta...</option>
                {trucks.filter(t => t.type === 'carreta').map(t => <option key={t.id} value={t.id}>{t.plate} - {t.trailer_category === 'frigorifica' ? 'Frigorífica' : 'Normal'}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label-tech mb-1.5 block">Localização Origem</label>
              <input name="origin" defaultValue={editingTrip?.origin} required placeholder="Cidade de Origem" />
            </div>
            <div>
              <label className="label-tech mb-1.5 block">Localização Destino</label>
              <input name="destination" defaultValue={editingTrip?.destination} required placeholder="Cidade de Destino" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label className="label-tech mb-1.5 block">CTE (Documento)</label>
              <input name="cte" defaultValue={editingTrip?.cte} required placeholder="00000" />
            </div>
            <div>
              <label className="label-tech mb-1.5 block">Data Escala</label>
              <input type="date" name="loading_date" defaultValue={editingTrip?.loading_date} required />
            </div>
            <div>
              <label className="label-tech mb-1.5 block">Data Emissão</label>
              <input type="date" name="cte_date" defaultValue={editingTrip?.cte_date} />
            </div>
            <div>
              <label className="label-tech mb-1.5 block">Data Entrega</label>
              <input type="date" name="delivery_date" defaultValue={editingTrip?.delivery_date} />
            </div>
            <div>
              <label className="label-tech mb-1.5 block">KM Saída</label>
              <input type="number" name="km_initial" defaultValue={editingTrip?.km_initial || 0} placeholder="0" />
            </div>
            <div>
              <label className="label-tech mb-1.5 block">KM Chegada</label>
              <input type="number" name="km_final" defaultValue={editingTrip?.km_final || 0} placeholder="0" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label-tech mb-1.5 block">Tipo de Operação</label>
              <select name="type" defaultValue={editingTrip?.type || 'ida'} required className="w-full">
                <option value="ida">Ida (Carregamento)</option>
                <option value="volta">Volta (Retorno)</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label-tech mb-1.5 block">Status Operação</label>
              <select name="status" defaultValue={editingTrip?.status || 'pending'} className="w-full">
                <option value="pending">Pendente</option>
                <option value="completed">Entregue</option>
                <option value="paid">Financeiro Liquidado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="label-tech mb-1.5 block">Valor do Frete Net (R$)</label>
              <input type="number" step="0.01" name="freight_value" defaultValue={editingTrip?.freight_value} required placeholder="0.00" />
            </div>
          </div>

          <button 
            disabled={isSubmitting}
            className="w-full btn-primary mt-4"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              editingTrip ? 'Confirmar Atualização' : 'Efetivar Cadastro'
            )}
          </button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este frete? Esta ação não pode ser desfeita."
        variant="danger"
      />

      {expenseTrip && (
        <TripExpenseModal 
          isOpen={!!expenseTrip}
          onClose={() => setExpenseTrip(null)}
          trip={expenseTrip}
          onUpdateTrip={refresh}
        />
      )}

      {mergeSourceTrip && (
        <MergeTripModal 
          isOpen={!!mergeSourceTrip}
          onClose={() => setMergeSourceTrip(null)}
          sourceTrip={mergeSourceTrip}
          availableTrips={trips}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
