import React, { useState } from 'react';
import { useDrivers, useTrucks } from '../lib/hooks';
import { dbService } from '../lib/dbService';
import { useToast } from './ui/Toast';
import { Truck, Users, Link, Unlink, AlertCircle, Box, UserCircle, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function FleetPuzzleView() {
  const { drivers, loading: driversLoading, refresh: refreshDrivers } = useDrivers();
  const { trucks, loading: trucksLoading, refresh: refreshTrucks } = useTrucks();
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleAssignTrailer = async (driverId: string, trailerId: string | null) => {
    if (!driverId || driverId === 'undefined') {
      showToast('Erro: ID do motorista inválido', 'error');
      return;
    }
    
    setIsUpdating(driverId);
    try {
      const finalTrailerId = (trailerId === 'undefined' || !trailerId) ? null : trailerId;
      await dbService.updateDriver(driverId, { current_trailer_id: finalTrailerId });
      showToast('Frota atualizada!', 'success');
      refreshDrivers();
    } catch (error: any) {
      console.error('Erro ao atualizar frota:', error);
      showToast(error.message || 'Erro ao atualizar frota', 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateWorkStatus = async (driverId: string, status: 'road' | 'home') => {
    setIsUpdating(driverId);
    try {
      await dbService.updateDriver(driverId, { work_status: status });
      showToast('Status do motorista atualizado!', 'success');
      refreshDrivers();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateLocationStatus = async (truckId: string, status: 'yard' | 'road') => {
    setIsUpdating(truckId);
    try {
      await dbService.updateTruck(truckId, { location_status: status });
      showToast('Localização atualizada!', 'success');
      refreshTrucks();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateInvoice = async (driverId: string, invoice: string) => {
    setIsUpdating(driverId);
    try {
      await dbService.updateDriver(driverId, { current_invoice: invoice });
      showToast('Nota Fiscal atualizada!', 'success');
      refreshDrivers();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const isLoading = driversLoading || trucksLoading;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 text-brand-primary gap-4">
      <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="font-bold text-sm uppercase tracking-widest animate-pulse">Sincronizando Frota...</p>
    </div>
  );

  const availableTrailers = trucks.filter(t => 
    t.type === 'carreta' && 
    !drivers.some(d => d.current_trailer_id === t.id)
  );

  const driversOnRoad = drivers.filter(d => d.work_status === 'road');
  const driversAtHome = drivers.filter(d => d.work_status === 'home');

  const onDragStart = (e: React.DragEvent, trailerId: string) => {
    e.dataTransfer.setData('trailerId', trailerId);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, driverId: string) => {
    e.preventDefault();
    const trailerId = e.dataTransfer.getData('trailerId');
    if (trailerId && driverId) {
      await handleAssignTrailer(driverId, trailerId);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-[0.2em] mb-2">Central de Operações</h2>
          <p className="text-2xl font-bold text-brand-text tracking-tight">Monitoramento em Tempo Real</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-5 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest border border-emerald-500/20">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            {driversAtHome.length} Disponíveis
          </div>
          <div className="px-5 py-2 bg-brand-dark text-white rounded-xl flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest border border-brand-border">
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
            {driversOnRoad.length} Em Trânsito
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Active Assignments - Main Column */}
        <div className="xl:col-span-2 space-y-10">
          
          {/* Section: Em Viagem */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="w-10 h-10 bg-brand-dark text-brand-primary rounded-xl flex items-center justify-center border border-brand-border">
                <Truck size={20} />
              </div>
              <h3 className="text-xs font-bold text-brand-text uppercase tracking-widest">Controle de Viagem</h3>
              <div className="h-px bg-brand-border flex-1 ml-2"></div>
            </div>
            
            <div className="grid gap-6">
              {driversOnRoad.length === 0 ? (
                <div className="panel py-16 text-center text-brand-text-muted font-medium uppercase text-[10px] tracking-widest border-dashed border-2">
                  Nenhuma unidade em deslocamento.
                </div>
              ) : (
                driversOnRoad.map(driver => renderDriverCard(driver))
              )}
            </div>
          </section>

          {/* Section: No Pátio */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Users size={20} />
              </div>
              <h3 className="text-xs font-bold text-brand-text uppercase tracking-widest">Base Operacional</h3>
              <div className="h-px bg-brand-border flex-1 ml-2"></div>
            </div>
            
            <div className="grid gap-6">
              {driversAtHome.length === 0 ? (
                <div className="panel py-16 text-center text-brand-text-muted font-medium uppercase text-[10px] tracking-widest border-dashed border-2">
                  Base vazia. Todas as unidades em campo.
                </div>
              ) : (
                driversAtHome.map(driver => renderDriverCard(driver))
              )}
            </div>
          </section>
        </div>

        {/* Available Resources - Sidebar */}
        <div className="space-y-8">
          <div className="panel p-8 bg-brand-dark text-white shadow-2xl relative overflow-hidden border-brand-border">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Box size={80} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-bold text-brand-text-muted/60 uppercase tracking-[0.2em] flex items-center gap-2">
                   Inventário de Carga
                </h3>
                <span className="text-[10px] font-mono text-brand-primary bg-white/10 px-2 py-0.5 rounded">
                  {availableTrailers.length} un.
                </span>
              </div>
              
              <div className="space-y-3">
                {trucks.filter(t => t.type === 'carreta').map(trailer => {
                  const isAssigned = drivers.some(d => d.current_trailer_id === trailer.id);
                  
                  return (
                    <div 
                      key={trailer.id} 
                      draggable="true"
                      onDragStart={(e) => onDragStart(e, trailer.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex items-center justify-between cursor-grab active:cursor-grabbing",
                        isAssigned 
                          ? "bg-white/5 border-white/5 opacity-50" 
                          : "bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[10px]",
                          isAssigned ? "bg-white/5 text-white/30" : "bg-brand-primary text-gray-900"
                        )}>
                          {trailer.plate.slice(-3)}
                        </div>
                        <div>
                          <p className="text-xs font-bold tracking-tight">{trailer.plate}</p>
                          <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-0.5">
                            {trailer.trailer_category || 'Normal'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {trailer.maintenance_status === 'needed' && (
                          <div className="text-red-400" title="Alerta de Manutenção">
                            <AlertCircle size={14} />
                          </div>
                        )}
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                          isAssigned ? "text-white/30" : "text-emerald-400"
                        )}>
                          {isAssigned ? 'Ocup' : 'Idle'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function renderDriverCard(driver: any) {
    const fixedTruck = trucks.find(t => t.id === driver.truck_id);
    const currentTrailer = trucks.find(t => t.id === driver.current_trailer_id);

    return (
      <motion.div 
        key={driver.id}
        layout
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, driver.id)}
        className="panel p-8 flex flex-col md:flex-row items-center gap-8 group relative overflow-hidden"
      >
        {/* Status indicator bar */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          driver.work_status === 'road' ? "bg-brand-primary" : "bg-emerald-500"
        )}></div>

        {/* Driver Profile */}
        <div className="flex items-center gap-6 min-w-[220px]">
          <div className="w-16 h-16 bg-brand-bg rounded-2xl border border-brand-border flex items-center justify-center relative overflow-hidden ring-4 ring-transparent group-hover:ring-brand-primary/5 transition-all">
            {driver.avatar_url ? (
              <img src={driver.avatar_url} alt={driver.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
            ) : (
              <UserCircle size={32} className="text-brand-text-muted/30" />
            )}
            <div className={cn(
              "absolute bottom-2 right-2 w-3 h-3 rounded-full border-2 border-brand-panel",
              driver.work_status === 'road' ? "bg-brand-primary" : "bg-emerald-500"
            )}></div>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-brand-text tracking-tight leading-tight group-hover:text-brand-primary transition-colors">{driver.name}</h4>
            <button 
              onClick={() => handleUpdateWorkStatus(driver.id, driver.work_status === 'road' ? 'home' : 'road')}
              className={cn(
                "mt-2 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border",
                driver.work_status === 'road' 
                  ? "bg-brand-dark border-brand-border text-brand-primary" 
                  : "bg-brand-panel border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
              )}
            >
              {driver.work_status === 'road' ? 'Em Missão' : 'Standby'}
            </button>
          </div>
        </div>

        {/* Vehicle Linkage */}
        <div className="flex items-center gap-4 flex-1 w-full bg-brand-bg/50 p-4 rounded-2xl border border-brand-border">
          <div className="flex-1 flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-dark text-brand-primary rounded-xl flex items-center justify-center shrink-0 border border-brand-border">
              <Truck size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">C. Mecânico</p>
              <p className="text-sm font-bold text-brand-text tracking-tight truncate">
                {fixedTruck ? fixedTruck.plate : '---'}
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-brand-panel border border-brand-border flex items-center justify-center text-brand-text-muted/30">
            <Link size={14} className="group-hover:text-brand-primary transition-colors" />
          </div>

          <div className={cn(
            "flex-1 flex items-center gap-4 relative group/trailer transition-all px-4 py-2 rounded-xl",
            currentTrailer ? "bg-brand-primary/10" : "border-2 border-dashed border-brand-border"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
              currentTrailer ? "bg-brand-primary text-gray-900 shadow-sm" : "bg-brand-bg text-brand-text-muted/30"
            )}>
              <Box size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">
                {currentTrailer ? (currentTrailer.trailer_category === 'frigorifica' ? 'Thermo' : 'Dry') : 'Aguardando'}
              </p>
              <p className={cn(
                "text-sm font-bold tracking-tight truncate",
                currentTrailer ? "text-brand-text" : "text-brand-text-muted/30"
              )}>
                {currentTrailer ? currentTrailer.plate : 'POOL'}
              </p>
            </div>
            
            {currentTrailer && (
              <button 
                onClick={() => handleAssignTrailer(driver.id, null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-brand-panel border border-brand-border text-brand-text-muted hover:text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/trailer:opacity-100 transition-all shadow-sm"
              >
                <Unlink size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 min-w-[180px] w-full md:w-auto self-end md:self-center">
          <div className="relative">
            <select 
              disabled={isUpdating === driver.id}
              value={driver.current_trailer_id || ''}
              onChange={(e) => handleAssignTrailer(driver.id, e.target.value)}
              className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border text-brand-text text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all appearance-none cursor-pointer pr-10"
            >
              <option value="">Engatar Unidade</option>
              {availableTrailers.map(t => (
                <option key={t.id} value={t.id}>{t.plate} ({t.trailer_category === 'frigorifica' ? 'Frio' : 'Seca'})</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-text-muted">
              <ChevronRight size={14} className="rotate-90" />
            </div>
          </div>

          <div className="relative">
            <FileText size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" />
            <input 
              type="text"
              placeholder="DOC NF OU CTe"
              defaultValue={driver.current_invoice || ''}
              disabled={isUpdating === driver.id}
              onBlur={(e) => {
                if (e.target.value !== (driver.current_invoice || '')) {
                  handleUpdateInvoice(driver.id, e.target.value);
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-brand-panel border border-brand-border text-brand-text text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-primary/10 placeholder:text-brand-text-muted transition-all"
            />
          </div>
        </div>
      </motion.div>
    );
  }
}
