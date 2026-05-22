import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Calculator, 
  Truck, 
  Fuel, 
  Receipt,
  ArrowDownCircle,
  TrendingUp,
  X,
  Paperclip,
  Download,
  Loader2,
  Edit2,
  CreditCard,
  ArrowLeftRight,
  Printer,
  Info,
  Copy
} from 'lucide-react';
import { dbService } from '../lib/dbService';
import { Trip, TripExpense } from '../types';
import { formatCurrency, formatDate, cn, openDocument } from '../lib/utils';
import { useToast } from './ui/Toast';
import { FileDropzone } from './ui/FileDropzone';
import { Modal } from './ui/Modal';
import { DocPreviewModal } from './ui/DocPreviewModal';

interface TripExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onUpdateTrip: () => void;
}

// Modal de gastos da viagem
export function TripExpenseModal({ isOpen, onClose, trip, onUpdateTrip }: TripExpenseModalProps) {
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [kmInitial, setKmInitial] = useState(trip.km_initial || 0);
  const [kmFinal, setKmFinal] = useState(trip.km_final || 0);
  const [expenseType, setExpenseType] = useState<'fuel' | 'diverse' | 'advance' | 'driver_payment'>('fuel');
  const [responsibleParty, setResponsibleParty] = useState<'ederval' | 'loirinho'>('ederval');
  const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadExpenses();
      setKmInitial(trip.km_initial || 0);
      setKmFinal(trip.km_final || 0);
    }
  }, [isOpen, trip.id, trip.km_initial, trip.km_final]);

  const loadExpenses = async () => {
    try {
      const data = await dbService.getTripExpenses(trip.id);
      setExpenses(data);
    } catch (error) {
      console.error('Erro ao carregar gastos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = async (file: File) => {
    setIsUploading(true);
    try {
      const fileName = `expense_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const bucket = 'documents';
      const publicUrl = await dbService.uploadFile(bucket, fileName, file);
      
      setReceiptUrl(publicUrl);
      showToast('Comprovante anexado!', 'success');
    } catch (error: any) {
      showToast(`Erro no upload: ${error.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as 'fuel' | 'diverse' | 'advance' | 'driver_payment';
    
    const expenseData = {
      trip_id: trip.id,
      type,
      responsible_party: responsibleParty,
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      value: Number(formData.get('value')),
      liters: type === 'fuel' ? Number(formData.get('liters')) : undefined,
      receipt_url: receiptUrl || undefined
    };

    try {
      if (editingExpense) {
        await dbService.updateTripExpense(editingExpense.id, expenseData);
        showToast('Gasto atualizado!', 'success');
        setEditingExpense(null);
        setReceiptUrl('');
      } else {
        await dbService.addTripExpense(expenseData);
        showToast('Gasto adicionado!', 'success');
        setReceiptUrl('');
      }
      loadExpenses();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar gasto', 'error');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await dbService.deleteTripExpense(id);
      showToast('Gasto excluído!', 'success');
      loadExpenses();
    } catch (error: any) {
      showToast(error.message || 'Erro ao excluir gasto', 'error');
    }
  };

  const handleUpdateKM = async () => {
    try {
      await dbService.updateTrip(trip.id, { 
        km_initial: kmInitial, 
        km_final: kmFinal 
      });
      showToast('KMs atualizados!', 'success');
      onUpdateTrip();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar KM', 'error');
    }
  };

  const handleToggleResponsible = async (expense: TripExpense) => {
    try {
      const newParty = (expense.responsible_party === 'loirinho') ? 'ederval' : 'loirinho';
      await dbService.updateTripExpense(expense.id, { responsible_party: newParty });
      loadExpenses();
      showToast('Responsável alterado com sucesso', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro ao alterar responsável', 'error');
    }
  };

  const totalFuel = expenses.filter(e => e.type === 'fuel').reduce((sum, e) => sum + e.value, 0);
  const totalLiters = expenses.filter(e => e.type === 'fuel').reduce((sum, e) => sum + (e.liters || 0), 0);
  const totalDiverse = expenses.filter(e => e.type === 'diverse').reduce((sum, e) => sum + e.value, 0);
  const totalAdvances = expenses.filter(e => e.type === 'advance' || e.type === 'driver_payment').reduce((sum, e) => sum + e.value, 0);
  
  // Totais por Responsável (Default: Ederval se estiver vazio)
  const totalEderval = expenses.filter(e => e.responsible_party === 'ederval' || !e.responsible_party).reduce((sum, e) => sum + e.value, 0);
  const totalLoirinho = expenses.filter(e => e.responsible_party === 'loirinho').reduce((sum, e) => sum + e.value, 0);
  
  // Despesas Operacionais (Abastecimento + Diversos + Adiantamentos/Pagamentos)
  const totalOperationalExpenses = totalFuel + totalDiverse + totalAdvances;
  
  // Lucro = Frete - Despesas Operacionais (Combustível, Borracharia, Pagamento Motorista, etc)
  const profit = trip.freight_value - totalOperationalExpenses;
  
  const kmTraveled = kmFinal > kmInitial ? kmFinal - kmInitial : 0;
  const fuelMedia = kmTraveled > 0 && totalLiters > 0 ? (kmTraveled / totalLiters).toFixed(2) : '0.00';

  const handleCopyReport = () => {
    try {
      let reportText = `FR TRANSPORTES - GESTÃO DE TRANSPORTES E FROTAS\n`;
      reportText += `RELATÓRIO DETALHADO DE VIAGEM E GASTOS\n`;
      reportText += `ID Viagem: #${trip.id.substring(0, 8)}\n`;
      reportText += `Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
      
      reportText += `=== DETALHES DA OPERAÇÃO ===\n`;
      reportText += `- Motorista: ${trip.drivers?.name || 'Não informado'}\n`;
      reportText += `- Veículo (Placa): ${trip.trucks?.plate || 'Não informado'}\n`;
      reportText += `- Rota: ${trip.origin} → ${trip.destination}\n`;
      reportText += `- CT-e: ${trip.cte || 'Não informado'}\n`;
      reportText += `- Data Carregamento: ${formatDate(trip.loading_date)}\n\n`;
      
      reportText += `=== RESUMO FINANCEIRO ===\n`;
      reportText += `- Valor do Frete Bruto: ${formatCurrency(trip.freight_value)}\n`;
      reportText += `- Total de Despesas Operacionais: ${formatCurrency(totalOperationalExpenses)}\n`;
      reportText += `- Resultado Líquido (Lucro): ${formatCurrency(profit)}\n`;
      reportText += `- Margem de Lucro: ${trip.freight_value > 0 ? Math.round((profit / trip.freight_value) * 100) : 0}%\n\n`;
      
      reportText += `=== DESEMPENHO E KM ===\n`;
      reportText += `- KM Inicial: ${kmInitial || '-'}\n`;
      reportText += `- KM Final: ${kmFinal || '-'}\n`;
      reportText += `- KM Rodados: ${kmTraveled || '0'} KM\n`;
      reportText += `- Consumo Médio: ${fuelMedia} KM/L\n\n`;
      
      reportText += `=== DETALHAMENTO DE DESPESAS ===\n`;
      expenses.forEach((exp) => {
        const dateStr = formatDate(exp.date);
        const typeStr = exp.type === 'fuel' ? 'Diesel' : exp.type === 'diverse' ? 'Diverso' : 'Adiantamento';
        reportText += `• Data: ${dateStr} | Tipo: ${typeStr} | Descrição: ${exp.description} ${exp.liters ? `(${exp.liters} L)` : ''} | Valor: ${formatCurrency(exp.value || 0)}\n`;
      });
      
      navigator.clipboard.writeText(reportText);
      showToast('Relatório da viagem copiado para a área de transferência com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao copiar relatório. Por favor, tente selecionar e copiar o texto abaixo manualmente.', 'error');
    }
  };

  const handleDownloadPrintFile = () => {
    try {
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      let expensesRowsHtml = expenses.map(exp => {
        const expDate = formatDate(exp.date);
        const typeStr = exp.type === 'fuel' ? 'Diesel' : exp.type === 'diverse' ? 'Diverso' : 'Adiantamento';
        return `
          <tr>
            <td>${expDate}</td>
            <td style="text-transform:uppercase; font-size:8px; font-weight:bold;">${typeStr}</td>
            <td>${exp.description || ''} ${exp.liters ? `(${exp.liters} L)` : ''}</td>
            <td class="text-right font-mono" style="font-weight:bold;">${formatCurrency(exp.value || 0)}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Viagem - ${trip.origin} para ${trip.destination}</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; background-color: #fff; margin: 30px; font-size: 11px; line-height: 1.4; }
        .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px; }
        .header .subtitle { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-top: 3px; font-weight: bold; }
        .header .title-right { text-align: right; }
        .header .title-right h2 { margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; }
        .header .title-right p { margin: 2px 0 0 0; font-size: 9px; color: #666; }
        .info-box { border: 1.5px solid #000; padding: 12px; border-radius: 6px; background-color: #fcfcfc; margin-bottom: 25px; }
        .info-box h3 { margin: 0 0 10px 0; font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 4px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        @media (min-width: 768px) {
            .info-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .info-item { font-size: 10px; }
        .info-label { font-size: 7.5px; text-transform: uppercase; color: #666; font-weight: bold; margin-bottom: 2px; }
        .info-value { font-weight: bold; color: #000; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
        .summary-box { border: 1.5px solid #000; padding: 12px; border-radius: 6px; background-color: #fcfcfc; }
        .summary-box .label { font-size: 8px; text-transform: uppercase; font-weight: bold; color: #666; letter-spacing: 0.5px; }
        .summary-box .value { font-size: 18px; font-weight: 800; margin-top: 5px; color: #000; }
        .summary-box .desc { font-size: 8px; color: #888; margin-top: 3px; }
        .performance-box { border: 1px solid #000; padding: 12px; border-radius: 6px; margin-bottom: 25px; background-color: #fcfcfc; }
        .performance-box h3 { margin: 0 0 10px 0; font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        .performance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .delegation-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
        .delegation-box { border: 1px solid #000; padding: 12px; border-radius: 6px; background-color: #fafafa; }
        .delegation-box h3 { margin: 0 0 8px 0; font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; }
        .row-item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 9.5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        table th { border-bottom: 2px solid #000; padding: 6px 4px; text-align: left; font-weight: bold; font-size: 9px; text-transform: uppercase; background-color: #f5f5f5; }
        table td { border-bottom: 1px solid #e0e0e0; padding: 6px 4px; font-size: 9px; vertical-align: middle; }
        .text-right { text-align: right; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 12px; letter-spacing: 1px; }
        .footer-signatures { margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .signature-box { width: 220px; text-align: center; }
        .signature-line { border-top: 1px solid #000; padding-top: 5px; font-weight: bold; text-transform: uppercase; font-size: 9px; }
        .signature-sub { font-size: 8px; color: #666; margin-top: 2px; }
        .alert-info { background: #fffbeb; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin-bottom: 20px; font-size: 10px; color: #b45309; text-align: center; font-weight: bold; }
        @media print {
            .no-print { display: none; }
            body { margin: 15px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>FR TRANSPORTES</h1>
            <div class="subtitle">Gestão de Transportes e Frotas</div>
        </div>
        <div class="title-right">
            <h2>Relatório Detalhado de Viagem e Gastos</h2>
            <p><strong>ID Viagem:</strong> #${trip.id.substring(0, 8)}</p>
            <p style="font-size: 8px;">Emitido em: ${dateStr} às ${timeStr}</p>
        </div>
    </div>

    <div class="info-box">
        <h3>Detalhes da Operação</h3>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Motorista</div>
                <div class="info-value">${trip.drivers?.name || 'Não informado'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Veículo (Placa)</div>
                <div class="info-value">${trip.trucks?.plate || 'Não informado'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Rota / Serviço</div>
                <div class="info-value">${trip.origin} &rarr; ${trip.destination}</div>
            </div>
            <div class="info-item">
                <div class="info-label">CT-e da Viagem</div>
                <div class="info-value font-mono">${trip.cte || 'Não informado'}</div>
            </div>
        </div>
    </div>

    <div class="summary-grid">
        <div class="summary-box">
            <div class="label">Valor do Frete Bruto</div>
            <div class="value">${formatCurrency(trip.freight_value)}</div>
            <div class="desc">Faturamento bruto do serviço</div>
        </div>
        <div class="summary-box">
            <div class="label">Total Despesas Operacionais</div>
            <div class="value">${formatCurrency(totalOperationalExpenses)}</div>
            <div class="desc">Diesel, manutenções, adiantamentos</div>
        </div>
        <div class="summary-box">
            <div class="label">Resultado Líquido (Lucro)</div>
            <div class="value" style="color: #15803d;">${formatCurrency(profit)}</div>
            <div class="desc">Margem de lucro: ${trip.freight_value > 0 ? Math.round((profit / trip.freight_value) * 100) : 0}%</div>
        </div>
    </div>

    <div class="performance-box">
        <h3>Monitoramento de Rodagem / Consumo</h3>
        <div class="performance-grid">
            <div>
                <div class="info-label">KM Inicial</div>
                <div class="info-value font-mono">${kmInitial || '-'}</div>
            </div>
            <div>
                <div class="info-label">KM Final</div>
                <div class="info-value font-mono">${kmFinal || '-'}</div>
            </div>
            <div>
                <div class="info-label">KM Rodados</div>
                <div class="info-value font-mono">${kmTraveled || '0'} KM</div>
            </div>
            <div>
                <div class="info-label">Consumo Médio</div>
                <div class="info-value font-mono">${fuelMedia} KM/L</div>
            </div>
        </div>
    </div>



    <div class="section-title">Detalhamento de Despesas da Viagem (${expenses.length} lançamentos)</div>
    <table>
        <thead>
            <tr>
                <th style="width: 80px;">Data</th>
                <th style="width: 120px;">Tipo</th>
                <th>Descrição / Notas</th>
                <th class="text-right" style="width: 100px;">Valor</th>
            </tr>
        </thead>
        <tbody>
            ${expensesRowsHtml || '<!-- no expenses -->'}
        </tbody>
    </table>

    <div class="footer-signatures">
        <div class="signature-box">
            <div class="signature-line">Assinatura do Motorista</div>
            <div class="signature-sub">${trip.drivers?.name || 'Não informado'}</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Assinatura da Admin (FR)</div>
            <div class="signature-sub">Relatório Operacional de Custo</div>
        </div>
    </div>

    <script>
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.print();
            }, 600);
        });
    </script>
</body>
</html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-viagem-FR-${trip.origin}-${trip.destination}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Arquivo de Impressão (HTML) gerado e baixado! Abra-o para imprimir ou salvar como PDF com perfeição instantânea!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar arquivo de impressão.', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Controle de Gastos - ${trip.drivers?.name}`} maxWidth="max-w-5xl">
      <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar print:hidden">
        {/* Botão de Impressão */}
        <div className="flex justify-end">
          <button 
            type="button"
            onClick={() => setIsPrintPreviewOpen(true)}
            className="px-4 py-2 bg-brand-dark text-white font-medium text-xs rounded border border-brand-border hover:bg-brand-primary hover:text-black transition-all cursor-pointer flex items-center gap-2 uppercase tracking-widest font-bold"
          >
            <Printer size={14} /> Visualizar & Imprimir Relatório
          </button>
        </div>
        
        {/* Trip Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="panel p-4 bg-brand-primary/10 border-brand-primary/20">
            <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-1">Valor do Frete</p>
            <p className="text-sm font-bold text-brand-text">{formatCurrency(trip.freight_value)}</p>
          </div>
          <div className="panel p-4 bg-red-500/10 border-red-500/20">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Total Despesas</p>
            <p className="text-sm font-bold text-red-500">{formatCurrency(totalOperationalExpenses)}</p>
          </div>
          <div className="panel p-4 bg-emerald-500/10 border-emerald-500/20">
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Resultado Líquido</p>
            <p className="text-sm font-bold text-emerald-500">{formatCurrency(profit)}</p>
          </div>
        </div>

        {/* KM Management */}
        <div className="panel p-6">
          <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Monitoramento de Rodagem
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1.5">KM Inicial</label>
              <input 
                type="number" 
                value={kmInitial} 
                onChange={(e) => setKmInitial(Number(e.target.value))}
                className="w-full px-4 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm font-bold text-brand-text placeholder:text-brand-text-muted"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1.5">KM Final</label>
              <input 
                type="number" 
                value={kmFinal} 
                onChange={(e) => setKmFinal(Number(e.target.value))}
                className="w-full px-4 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm font-bold text-brand-text placeholder:text-brand-text-muted"
              />
            </div>
            <div className="bg-red-500/5 p-2 rounded-lg border border-red-500/10 text-center">
              <p className="text-[9px] font-bold text-red-500/70 uppercase">Média Km/L</p>
              <p className="text-sm font-bold text-red-500">{fuelMedia}</p>
            </div>
            <button 
              onClick={handleUpdateKM}
              className="bg-brand-dark text-white border border-brand-border px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-black transition-all"
            >
              Atualizar KMs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Expense Form */}
          <div className="lg:col-span-1">
            <form onSubmit={handleSaveExpense} key={editingExpense?.id || 'new'} className="panel p-6 space-y-4 sticky top-0">
              <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>{editingExpense ? 'Editar Gasto' : 'Lançar Gasto'}</span>
                {editingExpense && <span className="text-[10px] text-brand-primary">Editando...</span>}
              </h3>
              
              <div>
                <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1.5">Tipo de Despesa</label>
                <select 
                  name="type" 
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value as any)}
                  required 
                  className="w-full px-4 py-2 border border-brand-border rounded-lg text-sm font-bold"
                >
                  <option value="fuel">Abastecimento</option>
                  <option value="diverse">Manutenção / Diversos</option>
                  <option value="advance">Pagamento Motorista / Adiantamento</option>
                  {/* driver_payment is deprecated due to DB constraints but kept here for type safety */}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1.5">Data</label>
                  <input 
                    type="date" 
                    name="date" 
                    required 
                    defaultValue={editingExpense?.date || new Date().toISOString().split('T')[0]} 
                    className="w-full px-4 py-2 border border-brand-border rounded-lg text-sm font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1.5">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="value" 
                    required 
                    defaultValue={editingExpense?.value || ''}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg text-sm font-bold" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1.5">Descrição</label>
                <input 
                  name="description" 
                  required 
                  defaultValue={editingExpense?.description || ''}
                  placeholder="Ex: Posto, Peças, Pagto..." 
                  className="w-full px-4 py-2 border border-brand-border rounded-lg text-sm font-bold" 
                />
              </div>

              {expenseType === 'fuel' && (
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1.5">Litros Abastecidos</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="liters" 
                    defaultValue={editingExpense?.liters || ''}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg text-sm font-bold" 
                    placeholder="0.00" 
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1.5">Comprovante (Arraste aqui)</label>
                <FileDropzone 
                  onFileSelect={handleFileDrop}
                  isUploading={isUploading}
                  currentValue={receiptUrl}
                  onClear={() => setReceiptUrl('')}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className={cn(
                    "w-full py-3 rounded-xl shadow-md disabled:opacity-50 font-bold text-xs uppercase tracking-widest transition-all",
                    editingExpense ? "bg-brand-primary text-white hover:bg-blue-600" : "bg-emerald-600 text-white hover:bg-emerald-700"
                  )}
                >
                  {editingExpense ? 'Confirmar Alteração' : 'Registrar Gasto'}
                </button>
                {editingExpense && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingExpense(null);
                      setExpenseType('fuel');
                    }}
                    className="w-full bg-brand-bg text-brand-text-muted border border-brand-border py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-brand-primary/10 transition-all"
                  >
                    Descartar Edição
                  </button>
                )}
              </div>
            </form>
          </div>
           {/* Expense Lists */}
          <div className="lg:col-span-2">
            {/* Extrato de Lançamentos de Gastos */}
            <div className="panel overflow-hidden border-brand-border">
              <div className="panel-header py-3 px-4 flex justify-between items-center bg-brand-primary/5 border-b border-brand-border">
                <span className="flex items-center gap-2 text-brand-primary font-bold uppercase tracking-widest text-[10px]">
                  <CreditCard size={16} /> Extrato de Gastos da Viagem
                </span>
                <span className="text-xs font-bold text-brand-primary">{formatCurrency(totalOperationalExpenses)}</span>
              </div>
              <div className="max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs text-brand-text">
                  <thead className="sticky top-0 bg-brand-panel border-b border-brand-border shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-2.5 font-bold text-brand-text-muted uppercase tracking-widest text-[9px]">Descrição</th>
                      <th className="px-4 py-2.5 font-bold text-brand-text-muted uppercase tracking-widest text-[9px]">Tipo</th>
                      <th className="px-4 py-2.5 font-bold text-brand-text-muted uppercase tracking-widest text-[9px] text-right font-mono">Valor</th>
                      <th className="px-4 py-2.5 text-right w-[100px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id} className="border-b border-brand-border hover:bg-brand-bg/50 group transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-brand-text">{e.description}</p>
                          <p className="text-[10px] text-brand-text-muted font-medium">{formatDate(e.date)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-widest font-mono",
                            e.type === 'fuel' ? "bg-red-500/10 text-red-500" : 
                            (e.type === 'driver_payment' || e.type === 'advance') ? "bg-emerald-500/10 text-emerald-500" :
                            "bg-brand-primary/10 text-brand-primary"
                          )}>
                            {(e.type === 'driver_payment' || e.type === 'advance') ? 'Pagto/Vale' : e.type === 'fuel' ? 'Combustível' : 'Diversos'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-brand-text">{formatCurrency(e.value)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {e.receipt_url && (
                              <button 
                                onClick={() => {
                                  setPreviewUrl(e.receipt_url!);
                                  setPreviewTitle(e.description || 'comprovante');
                                  setIsPreviewOpen(true);
                                }} 
                                className="p-1.5 text-brand-primary hover:bg-brand-primary/10 rounded-lg cursor-pointer" 
                                title="Visualizar Comprovante"
                              >
                                <Download size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => { 
                                setEditingExpense(e); 
                                setExpenseType(e.type); 
                                setResponsibleParty(e.responsible_party || 'ederval');
                                setReceiptUrl(e.receipt_url || '');
                              }} 
                              className="p-1.5 text-brand-text-muted hover:text-brand-primary cursor-pointer"
                              title="Editar Lançamento"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(e.id)} 
                              className="p-1.5 text-red-500/50 hover:text-red-500 cursor-pointer"
                              title="Excluir Lançamento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-brand-text-muted italic opacity-50 uppercase text-[9px] tracking-widest">Nenhum lançamento foi cadastrado nesta viagem</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO/IMPRESSÃO DO RELATÓRIO DA VIAGEM */}
      <Modal 
        isOpen={isPrintPreviewOpen} 
        onClose={() => setIsPrintPreviewOpen(false)} 
        title={`Relatório da Viagem - ${trip.origin} → ${trip.destination}`}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar print:hidden">
          <div className="flex justify-end gap-3 pb-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded tracking-wider flex items-center gap-2 uppercase cursor-pointer transition-all"
            >
              <Copy size={14} /> Copiar Relatório (Texto)
            </button>
            <button
              onClick={handleDownloadPrintFile}
              className="px-4 py-2 bg-brand-primary text-black font-bold text-xs rounded hover:bg-opacity-90 tracking-wider flex items-center gap-2 uppercase cursor-pointer"
            >
              <Printer size={14} /> Chamar Impressão / Salvar PDF
            </button>
            <button
              onClick={() => setIsPrintPreviewOpen(false)}
              className="px-4 py-2 bg-brand-dark text-brand-text-muted font-bold text-xs rounded border border-brand-border hover:text-white tracking-wider uppercase cursor-pointer"
            >
              Voltar ao Controle
            </button>
          </div>

          {/* DOCUMENT PREVIEW IN BLUEPRINT THEME SHEET */}
          <div className="bg-white text-black p-8 rounded-xl shadow-inner border border-gray-200 mx-auto max-w-4xl text-[11px] leading-relaxed select-all">
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-black">FR TRANSPORTES</h1>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Gestão de Transportes e Frotas</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold uppercase text-black">Relatório Detalhado de Viagem e Gastos</h2>
                <p className="text-[10px] font-medium text-gray-400 font-mono">ID Viagem: #{trip.id.substring(0, 8)}</p>
                <p className="text-[9px] text-gray-400 font-mono">Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Informações da Operação */}
            <div className="border border-black p-4 rounded mb-6 bg-gray-50/50">
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3 pb-1 border-b border-black">DETALHES DA OPERAÇÃO</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-[10px]">
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[8px] font-bold mb-0.5">Motorista</p>
                  <p className="font-bold text-black">{trip.drivers?.name || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[8px] font-bold mb-0.5">Veículo (Placa)</p>
                  <p className="font-bold text-black">{trip.trucks?.plate || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[8px] font-bold mb-0.5">Rota / Serviço</p>
                  <p className="font-bold text-black">{trip.origin} → {trip.destination}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[8px] font-bold mb-0.5">CT-e da Viagem</p>
                  <p className="font-bold text-black font-mono">{trip.cte || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[8px] font-bold mb-0.5">Data de Carregamento</p>
                  <p className="font-semibold text-black">{formatDate(trip.loading_date)}</p>
                </div>
              </div>
            </div>

            {/* Resumo Financeiro da Viagem */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="border border-black p-3 rounded">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider mb-1">Valor do Frete Bruto</p>
                <p className="text-lg font-bold">{formatCurrency(trip.freight_value)}</p>
              </div>
              <div className="border border-black p-3 rounded">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider mb-1">Total de Despesas Operacionais</p>
                <p className="text-lg font-bold">{formatCurrency(totalOperationalExpenses)}</p>
              </div>
              <div className="border border-black p-3 rounded">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider mb-1">Resultado Líquido (Lucro)</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(profit)}</p>
                <p className="text-[8px] font-semibold text-gray-500">Margem de Lucro: {trip.freight_value > 0 ? Math.round((profit / trip.freight_value) * 100) : 0}%</p>
              </div>
            </div>

            {/* Desempenho e KM */}
            <div className="border border-black p-3 rounded mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 pb-1 border-b border-gray-200">Monitoramento de Rodagem / Consumo</h3>
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[8px]">KM Inicial</p>
                  <p className="font-bold font-mono">{kmInitial || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[8px]">KM Final</p>
                  <p className="font-bold font-mono">{kmFinal || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[8px]">KM Rodados</p>
                  <p className="font-bold font-mono">{kmTraveled || '0'} KM</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[8px]">Consumo Médio</p>
                  <p className="font-semibold">{fuelMedia} KM/L</p>
                </div>
              </div>
            </div>



            {/* Extrato de Lançamentos Detalhados da Viagem */}
            <div className="mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 pb-1 border-b-2 border-black">DETALHAMENTO DE DESPESAS DA VIAGEM ({expenses.length} LANÇAMENTOS)</h3>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-black text-left font-bold bg-gray-50">
                    <th className="py-1 px-1 w-[80px]">Data</th>
                    <th className="py-1 px-1 w-[120px]">Tipo</th>
                    <th className="py-1 px-1">Descrição / Notas</th>
                    <th className="py-1 px-1 text-right w-[100px]">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-gray-100">
                      <td className="py-1.5 px-1">{formatDate(exp.date)}</td>
                      <td className="py-1.5 px-1 text-[9px] uppercase font-semibold text-gray-600">
                        {exp.type === 'fuel' ? 'Diesel' : exp.type === 'diverse' ? 'Diverso/Manut' : 'Comissão/Vale'}
                      </td>
                      <td className="py-1.5 px-1">
                        {exp.description} {exp.liters && `(${exp.liters} Litros)`}
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-semibold text-black">{formatCurrency(exp.value)}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center italic text-gray-500">Nenhum gasto registrado para esta viagem.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Assinaturas / Notas de rodapé */}
            <div className="mt-12 pt-8 border-t border-gray-300 flex justify-between text-[9px] text-gray-500">
              <div className="w-[200px] text-center">
                <div className="border-t border-black pt-1 font-semibold uppercase text-black">Assinatura do Motorista</div>
                <p className="mt-1">{trip.drivers?.name || 'Não informado'}</p>
              </div>
              <div className="w-[200px] text-center">
                <div className="border-t border-black pt-1 font-semibold uppercase text-black">Assinatura da Admin (FR)</div>
                <p className="mt-1">Relatório Operacional de Custo</p>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO EXCLUSIVA PARA IMPRESSÃO REAL DO RELATÓRIO DA VIAGEM */}
        <div className="hidden print:block bg-white text-black p-4 w-full h-auto font-sans text-[11px] leading-relaxed">
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-black">FR TRANSPORTES</h1>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Gestão de Transportes e Frotas</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold uppercase text-black">Relatório Detalhado de Viagem e Gastos</h2>
              <p className="text-[10px] font-medium text-gray-400 font-mono">ID Viagem: #{trip.id.substring(0, 8)}</p>
              <p className="text-[9px] text-gray-400 font-mono">Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="border border-black p-4 rounded mb-6 bg-gray-50/50 text-[10px]">
            <h3 className="font-bold uppercase tracking-wider mb-3 pb-1 border-b border-black">DETALHES DA OPERAÇÃO</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><strong>Motorista:</strong> {trip.drivers?.name || 'Não informado'}</div>
              <div><strong>Veículo:</strong> {trip.trucks?.plate || 'Não informado'}</div>
              <div><strong>Serviço:</strong> {trip.origin} → {trip.destination}</div>
              <div><strong>CT-e:</strong> {trip.cte || 'Não informado'}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6 text-[10px]">
            <div className="border border-black p-2">
              <p className="text-gray-500">Frete Bruto</p>
              <p className="text-sm font-bold">{formatCurrency(trip.freight_value)}</p>
            </div>
            <div className="border border-black p-2">
              <p className="text-gray-500">Total Despesas</p>
              <p className="text-sm font-bold">{formatCurrency(totalOperationalExpenses)}</p>
            </div>
            <div className="border border-black p-2">
              <p className="text-gray-500">Saldo Líquido</p>
              <p className="text-sm font-bold">{formatCurrency(profit)}</p>
            </div>
          </div>

          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-black text-left font-bold bg-gray-50">
                <th className="py-1">Data</th>
                <th className="py-1">Tipo</th>
                <th className="py-1">Descrição</th>
                <th className="py-1 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-gray-200">
                  <td className="py-1">{formatDate(exp.date)}</td>
                  <td className="py-1">{exp.type === 'fuel' ? 'Diesel' : exp.type === 'diverse' ? 'Diverso' : 'Adiantamento'}</td>
                  <td className="py-1">{exp.description} {exp.liters && `(${exp.liters} L)`}</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(exp.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 pt-8 border-t border-gray-300 flex justify-between text-[9px]">
            <div className="w-[180px] text-center border-t border-black pt-1">Assinatura do Motorista</div>
            <div className="w-[180px] text-center border-t border-black pt-1 font-bold">FR TRANSPORTES</div>
          </div>
        </div>
      </Modal>

      <DocPreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        fileUrl={previewUrl} 
        title={previewTitle} 
      />
    </Modal>
  );
}
