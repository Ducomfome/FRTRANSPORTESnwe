import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Fuel, Wrench, Printer, Info, Copy } from 'lucide-react';
import { dbService } from '../lib/dbService';
import { supabase } from '../lib/supabase';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

export function FinancialView({ month, year }: { month: number, year: number }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [tripExpenses, setTripExpenses] = useState<any[]>([]);
  const [companyExpenses, setCompanyExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const { showToast } = useToast();

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleCopyReport = () => {
    try {
      let reportText = `FR TRANSPORTES - GESTÃO DE TRANSPORTES E FROTAS\n`;
      reportText += `RELATÓRIO MENSAL DE GASTOS E VIAGENS\n`;
      reportText += `Período: ${MONTH_NAMES[month]} de ${year}\n`;
      reportText += `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
      
      reportText += `=== RESUMO FINANCEIRO ===\n`;
      reportText += `Receita Mensal Bruta (Faturamento): ${formatCurrency(totalRevenue)}\n`;
      reportText += `Gastos Totais do Caixa: ${formatCurrency(totalAllExpenses)}\n`;
      reportText += `Resultado Líquido (Lucro): ${formatCurrency(netProfit)}\n`;
      reportText += `Margem Líquida: ${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%\n\n`;
      
      reportText += `=== CUSTOS DE OPERAÇÃO (VIAGENS) ===\n`;
      reportText += `- Combustível (Diesel): ${formatCurrency(totalFuel)}\n`;
      reportText += `- Manutenções & Diversificados: ${formatCurrency(totalDiverse)}\n`;
      reportText += `- Vales, Comissões e Pagamentos: ${formatCurrency(totalAdvances)}\n`;
      reportText += `- Total Operacional: ${formatCurrency(totalTripExpenses)}\n\n`;

      reportText += `=== CUSTOS ADMINISTRATIVOS ===\n`;
      reportText += `- Total Administrativo: ${formatCurrency(totalCompanyExpenses)}\n\n`;
      
      reportText += `=== DEMONSTRATIVO DE VIAGENS ===\n`;
      trips.forEach((trip) => {
        const tripCosts = tripExpenses
          .filter((e) => e.trip_id === trip.id)
          .reduce((sum, e) => sum + (e.value || 0), 0);
        const tripNet = (trip.freight_value || 0) - tripCosts;
        const dateStr = formatDate(trip.loading_date);
        reportText += `• Data: ${dateStr} | Motorista: ${trip.drivers?.name || 'Não informado'} (${trip.trucks?.plate || ''}) | Rota: ${trip.origin} → ${trip.destination} | Frete Bruto: ${formatCurrency(trip.freight_value || 0)} | Gasto: ${formatCurrency(tripCosts)} | Líquido: ${formatCurrency(tripNet)}\n`;
      });
      
      navigator.clipboard.writeText(reportText);
      showToast('Relatório copiado para a área de transferência com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao copiar relatório. Por favor, tente selecionar e copiar o texto abaixo manualmente.', 'error');
    }
  };

  const handleDownloadPrintFile = () => {
    try {
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      let tripsRowsHtml = trips.map(trip => {
        const tripCosts = tripExpenses
          .filter((e) => e.trip_id === trip.id)
          .reduce((sum, e) => sum + (e.value || 0), 0);
        const tripNet = (trip.freight_value || 0) - tripCosts;
        const tripDate = formatDate(trip.loading_date);
        return `
          <tr>
            <td>${tripDate}</td>
            <td><strong>${trip.drivers?.name || 'Não informado'}</strong> <span style="color:#666; font-size:8px;">(${trip.trucks?.plate || ''})</span></td>
            <td>${trip.origin} &rarr; ${trip.destination}</td>
            <td class="text-right font-mono">${formatCurrency(trip.freight_value || 0)}</td>
            <td class="text-right font-mono" style="color:#ef4444;">${formatCurrency(tripCosts)}</td>
            <td class="text-right font-mono" style="font-weight:bold; color:#10b981;">${formatCurrency(tripNet)}</td>
          </tr>
        `;
      }).join('');

      let tripExpensesRowsHtml = tripExpenses.map(exp => {
        const trip = trips.find((t) => t.id === exp.trip_id);
        const routeInfo = trip ? `${trip.origin}&rarr;${trip.destination}` : '';
        const driverName = trip?.drivers?.name || 'Desconhecido';
        const expDate = formatDate(exp.date);
        const typeStr = exp.type === 'fuel' ? 'Diesel' : exp.type === 'diverse' ? 'Diverso' : 'Adiantamento';
        return `
          <tr>
            <td>${expDate}</td>
            <td><strong>${driverName}</strong> <span style="color:#777; font-size:8px;">(${routeInfo})</span></td>
            <td style="text-transform:uppercase; font-size:8px; font-weight:bold;">${typeStr}</td>
            <td>${exp.description || ''} ${exp.liters ? `(${exp.liters} L)` : ''}</td>
            <td class="text-right font-mono" style="font-weight:bold;">${formatCurrency(exp.value || 0)}</td>
          </tr>
        `;
      }).join('');

      let companyExpensesRowsHtml = companyExpenses.map(exp => {
        const expDate = formatDate(exp.date);
        return `
          <tr>
            <td>${expDate}</td>
            <td style="text-transform:uppercase; font-size:8px; font-weight:bold;">${exp.category || 'Geral'}</td>
            <td>${exp.description || ''}</td>
            <td class="text-right font-mono" style="font-weight:bold;">${formatCurrency(exp.value || 0)}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório Mensal - FR Transportes</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; background-color: #fff; margin: 30px; font-size: 11px; line-height: 1.4; }
        .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px; }
        .header .subtitle { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-top: 3px; font-weight: bold; }
        .header .title-right { text-align: right; }
        .header .title-right h2 { margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; }
        .header .title-right p { margin: 2px 0 0 0; font-size: 9px; color: #666; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
        .summary-box { border: 1.5px solid #000; padding: 12px; border-radius: 6px; background-color: #fcfcfc; }
        .summary-box .label { font-size: 8px; text-transform: uppercase; font-weight: bold; color: #666; letter-spacing: 0.5px; }
        .summary-box .value { font-size: 18px; font-weight: 800; margin-top: 5px; color: #000; }
        .summary-box .desc { font-size: 8px; color: #888; margin-top: 3px; }
        .breakdown-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
        .breakdown-box { border: 1px solid #000; padding: 12px; border-radius: 6px; background-color: #fafafa; }
        .breakdown-box h3 { margin: 0 0 10px 0; font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; }
        .row-item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 9px; }
        .row-total { border-top: 1.5px dashed #000; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        table th { border-bottom: 2px solid #000; padding: 6px 4px; text-align: left; font-weight: bold; font-size: 9px; text-transform: uppercase; background-color: #f5f5f5; }
        table td { border-bottom: 1px solid #e0e0e0; padding: 6px 4px; font-size: 9px; vertical-align: middle; }
        .text-right { text-align: right; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 12px; letter-spacing: 1px; }
        .footer-signatures { margin-top: 60px; display: flex; justify-content: space-between; }
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
            <h2>Relatório Mensal de Gastos e Viagens</h2>
            <p><strong>Período:</strong> ${MONTH_NAMES[month]} de ${year}</p>
            <p style="font-size: 8px;">Emitido em: ${dateStr} às ${timeStr}</p>
        </div>
    </div>

    <div class="summary-grid">
        <div class="summary-box">
            <div class="label">Receita Mensal Bruta</div>
            <div class="value">${formatCurrency(totalRevenue)}</div>
            <div class="desc">Total de faturamento de fretes</div>
        </div>
        <div class="summary-box">
            <div class="label">Gastos Totais do Caixa</div>
            <div class="value">${formatCurrency(totalAllExpenses)}</div>
            <div class="desc">Gasto operacional + adm geral</div>
        </div>
        <div class="summary-box">
            <div class="label">Resultado Consolidado (Lucro)</div>
            <div class="value" style="color: #15803d;">${formatCurrency(netProfit)}</div>
            <div class="desc">Margem líquida: ${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%</div>
        </div>
    </div>

    <div class="breakdown-grid">
        <div class="breakdown-box">
            <h3>Custos de Operação (Viagens)</h3>
            <div class="row-item">
                <span>Combustível (Diesel):</span>
                <strong>${formatCurrency(totalFuel)}</strong>
            </div>
            <div class="row-item">
                <span>Manutenções & Diversificados:</span>
                <strong>${formatCurrency(totalDiverse)}</strong>
            </div>
            <div class="row-item">
                <span>Vales, Comissões e Pagamentos:</span>
                <strong>${formatCurrency(totalAdvances)}</strong>
            </div>
            <div class="row-item row-total">
                <span>Total Operacional:</span>
                <span>${formatCurrency(totalTripExpenses)}</span>
            </div>
        </div>
        <div class="breakdown-box">
            <h3>Custos Administrativos / Escritório</h3>
            <div class="row-item">
                <span>Despesas Gerais de Empresa:</span>
                <strong>${formatCurrency(totalCompanyExpenses)}</strong>
            </div>
            <div class="row-item row-total">
                <span>Total Administrativo:</span>
                <span>${formatCurrency(totalCompanyExpenses)}</span>
            </div>
        </div>
    </div>

    <div class="section-title">Demonstrativo Detalhado de Viagens</div>
    <table>
        <thead>
            <tr>
                <th style="width: 80px;">Data Loading</th>
                <th>Motorista / Placa</th>
                <th>Origem &rarr; Destino</th>
                <th class="text-right" style="width: 100px;">Frete Bruto</th>
                <th class="text-right" style="width: 100px;">Gasto Viagem</th>
                <th class="text-right" style="width: 100px;">Líquido</th>
            </tr>
        </thead>
        <tbody>
            ${tripsRowsHtml || '<!-- no trips -->'}
        </tbody>
    </table>

    <div style="page-break-before: always; height: 1px;"></div>

    <div class="section-title" style="margin-top:20px;">Extrato Detalhado de Gastos de Operação (${tripExpenses.length})</div>
    <table>
        <thead>
            <tr>
                <th style="width: 80px;">Data Gasto</th>
                <th>Motorista / Operação</th>
                <th style="width: 80px;">Tipo Despesa</th>
                <th>Descrição do Item</th>
                <th class="text-right" style="width: 100px;">Valor</th>
            </tr>
        </thead>
        <tbody>
            ${tripExpensesRowsHtml || '<!-- no trip expenses -->'}
        </tbody>
    </table>

    <div class="section-title">Detalhamento de Gastos Administrativos (${companyExpenses.length})</div>
    <table>
        <thead>
            <tr>
                <th style="width: 80px;">Data Gasto</th>
                <th style="width: 120px;">Categoria Adm</th>
                <th>Descrição / Fornecedor</th>
                <th class="text-right" style="width: 100px;">Valor</th>
            </tr>
        </thead>
        <tbody>
            ${companyExpensesRowsHtml || '<!-- no company expenses -->'}
        </tbody>
    </table>

    <div class="footer-signatures">
        <div class="signature-box">
            <div class="signature-line">Responsável Financeiro</div>
            <div class="signature-sub">FR Transportes e Logística</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Diretoria / Auditoria</div>
            <div class="signature-sub">FR Transportes</div>
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
      link.download = `relatorio-mensal-FR-${MONTH_NAMES[month]}-${year}.html`;
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsData, tripExpensesData, companyExpensesData] = await Promise.all([
          dbService.getTrips(),
          supabase.from('trip_expenses').select('*'),
          dbService.getCompanyExpenses()
        ]);
        
        // Filter by month/year
        const filteredTrips = tripsData.filter(t => {
          if (t.loading_date && typeof t.loading_date === 'string') {
            const [y, m] = t.loading_date.split('-').map(Number);
            return y === year && (m - 1) === month;
          }
          const date = new Date(t.loading_date);
          return date.getMonth() === month && date.getFullYear() === year;
        });

        const tripIds = new Set(filteredTrips.map(t => t.id));
        const filteredTripExpenses = (tripExpensesData.data || []).filter(e => tripIds.has(e.trip_id));

        const filteredCompanyExpenses = (companyExpensesData || []).filter(e => {
          if (e.date && typeof e.date === 'string') {
            const [y, m] = e.date.split('-').map(Number);
            return y === year && (m - 1) === month;
          }
          const date = new Date(e.date);
          return date.getMonth() === month && date.getFullYear() === year;
        });

        setTrips(filteredTrips);
        setTripExpenses(filteredTripExpenses);
        setCompanyExpenses(filteredCompanyExpenses);
      } catch (error) {
        console.error('Erro ao buscar dados financeiros:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [month, year]);

  // 1. Receita Bruta (Fretes)
  const totalRevenue = trips.reduce((acc, trip) => acc + (trip.freight_value || 0), 0);
  
  // 2. Despesas de Viagem (Diesel + Diversos + Pagamentos/Vales)
  const totalFuel = tripExpenses.filter(e => e.type === 'fuel').reduce((acc, e) => acc + (e.value || 0), 0);
  const totalDiverse = tripExpenses.filter(e => e.type === 'diverse').reduce((acc, e) => acc + (e.value || 0), 0);
  const totalAdvances = tripExpenses.filter(e => e.type === 'advance' || e.type === 'driver_payment').reduce((acc, e) => acc + (e.value || 0), 0);
  const totalTripExpenses = totalFuel + totalDiverse + totalAdvances;

  // 3. Gastos Gerais da Empresa
  const totalCompanyExpenses = companyExpenses.reduce((acc, e) => acc + (e.value || 0), 0);

  // 4. Despesa Total (Viagem + Empresa)
  const totalAllExpenses = totalTripExpenses + totalCompanyExpenses;

  // 5. Lucro Líquido Real (Receita - Tudo que saiu do caixa)
  const netProfit = totalRevenue - totalAllExpenses;

  const chartData = [
    { name: 'Faturamento', valor: totalRevenue, fill: '#f97316' },
    { name: 'Gastos Frota', valor: totalTripExpenses, fill: '#ef4444' },
    { name: 'Gastos Empresa', valor: totalCompanyExpenses, fill: '#f97316' },
    { name: 'Lucro Líquido', valor: netProfit, fill: '#10b981' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64 text-brand-primary animate-pulse font-bold">Calculando finanças...</div>;

  return (
    <>
      <div className="space-y-8 print:hidden">
        {/* Botão de Impressão */}
        <div className="flex justify-end">
          <button 
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-brand-dark text-white font-medium text-xs rounded border border-brand-border hover:bg-brand-primary hover:text-black transition-all cursor-pointer flex items-center gap-2 uppercase tracking-widest font-bold"
          >
            <Printer size={14} /> Visualizar & Imprimir Relatório
          </button>
        </div>

        {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-brand-dark p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group border border-brand-border">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={80} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/10 rounded-xl">
                <DollarSign size={20} className="text-brand-primary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted/60">Receita Bruta</span>
            </div>
            <h3 className="text-4xl font-bold tracking-tight mb-2">{formatCurrency(totalRevenue)}</h3>
            <p className="text-[10px] font-medium text-brand-text-muted/60 uppercase tracking-wider">Total de fretes no período</p>
          </div>
        </div>

        <div className="panel p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <TrendingDown size={20} className="text-red-500" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">Despesas Operacionais</span>
            </div>
            <h3 className="text-4xl font-bold tracking-tight text-brand-text mb-2">{formatCurrency(totalAllExpenses)}</h3>
            <p className="text-[10px] font-medium text-brand-text-muted uppercase tracking-wider">Saídas de caixa consolidadas</p>
          </div>
        </div>

        <div className="panel p-8 border-l-4 border-l-brand-primary flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand-primary/10 rounded-xl">
                <TrendingUp size={20} className="text-brand-primary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">Resultado Líquido</span>
            </div>
            <h3 className={cn(
              "text-4xl font-bold tracking-tight mb-2",
              netProfit >= 0 ? "text-brand-text" : "text-red-500"
            )}>
              {formatCurrency(netProfit)}
            </h3>
            <p className="text-[10px] font-medium text-brand-text-muted uppercase tracking-wider text-left">Margem de lucro após custos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Performance */}
        <div className="panel overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-[0.2em]">Fluxo de Caixa Mensal</h4>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
              <div className="w-2 h-2 rounded-full bg-brand-bg"></div>
            </div>
          </div>
          <div className="p-8 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted-color)', fontSize: 11, fontWeight: '700' }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px',
                    backgroundColor: 'var(--panel-color)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontWeight: '700',
                    fontSize: '12px',
                    padding: '12px',
                    color: 'var(--text-color)'
                  }}
                  itemStyle={{ color: 'var(--text-color)' }}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown de Despesas */}
        <div className="panel p-8 flex flex-col justify-between">
          <div className="space-y-10">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center">
                    <Fuel size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-brand-text uppercase tracking-widest">Gastos Operacionais</span>
                </div>
                <span className="text-sm font-bold text-brand-text font-mono tracking-tight">{formatCurrency(totalTripExpenses)}</span>
              </div>
              <div className="w-full bg-brand-bg rounded-full h-2 border border-brand-border overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${totalAllExpenses > 0 ? (totalTripExpenses / totalAllExpenses) * 100 : 0}%` }}
                  className="bg-red-500 h-full rounded-full transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-primary/10 text-brand-primary rounded-lg flex items-center justify-center">
                    <Wrench size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-brand-text uppercase tracking-widest">Gastos Administrativos</span>
                </div>
                <span className="text-sm font-bold text-brand-text font-mono tracking-tight">{formatCurrency(totalCompanyExpenses)}</span>
              </div>
              <div className="w-full bg-brand-bg rounded-full h-2 border border-brand-border overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${totalAllExpenses > 0 ? (totalCompanyExpenses / totalAllExpenses) * 100 : 0}%` }}
                  className="bg-brand-primary h-full rounded-full transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-brand-border mt-10">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-2">Margem Bruta</p>
                <p className={cn(
                  "text-4xl font-bold tracking-tight",
                  netProfit >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-2">Operating Ratio</p>
                <p className="text-2xl font-bold text-brand-text font-mono tracking-tight">
                  {totalRevenue > 0 ? Math.round((totalAllExpenses / totalRevenue) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* MODAL DE VISUALIZAÇÃO DO RELATÓRIO DO MÊS */}
      <Modal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        title={`Relatório Geral de Gastos do Mês - ${MONTH_NAMES[month]} / ${year}`}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar print:hidden">
          <div className="flex justify-end gap-3 pb-2">
            <button
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
              onClick={() => setIsPrintModalOpen(false)}
              className="px-4 py-2 bg-brand-dark text-brand-text-muted font-bold text-xs rounded border border-brand-border hover:text-white tracking-wider uppercase cursor-pointer"
            >
              Voltar ao Sistema
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
                <h2 className="text-sm font-bold uppercase text-black">Relatório Mensal de Gastos e Viagens</h2>
                <p className="text-[11px] font-medium text-gray-600 font-semibold">Período: {MONTH_NAMES[month]} de {year}</p>
                <p className="text-[9px] text-gray-400 font-mono">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Resumo Consolidado */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="border border-black p-3 rounded h-full">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider mb-1">Receita Mensal Bruta</p>
                <p className="text-lg font-extrabold">{formatCurrency(totalRevenue)}</p>
                <p className="text-[8px] text-gray-400">Total de faturamento de fretes</p>
              </div>
              <div className="border border-black p-3 rounded h-full">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider mb-1">Gastos Totais do Caixa</p>
                <p className="text-lg font-extrabold">{formatCurrency(totalAllExpenses)}</p>
                <p className="text-[8px] text-gray-400">Gasto operacional + adm geral</p>
              </div>
              <div className="border border-black p-3 rounded h-full">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider mb-1">Resultado Consolidado (Lucro)</p>
                <p className="text-lg font-extrabold text-emerald-700">{formatCurrency(netProfit)}</p>
                <p className="text-[8px] font-bold text-gray-500">Margem líquida: {totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%</p>
              </div>
            </div>

            {/* Breakdown de custos por categoria de forma resumida */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="border border-black p-3 rounded">
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 pb-1 border-b border-gray-300">Custos de Operação (Viagens)</h3>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>Combustível (Diesel):</span>
                    <span className="font-bold">{formatCurrency(totalFuel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manutenções & Diversificados:</span>
                    <span className="font-bold">{formatCurrency(totalDiverse)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vales, Comissões e Pagamentos:</span>
                    <span className="font-bold">{formatCurrency(totalAdvances)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-dashed border-gray-300 font-bold">
                    <span>Total Operacional:</span>
                    <span>{formatCurrency(totalTripExpenses)}</span>
                  </div>
                </div>
              </div>
              <div className="border border-black p-3 rounded">
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 pb-1 border-b border-gray-300">Custos Administrativos / Escritório</h3>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>Despesas Gerais de Empresa:</span>
                    <span className="font-bold">{formatCurrency(totalCompanyExpenses)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-dashed border-gray-300 font-bold">
                    <span>Total Administrativo:</span>
                    <span>{formatCurrency(totalCompanyExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Viagens do Mês */}
            <div className="mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 pb-1 border-b-2 border-black">DEMONSTRATIVO DETALHADO DE VIAGENS</h3>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-black text-left font-bold bg-gray-50">
                    <th className="py-1 px-1 w-[75px]">Data Loading</th>
                    <th className="py-1 px-1">Motorista / Placa</th>
                    <th className="py-1 px-1">Origem → Destino</th>
                    <th className="py-1 px-1 text-right w-[90px]">Frete Bruto</th>
                    <th className="py-1 px-1 text-right w-[90px]">Gasto Viagem</th>
                    <th className="py-1 px-1 text-right w-[90px]">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => {
                    const tripCosts = tripExpenses
                      .filter((e) => e.trip_id === trip.id)
                      .reduce((sum, e) => sum + (e.value || 0), 0);
                    const tripNet = (trip.freight_value || 0) - tripCosts;
                    return (
                      <tr key={trip.id} className="border-b border-gray-200">
                        <td className="py-1.5 px-1">{formatDate(trip.loading_date)}</td>
                        <td className="py-1.5 px-1 font-semibold">{trip.drivers?.name || 'Não informado'} <span className="text-[8px] text-gray-500 font-normal">({trip.trucks?.plate || ''})</span></td>
                        <td className="py-1.5 px-1">{trip.origin} → {trip.destination}</td>
                        <td className="py-1.5 px-1 text-right font-mono">{formatCurrency(trip.freight_value || 0)}</td>
                        <td className="py-1.5 px-1 text-right font-mono text-red-600">{formatCurrency(tripCosts)}</td>
                        <td className="py-1.5 px-1 text-right font-mono font-bold text-emerald-700">{formatCurrency(tripNet)}</td>
                      </tr>
                    );
                  })}
                  {trips.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center italic text-gray-400">Nenhuma viagem registrada neste período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Extrato de Despesas Operacionais */}
            <div className="mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1.5 pb-1 border-b-2 border-black">EXTRATO DETALHADO DE GASTOS DE OPERAÇÃO ({tripExpenses.length})</h3>
              <table className="w-full text-[9px] border-collapse">
                <thead>
                  <tr className="border-b border-black text-left font-bold bg-gray-50">
                    <th className="py-1 px-1 w-[75px]">Data Gasto</th>
                    <th className="py-1 px-1">Motorista / Operação</th>
                    <th className="py-1 px-1">Tipo Despesa</th>
                    <th className="py-1 px-1">Descrição do Item</th>
                    <th className="py-1 px-1 text-right w-[80px]">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {tripExpenses.map((exp) => {
                    const trip = trips.find((t) => t.id === exp.trip_id);
                    const routeInfo = trip ? `${trip.origin}→${trip.destination}` : '';
                    const driverName = trip?.drivers?.name || 'Desconhecido';
                    return (
                      <tr key={exp.id} className="border-b border-gray-100">
                        <td className="py-1 px-1">{formatDate(exp.date)}</td>
                        <td className="py-1 px-1 font-semibold">{driverName} <span className="text-[8px] text-gray-400 font-normal">({routeInfo})</span></td>
                        <td className="py-1 px-1 uppercase text-[8px] font-bold text-gray-600">
                          {exp.type === 'fuel' ? 'Diesel' : exp.type === 'diverse' ? 'Diverso' : 'Adiantamento'}
                        </td>
                        <td className="py-1 px-1 text-gray-700">{exp.description} {exp.liters && `(${exp.liters} L)`}</td>
                        <td className="py-1 px-1 text-right font-mono font-semibold text-black">{formatCurrency(exp.value)}</td>
                      </tr>
                    );
                  })}
                  {tripExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center italic text-gray-400">Nenhum gasto operacional cadastrado nesta competência.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Extrato Detalhado Administrativo Geral */}
            <div className="mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1.5 pb-1 border-b-2 border-black">DETALHAMENTO DE GASTOS ADMINISTRATIVOS DA EMPRESA ({companyExpenses.length})</h3>
              <table className="w-full text-[9px] border-collapse">
                <thead>
                  <tr className="border-b border-black text-left font-bold bg-gray-50">
                    <th className="py-1 px-1 w-[75px]">Data Gasto</th>
                    <th className="py-1 px-1">Categoria Adm</th>
                    <th className="py-1 px-1">Descrição / Fornecedor</th>
                    <th className="py-1 px-1 text-right w-[80px]">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {companyExpenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-gray-100">
                      <td className="py-1 px-1">{formatDate(exp.date)}</td>
                      <td className="py-1 px-1 font-semibold uppercase text-[8px]">{exp.category || 'Geral'}</td>
                      <td className="py-1 px-1 text-gray-700">{exp.description}</td>
                      <td className="py-1 px-1 text-right font-mono font-semibold text-black">{formatCurrency(exp.value)}</td>
                    </tr>
                  ))}
                  {companyExpenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center italic text-gray-400">Nenhum gasto administrativo lançado nesta competência.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé / Assinatura */}
            <div className="mt-12 pt-6 border-t border-gray-300 flex justify-between text-[9px] text-gray-400">
              <div className="w-[180px] text-center">
                <div className="border-t border-black pt-1 font-bold text-black uppercase">Responsável Financeiro</div>
                <p className="mt-1">FR Transportes e Logística</p>
              </div>
              <div className="w-[180px] text-center">
                <div className="border-t border-black pt-1 font-bold text-black uppercase">Diretoria / Auditoria</div>
                <p className="mt-1 font-bold">FR Transportes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cópia direta para impressão instantânea com @media print */}
        <div className="hidden print:block text-black bg-white p-4 w-full h-auto text-[10px] leading-relaxed">
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-black">FR TRANSPORTES</h1>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Gestão de Transportes e Frotas</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold uppercase text-black">Relatório Mensal de Gastos e Viagens</h2>
              <p className="text-[11px] font-medium text-gray-600">Período: {MONTH_NAMES[month]} de {year}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border border-black p-3 rounded">
              <p className="font-bold text-gray-500 text-[8px] uppercase">Faturamento Bruto</p>
              <p className="text-base font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="border border-black p-3 rounded">
              <p className="font-bold text-gray-500 text-[8px] uppercase">Despesas Totais</p>
              <p className="text-base font-bold">{formatCurrency(totalAllExpenses)}</p>
            </div>
            <div className="border border-black p-3 rounded">
              <p className="font-bold text-gray-500 text-[8px] uppercase">Lucro Líquido</p>
              <p className="text-base font-bold">{formatCurrency(netProfit)}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-[10px] font-bold uppercase border-b-2 border-black mb-2 pb-1">DEMONSTRATIVO DE VIAGENS</h3>
            <table className="w-full text-[9px] border-collapse text-left">
              <thead>
                <tr className="border-b border-black font-bold">
                  <th>Data</th>
                  <th>Motorista</th>
                  <th>Placa</th>
                  <th>Rota</th>
                  <th className="text-right">Frete Bruto</th>
                  <th className="text-right">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => {
                  const tripCosts = tripExpenses.filter((e) => e.trip_id === trip.id).reduce((sum, e) => sum + (e.value || 0), 0);
                  const tripNet = (trip.freight_value || 0) - tripCosts;
                  return (
                    <tr key={trip.id} className="border-b border-gray-200">
                      <td>{formatDate(trip.loading_date)}</td>
                      <td>{trip.drivers?.name || ''}</td>
                      <td>{trip.trucks?.plate || ''}</td>
                      <td>{trip.origin} → {trip.destination}</td>
                      <td className="text-right font-mono">{formatCurrency(trip.freight_value || 0)}</td>
                      <td className="text-right font-mono font-bold">{formatCurrency(tripNet)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-300 flex justify-between text-[9px] text-gray-500">
            <div className="w-[180px] text-center border-t border-black pt-1">Assinatura do Responsável</div>
            <div className="w-[180px] text-center border-t border-black pt-1 font-bold">FR TRANSPORTES</div>
          </div>
        </div>
      </Modal>
    </>
  );
}
