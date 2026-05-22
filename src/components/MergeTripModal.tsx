import React, { useState } from 'react';
import { dbService } from '../lib/dbService';
import { Trip } from '../types';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { ArrowRight, Merge, Search, Info } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';

interface MergeTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTrip: Trip;
  availableTrips: any[];
  onSuccess: () => void;
}

export function MergeTripModal({ isOpen, onClose, sourceTrip, availableTrips, onSuccess }: MergeTripModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const otherTrips = availableTrips.filter(t => t.id !== sourceTrip.id);
  
  const filteredTrips = otherTrips.filter(t => {
    const search = searchTerm.toLowerCase();
    const driverName = (t.drivers?.name || '').toLowerCase();
    const destination = (t.destination || '').toLowerCase();
    const cte = (t.cte || '');
    return driverName.includes(search) || destination.includes(search) || cte.includes(search);
  });

  const handleMerge = async () => {
    if (!targetId) return;
    
    setIsSubmitting(true);
    try {
      await dbService.mergeTrips(sourceTrip.id, targetId);
      showToast('Viagens mescladas com sucesso!', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Erro ao mesclar viagens', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mesclar Viagens" maxWidth="max-w-2xl">
      <div className="space-y-6">
        <div className="bg-brand-primary/5 border border-brand-primary/10 p-4 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="text-brand-primary shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-brand-text-muted leading-relaxed">
              <p className="font-bold text-brand-text mb-1 uppercase tracking-wider">Como funciona a Mesclagem?</p>
              <p>Você está movendo todos os <strong>gastos e o valor do frete</strong> da viagem abaixo para uma nova viagem de destino. A viagem atual será excluída após a transferência.</p>
            </div>
          </div>
        </div>

        <div className="panel p-4 bg-brand-bg/50 border-brand-primary/20">
          <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-2">Viagem que será movida (Origem)</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-brand-text">{sourceTrip.drivers?.name}</p>
              <p className="text-[10px] text-brand-text-muted font-mono">{sourceTrip.origin} <ArrowRight size={10} className="inline mx-1" /> {sourceTrip.destination}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-brand-text">{formatCurrency(sourceTrip.freight_value)}</p>
              <p className="text-[10px] text-brand-text-muted">{formatDate(sourceTrip.loading_date)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest pl-1">Selecione para qual viagem enviar (Destino)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar viagem de destino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredTrips.map(t => (
              <button
                key={t.id}
                onClick={() => setTargetId(t.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center",
                  targetId === t.id 
                    ? "bg-brand-primary/10 border-brand-primary shadow-sm ring-1 ring-brand-primary" 
                    : "bg-brand-panel border-brand-border hover:border-brand-primary/50"
                )}
              >
                <div>
                  <p className="text-xs font-bold text-brand-text">{t.drivers?.name}</p>
                  <p className="text-[10px] text-brand-text-muted font-medium">{t.origin} → {t.destination}</p>
                  <p className="text-[9px] text-brand-primary font-mono mt-1">CTE: {t.cte} • {formatDate(t.loading_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-brand-text">{formatCurrency(t.freight_value)}</p>
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center translate-y-1",
                    targetId === t.id ? "border-brand-primary bg-brand-primary" : "border-brand-border"
                  )}>
                    {targetId === t.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </div>
                </div>
              </button>
            ))}
            {filteredTrips.length === 0 && (
              <p className="text-center py-8 text-xs text-brand-text-muted italic">Nenhuma viagem encontrada para mesclagem.</p>
            )}
          </div>
        </div>

        <button
          onClick={handleMerge}
          disabled={!targetId || isSubmitting}
          className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Merge size={18} />
              <span className="uppercase tracking-widest text-xs font-bold">Mesclar e Excluir Origem</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
