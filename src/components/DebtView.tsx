import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Edit2,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { dbService } from '../lib/dbService';
import { Modal } from './ui/Modal';
import { ConfirmModal } from './ui/ConfirmModal';
import { useDebts } from '../lib/hooks';
import { useToast } from './ui/Toast';

export function DebtView({ month, year }: { month: number, year: number }) {
  const { debts, loading, refresh } = useDebts();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const installments_count = Number(formData.get('installments_count'));
    const installments_paid = Number(formData.get('installments_paid'));
    const total_value = Number(formData.get('total_value'));
    const due_date = formData.get('due_date') as string;
    const person_name = formData.get('person_name') as string;
    const type = formData.get('type') as 'pagar' | 'receber';
    
    const data = {
      person_name,
      total_value,
      installments_count,
      installments_paid,
      due_date,
      type,
      status: installments_paid >= installments_count ? 'paid' : 'pending' as const
    };

    try {
      if (editingDebt?.id) {
        await dbService.updateDebt(editingDebt.id, data);
        showToast('Lançamento atualizado!', 'success');
      } else {
        await dbService.addDebt(data);
        showToast('Lançamento cadastrado!', 'success');
      }
      setIsModalOpen(false);
      setEditingDebt(null);
      refresh();
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error);
      showToast(error.message || 'Erro ao salvar lançamento', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInstallment = async (debt: any) => {
    if (debt.installments_paid >= debt.installments_count) return;

    const nextPaid = debt.installments_paid + 1;
    const isPaid = nextPaid >= debt.installments_count;
    
    // Calculate next due date
    const currentDate = new Date(debt.due_date + 'T12:00:00');
    const nextDate = new Date(currentDate);
    nextDate.setMonth(currentDate.getMonth() + 1);
    
    // Handle edge cases like 31st
    if (nextDate.getDate() !== currentDate.getDate()) {
      nextDate.setDate(0);
    }

    try {
      // Destructure to remove relations and metadata that shouldn't be sent back to Supabase
      const { drivers, trucks, created_at, ...cleanDebt } = debt;
      
      await dbService.updateDebt(debt.id, {
        ...cleanDebt,
        installments_paid: nextPaid,
        due_date: isPaid ? debt.due_date : nextDate.toISOString().split('T')[0],
        status: isPaid ? 'paid' : 'pending'
      });
      showToast(isPaid ? 'Dívida quitada!' : 'Parcela confirmada!', 'success');
      refresh();
    } catch (error: any) {
      console.error('Erro ao atualizar parcela:', error);
      showToast('Erro ao atualizar parcela', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dbService.deleteDebt(deleteId);
      showToast('Lançamento excluído', 'success');
      refresh();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      showToast(error.message || 'Erro ao excluir', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredDebts = debts.filter(d => {
    // 1. Filter by search term
    const matchesSearch = d.person_name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Filter by month/year (based on due_date)
    if (!d.due_date) return true;
    if (typeof d.due_date === 'string') {
      const [y, m] = d.due_date.split('-').map(Number);
      return y === year && (m - 1) === month;
    }
    const date = new Date(d.due_date);
    return date.getMonth() === month && date.getFullYear() === year;
  });

  const totalToPay = filteredDebts.filter(d => d.type === 'pagar' && d.status === 'pending').reduce((acc, d) => acc + (d.total_value || 0), 0);
  const totalToReceive = filteredDebts.filter(d => d.type === 'receber' && d.status === 'pending').reduce((acc, d) => acc + (d.total_value || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel h-32 animate-pulse bg-brand-bg/50"></div>
          <div className="panel h-32 animate-pulse bg-brand-bg/50"></div>
        </div>
        <div className="panel h-96 animate-pulse bg-brand-bg/50"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="panel p-6 border-l-4 border-l-red-500"
        >
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl flex items-center justify-center">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Passivo Circulante</p>
              <h3 className="text-2xl font-bold text-brand-text tracking-tight">{formatCurrency(totalToPay)}</h3>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="panel p-6 border-l-4 border-l-brand-primary"
        >
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Ativo Circulante</p>
              <h3 className="text-2xl font-bold text-brand-text tracking-tight">{formatCurrency(totalToReceive)}</h3>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar por credor ou devedor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-brand-panel border border-brand-border text-brand-text rounded-xl shadow-sm focus:ring-2 focus:ring-brand-primary/10 transition-all outline-none placeholder:text-brand-text-muted"
          />
        </div>
        
        <button 
          onClick={() => { setEditingDebt(null); setIsModalOpen(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          <span>Lançar Título</span>
        </button>
      </div>

      {/* Grid of Debts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredDebts.length === 0 ? (
            <div className="col-span-full py-24 text-center panel border-dashed border-2">
              <p className="text-brand-text-muted font-medium">Nenhum título para este período</p>
            </div>
          ) : (
            filteredDebts.map((debt, index) => (
              <motion.div
                key={debt.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "panel group transition-all duration-300",
                  debt.type === 'pagar' ? "border-l-4 border-l-red-500" : "border-l-4 border-l-brand-primary"
                )}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-brand-text leading-tight mb-1">{debt.person_name}</h4>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border inline-block",
                        debt.type === 'pagar' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                      )}>
                        {debt.type === 'pagar' ? 'Pagar' : 'Receber'}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingDebt(debt); setIsModalOpen(true); }}
                        className="p-1.5 text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => setDeleteId(debt.id)}
                        className="p-1.5 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1 text-left">Valor do Título</p>
                      <p className="text-2xl font-bold text-brand-text tracking-tight">
                        {formatCurrency(debt.total_value)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Vencimento</p>
                      <p className="text-sm font-bold text-brand-text bg-brand-bg px-2 py-0.5 rounded border border-brand-border font-mono italic">{formatDate(debt.due_date)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">
                      <span>Quitação</span>
                      <span className="text-brand-text">{debt.installments_paid} / {debt.installments_count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-brand-bg rounded-full overflow-hidden border border-brand-border">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(debt.installments_paid / debt.installments_count) * 100}%` }}
                        className={cn(
                          "h-full transition-all",
                          debt.type === 'pagar' ? "bg-red-500" : "bg-brand-primary"
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-brand-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {debt.status === 'paid' ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                          <CheckCircle2 size={14} />
                          Liquidado
                        </div>
                      ) : (
                        <button 
                          onClick={() => handlePayInstallment(debt)}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-dark text-white border border-brand-border hover:bg-brand-primary hover:text-black transition-all rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm"
                        >
                          <CheckCircle2 size={14} />
                          Liquidar Parcela
                        </button>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-brand-text-muted/30 group-hover:text-brand-text-muted group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingDebt?.id ? 'Corrigir Ficha Financeira' : 'Protocolar Novo Título'}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="label-tech mb-1.5 block">Nome do Colaborador / Credor</label>
            <input name="person_name" defaultValue={editingDebt?.person_name} required placeholder="Razão Social ou Nome Completo" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label-tech mb-1.5 block">Valor do Título (R$)</label>
              <input type="number" step="0.01" name="total_value" defaultValue={editingDebt?.total_value} required placeholder="0.00" />
            </div>
            <div>
              <label className="label-tech mb-1.5 block">Vcto da Unidade</label>
              <input type="date" name="due_date" defaultValue={editingDebt?.due_date} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label-tech mb-1.5 block">Total de Parcelas</label>
              <input type="number" name="installments_count" defaultValue={editingDebt?.installments_count || 1} required />
            </div>
            <div>
              <label className="label-tech mb-1.5 block">Parcelas Liquidadas</label>
              <input type="number" name="installments_paid" defaultValue={editingDebt?.installments_paid || 0} required />
            </div>
          </div>

          <div>
            <label className="label-tech mb-1.5 block">Natureza da Operação</label>
            <select name="type" defaultValue={editingDebt?.type || 'pagar'} className="w-full">
              <option value="pagar">Contas a Pagar (Passivo)</option>
              <option value="receber">Contas a Receber (Ativo)</option>
            </select>
          </div>

          <button 
            disabled={isSubmitting}
            className="w-full btn-primary mt-6"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              editingDebt?.id ? 'Efetivar Mudanças' : 'Selar Lançamento'
            )}
          </button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este lançamento financeiro? Esta ação não pode ser desfeita."
        variant="danger"
      />
    </div>
  );
}
