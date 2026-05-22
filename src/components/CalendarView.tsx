import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin, Truck, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { dbService } from '../lib/dbService';
import { formatCurrency } from '../lib/utils';
import { useToast } from './ui/Toast';

const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function CalendarView({ month, year }: { month: number, year: number }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date(year, month, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(year, month, 1));
  const [showReminderModal, setShowReminderModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setViewDate(new Date(year, month, 1));
    setSelectedDate(new Date(year, month, 1));
  }, [month, year]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tripsData, remindersData] = await Promise.all([
        dbService.getTrips(),
        dbService.getReminders()
      ]);
      setTrips(tripsData);
      setReminders(remindersData);
    } catch (error) {
      console.error('Erro no calendário:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const navigateMonth = (direction: number) => {
    const nextDate = new Date(viewDate);
    nextDate.setMonth(viewDate.getMonth() + direction);
    setViewDate(nextDate);
  };

  const getTripsForDay = (day: number) => {
    if (!day) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return trips.filter(t => t.loading_date === dateStr);
  };

  const getRemindersForDay = (day: number) => {
    if (!day) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reminders.filter(r => r.date === dateStr);
  };

  const handleAddReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newReminder = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      date: formData.get('date') as string,
      type: formData.get('type') as string,
    };

    try {
      await dbService.addReminder(newReminder);
      showToast('Lembrete adicionado!', 'success');
      setShowReminderModal(false);
      fetchData();
    } catch (error) {
      showToast('Erro ao adicionar lembrete', 'error');
    }
  };

  const toggleReminder = async (reminder: any) => {
    try {
      await dbService.updateReminder(reminder.id, { completed: !reminder.completed });
      fetchData();
    } catch (error) {
      showToast('Erro ao atualizar lembrete', 'error');
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await dbService.deleteReminder(id);
      showToast('Lembrete excluído', 'success');
      fetchData();
    } catch (error) {
      showToast('Erro ao excluir lembrete', 'error');
    }
  };

  const selectedTrips = selectedDate ? trips.filter(t => t.loading_date === selectedDate.toISOString().split('T')[0]) : [];
  const selectedReminders = selectedDate ? reminders.filter(r => r.date === selectedDate.toISOString().split('T')[0]) : [];

  const weeklyTrips = trips.filter(t => {
    const tripDate = new Date(t.loading_date);
    const diff = today.getTime() - tripDate.getTime();
    return Math.abs(diff) <= 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Calendário Principal */}
      <div className="lg:col-span-2 space-y-6">
        <div className="panel overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigateMonth(-1)}
                className="p-1.5 hover:bg-brand-bg rounded-lg transition-colors text-brand-text-muted active:scale-95 border border-brand-border"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text w-32 text-center">
                {months[currentMonth]} {currentYear}
              </h2>
              <button 
                onClick={() => navigateMonth(1)}
                className="p-1.5 hover:bg-brand-bg rounded-lg transition-colors text-brand-text-muted active:scale-95 border border-brand-border"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button 
              onClick={() => {
                setViewDate(new Date());
                setSelectedDate(new Date());
              }}
              className="text-[10px] text-brand-primary font-bold uppercase tracking-widest hover:bg-brand-primary/10 px-3 py-1.5 rounded-lg transition-all border border-transparent hover:border-brand-primary/20"
            >
              Hoje
            </button>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-7 mb-4">
              {days.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-brand-text-muted uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="aspect-square"></div>;
                
                const dayDate = new Date(currentYear, currentMonth, day);
                const isToday = dayDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
                const isSelected = selectedDate && dayDate.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];
                const dayTrips = getTripsForDay(day);
                const dayReminders = getRemindersForDay(day);

                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(dayDate)}
                    className={cn(
                      "aspect-square p-2 border rounded-xl flex flex-col items-center transition-all group relative",
                      isToday ? "bg-brand-dark border-brand-primary shadow-lg text-white" : "bg-brand-panel border-brand-border hover:bg-brand-bg",
                      isSelected && !isToday && "border-brand-primary border-2"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold mb-1",
                      isToday ? "text-brand-primary" : "text-brand-text"
                    )}>
                      {day}
                    </span>
                    
                    <div className="flex flex-wrap gap-1 justify-center max-w-full">
                      {dayTrips.length > 0 && (
                        <div className={cn(
                          "w-1 h-1 rounded-full shrink-0",
                          isToday ? "bg-brand-primary" : "bg-brand-primary"
                        )}></div>
                      )}
                      {dayReminders.length > 0 && (
                        <div className={cn(
                          "w-1 h-1 rounded-full shrink-0",
                          isToday ? "bg-white/40" : "bg-brand-text-muted"
                        )}></div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detalhes do Dia Selecionado */}
        <div className="panel p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">Programação do Dia</h3>
              <p className="text-lg font-bold text-brand-text">{selectedDate?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Viagens Ativas</h4>
                <div className="h-px flex-1 bg-emerald-500/10 ml-4"></div>
              </div>
              {selectedTrips.length === 0 ? (
                <p className="text-xs text-brand-text-muted italic">Nenhuma viagem agendada.</p>
              ) : (
                <div className="space-y-3">
                  {selectedTrips.map(trip => (
                    <div key={trip.id} className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center justify-between group">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-500 uppercase tracking-tight">
                          <Truck size={14} className="stroke-[2.5]" /> {trip.trucks?.plate}
                        </div>
                        <div className="text-[10px] text-emerald-500/70 font-semibold uppercase tracking-wider">
                          {trip.origin} → {trip.destination}
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-widest">
                        {trip.drivers?.name.split(' ')[0]}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Ocorrências & Notas</h4>
                <div className="h-px flex-1 bg-brand-primary/10 ml-4"></div>
              </div>
              {selectedReminders.length === 0 ? (
                <p className="text-xs text-brand-text-muted italic">Nenhum evento registrado.</p>
              ) : (
                <div className="space-y-3">
                  {selectedReminders.map(reminder => (
                    <div key={reminder.id} className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between group transition-all",
                      reminder.completed ? "bg-brand-bg border-brand-border opacity-60" : "bg-brand-primary/5 border-brand-primary/10"
                    )}>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleReminder(reminder)}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            reminder.completed ? "text-emerald-500 bg-emerald-500/10" : "text-brand-primary bg-brand-panel border border-brand-primary/20 hover:bg-brand-primary/10"
                          )}
                        >
                          {reminder.completed ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full" />}
                        </button>
                        <div className="flex flex-col">
                          <p className={cn("text-[11px] font-bold uppercase tracking-tight", reminder.completed ? "line-through text-brand-text-muted" : "text-brand-text")}>
                            {reminder.title}
                          </p>
                          {reminder.description && <p className="text-[10px] text-brand-text-muted font-medium">{reminder.description}</p>}
                        </div>
                      </div>
                      <button onClick={() => deleteReminder(reminder.id)} className="p-1.5 text-brand-text-muted opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-8">
        <div className="panel p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Próximos Alertas</h4>
            <button 
              onClick={() => setShowReminderModal(true)}
              className="p-1.5 bg-brand-dark text-brand-primary hover:bg-black rounded-lg transition-all border border-brand-border"
            >
              <Plus size={18} />
            </button>
          </div>
          
          <div className="space-y-6">
            {reminders.filter(r => !r.completed).slice(0, 5).map(reminder => (
              <div key={reminder.id} className="flex items-start gap-4 group cursor-pointer">
                <div className={cn(
                  "w-1 h-8 rounded-full shrink-0 mt-1",
                  reminder.type === 'maintenance' ? "bg-red-400" : 
                  reminder.type === 'urgent' ? "bg-red-500" : "bg-brand-dark"
                )}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-bold text-brand-text uppercase tracking-tight leading-tight group-hover:text-brand-primary transition-colors">{reminder.title}</p>
                    <span className="text-[9px] font-bold text-brand-text-muted font-mono">
                      {new Date(reminder.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-brand-text-muted font-medium line-clamp-1 mt-1">{reminder.description}</p>
                </div>
              </div>
            ))}
            {reminders.filter(r => !r.completed).length === 0 && (
              <div className="text-center py-10 rounded-2xl bg-brand-bg border border-dashed border-brand-border">
                <CalendarIcon className="text-brand-text-muted/30 mx-auto mb-3" size={24} />
                <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Painel Limpo</p>
              </div>
            )}
            <button 
              onClick={() => setShowReminderModal(true)}
              className="w-full py-3 border border-dashed border-brand-border rounded-2xl text-[10px] font-bold text-brand-text-muted hover:border-brand-primary hover:text-brand-primary transition-all uppercase tracking-[0.2em]"
            >
              Protocolar Nota
            </button>
          </div>
        </div>

        <div className="bg-brand-dark p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group border border-brand-border">
          <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={100} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-white/10 rounded-xl">
                <Clock size={18} className="text-brand-primary" />
              </div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted/60">Forecast Semanal</h4>
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-center transition-all hover:translate-x-1">
                <span className="text-[10px] uppercase font-bold text-brand-text-muted/60">Carregamentos</span>
                <span className="text-sm font-bold">{weeklyTrips.length} viagens</span>
              </div>
              <div className="flex justify-between items-center transition-all hover:translate-x-1">
                <span className="text-[10px] uppercase font-bold text-brand-text-muted/60">Concluídas</span>
                <span className="text-sm font-bold text-emerald-400">{weeklyTrips.filter(t => t.status === 'paid').length} un.</span>
              </div>
              <div className="pt-6 border-t border-white/5 mt-4">
                <span className="block text-[10px] uppercase font-bold text-brand-text-muted/60 mb-2">Faturamento Esperado</span>
                <span className="text-2xl font-bold tracking-tight text-white">{formatCurrency(weeklyTrips.reduce((acc, t) => acc + (t.freight_value || 0), 0))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Lembrete */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-brand-panel border border-brand-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-brand-border flex items-center justify-between bg-brand-bg/30">
              <h3 className="text-base font-bold text-brand-text tracking-tight">Novo Protocolo</h3>
              <button onClick={() => setShowReminderModal(false)} className="p-2 hover:bg-brand-bg rounded-xl transition-all">
                <ChevronLeft size={20} className="rotate-180 text-brand-text-muted" />
              </button>
            </div>
            <form onSubmit={handleAddReminder} className="p-8 space-y-6">
              <div>
                <label className="label-tech mb-2">Título do Evento</label>
                <input name="title" required placeholder="Ex: Manutenção Preventiva" className="w-full" />
              </div>
              <div>
                <label className="label-tech mb-2">Descrição Auxiliar</label>
                <textarea name="description" rows={3} className="w-full px-4 py-3 border border-brand-border bg-brand-bg rounded-2xl text-sm focus:ring-2 focus:ring-brand-primary/10 transition-all outline-none text-brand-text placeholder:text-brand-text-muted" placeholder="Detalhes da ocorrência..."></textarea>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label-tech mb-2">Data Limite</label>
                  <input type="date" name="date" required defaultValue={selectedDate?.toISOString().split('T')[0] || today.toISOString().split('T')[0]} className="w-full" />
                </div>
                <div>
                  <label className="label-tech mb-2">Prioridade</label>
                  <select name="type" className="w-full bg-brand-bg border-brand-border text-brand-text">
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgente 🔥</option>
                    <option value="maintenance">Oficina 🛠️</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full btn-primary mt-4">
                Confirmar Registro
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
