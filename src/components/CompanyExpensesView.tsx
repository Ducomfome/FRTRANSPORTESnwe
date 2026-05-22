import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search,
  Calendar,
  DollarSign,
  FileText,
  Filter,
  TrendingDown,
  Paperclip,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/dbService';
import { CompanyExpense } from '../types';
import { formatCurrency, formatDate, cn, openDocument } from '../lib/utils';
import { Modal } from './ui/Modal';
import { ConfirmModal } from './ui/ConfirmModal';
import { useCompanyExpenses } from '../lib/hooks';
import { useToast } from './ui/Toast';
import { FileDropzone } from './ui/FileDropzone';
import { DocPreviewModal } from './ui/DocPreviewModal';

export function CompanyExpensesView({ month, year }: { month: number, year: number }) {
  const { expenses, loading, refresh } = useCompanyExpenses();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CompanyExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  const handleFileDrop = async (file: File) => {
    setIsUploading(true);
    try {
      const fileName = `company_expense_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const bucket = 'documents';
      const publicUrl = await dbService.uploadFile(bucket, fileName, file);
      
      setReceiptUrl(publicUrl);
      showToast('Comprovante carregado!', 'success');
    } catch (error: any) {
      showToast(`Erro no upload: ${error.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      value: Number(formData.get('value')),
      category: formData.get('category') as string,
      receipt_url: receiptUrl || undefined
    };

    try {
      if (editingExpense) {
        await dbService.updateCompanyExpense(editingExpense.id, data);
        showToast('Gasto atualizado!', 'success');
      } else {
        await dbService.addCompanyExpense(data);
        showToast('Gasto cadastrado!', 'success');
      }
      setIsModalOpen(false);
      setEditingExpense(null);
      setReceiptUrl('');
      refresh();
    } catch (error: any) {
      console.error('Erro ao salvar gasto:', error);
      showToast(error.message || 'Erro ao salvar gasto', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dbService.deleteCompanyExpense(deleteId);
      showToast('Gasto excluído com sucesso!', 'success');
      refresh();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      showToast(error.message || 'Erro ao excluir gasto', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    // 1. Filter by search term
    const search = (searchTerm || '').toLowerCase();
    const description = (expense.description || '').toLowerCase();
    const category = (expense.category || '').toLowerCase();
    
    const matchesSearch = description.includes(search) || category.includes(search);
    if (!matchesSearch) return false;

    // 2. Filter by month/year
    const date = new Date(expense.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });

  const totalValue = filteredExpenses.reduce((sum, exp) => sum + exp.value, 0);

  return (
    <div className="space-y-8">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="panel p-8 flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest leading-tight">Despesas Administrativas</p>
              <h3 className="text-2xl font-bold text-brand-text tracking-tight">{formatCurrency(totalValue)}</h3>
            </div>
          </div>
          <div className="h-1 bg-red-500/10 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 w-2/3 rounded-full"></div>
          </div>
        </div>

        <div className="panel p-8 flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest leading-tight">Registros Salvos</p>
              <h3 className="text-2xl font-bold text-brand-text tracking-tight">{filteredExpenses.length} lançamentos</h3>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-8 bg-brand-dark rounded-3xl shadow-xl border border-brand-border">
          <button 
            onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}
            className="btn-primary"
          >
            <Plus size={18} />
            Lançar Protocolo
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar por descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-brand-panel border border-brand-border text-brand-text rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all shadow-sm text-sm placeholder:text-brand-text-muted"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="panel overflow-hidden border-none shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-brand-border">
                <th className="px-8 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Data</th>
                <th className="px-8 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Identificação</th>
                <th className="px-8 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-center">Classificação</th>
                <th className="px-8 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Montante</th>
                <th className="px-8 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-4 h-16">
                        <div className="h-4 bg-brand-bg rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
                        <TrendingDown size={32} />
                      </div>
                      <p className="text-brand-text-muted font-medium italic">Nenhum lançamento no quadrante atual.</p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <motion.tr 
                      key={expense.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-brand-bg/30 transition-colors group"
                    >
                      <td className="px-8 py-4">
                        <span className="text-xs font-bold text-brand-text font-mono tracking-tight">
                          {formatDate(expense.date)}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-brand-bg text-brand-text-muted rounded-lg flex items-center justify-center">
                            <FileText size={14} />
                          </div>
                          <span className="text-sm font-semibold text-brand-text tracking-tight">{expense.description}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="px-3 py-1 bg-brand-bg text-brand-text-muted rounded-lg text-[9px] font-bold uppercase tracking-widest border border-brand-border">
                          {expense.category || 'Geral'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className="text-sm font-bold text-red-500 font-mono tracking-tighter">
                          {formatCurrency(expense.value)}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {expense.receipt_url && (
                            <button 
                              onClick={() => {
                                setPreviewUrl(expense.receipt_url!);
                                setPreviewTitle(expense.description || 'comprovante');
                                setIsPreviewOpen(true);
                              }}
                              className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
                              title="Visualizar Comprovante"
                            >
                              <Download size={16} />
                            </button>
                          )}
          <button 
            onClick={() => { 
              setEditingExpense(expense); 
              setReceiptUrl(expense.receipt_url || '');
              setIsModalOpen(true); 
            }}
            className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-bg rounded-xl transition-all"
            title="Ajustar"
          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteId(expense.id)}
                            className="p-2 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingExpense ? 'Ajustar Lançamento' : 'Novo Protocolo Administrativo'}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label-tech mb-2">Data do Evento</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="date" 
                  name="date" 
                  defaultValue={editingExpense?.date || new Date().toISOString().split('T')[0]} 
                  required 
                  className="pl-12" 
                />
              </div>
            </div>
            <div>
              <label className="label-tech mb-2">Montante (BRL)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="number" 
                  step="0.01" 
                  name="value" 
                  defaultValue={editingExpense?.value} 
                  required 
                  className="pl-12 font-bold" 
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label-tech mb-2">Identificação / Finalidade</label>
            <input 
              name="description" 
              defaultValue={editingExpense?.description} 
              required 
              placeholder="Ex: Pagamento Internet, Tributos..." 
            />
          </div>

          <div>
            <label className="label-tech mb-2">Classificação Contábil</label>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select 
                name="category" 
                defaultValue={editingExpense?.category || 'Fixa'} 
                className="pl-12 pr-10 appearance-none"
              >
                <option value="Fixa">Despesa Fixa</option>
                <option value="Variavel">Despesa Variável</option>
                <option value="Escritorio">Escritório</option>
                <option value="Manutencao">Manutenção Geral</option>
                <option value="Impostos">Impostos e Taxas</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-tech mb-2">Comprovante / NF (Arraste aqui)</label>
            <FileDropzone 
              onFileSelect={handleFileDrop}
              isUploading={isUploading}
              currentValue={receiptUrl}
              onClear={() => setReceiptUrl('')}
            />
          </div>

          <button 
            disabled={isSubmitting || isUploading}
            className="w-full btn-primary mt-4"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              editingExpense ? 'Efetivar Alteração' : 'Consolidar Lançamento'
            )}
          </button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este lançamento de gasto? Esta ação não pode ser desfeita."
        variant="danger"
      />

      <DocPreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        fileUrl={previewUrl} 
        title={previewTitle} 
      />
    </div>
  );
}
