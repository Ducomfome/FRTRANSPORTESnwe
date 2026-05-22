import React, { useState } from 'react';
import { 
  Plus, 
  Truck as TruckIcon, 
  Users, 
  Trash2, 
  Edit2, 
  Search,
  ChevronRight,
  MessageCircle,
  Camera,
  Image as ImageIcon,
  UserCircle,
  Box,
  Home,
  Map as MapIcon,
  Warehouse,
  FileText,
  Paperclip,
  Download,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/dbService';
import { Driver, Truck } from '../types';
import { Modal } from './ui/Modal';
import { ConfirmModal } from './ui/ConfirmModal';
import { useDrivers, useTrucks } from '../lib/hooks';
import { useToast } from './ui/Toast';
import { cn, formatDate } from '../lib/utils';
import { FileDropzone } from './ui/FileDropzone';
import { isSupabaseConfigured } from '../lib/supabase';
import { AlertTriangle, Database, Info } from 'lucide-react';
import { DocPreviewModal } from './ui/DocPreviewModal';

interface IdentificationViewProps {
  defaultTab?: 'drivers' | 'trucks';
}

export function IdentificationView({ defaultTab = 'drivers' }: IdentificationViewProps) {
  const { drivers, loading: driversLoading, refresh: refreshDrivers } = useDrivers();
  const { trucks, loading: trucksLoading, refresh: refreshTrucks } = useTrucks();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'drivers' | 'trucks'>(defaultTab);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Sync activeTab with defaultTab when it changes from parent
  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleFileDrop = async (file: File) => {
    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const bucket = 'documents';
      const publicUrl = await dbService.uploadFile(bucket, fileName, file);
      
      setDocumentUrl(publicUrl);
      showToast('Documento carregado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Erro detalhado no upload:', error);
      const errorMessage = error.message || error.error_description || 'Erro desconhecido';
      showToast(`Erro no upload: ${errorMessage}.`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      if (activeTab === 'drivers') {
        const data = {
          name: formData.get('name') as string,
          phone: formData.get('phone') as string,
          avatar_url: (formData.get('avatar_url') as string) || null,
          cnh_url: documentUrl || null,
          work_status: formData.get('work_status') as 'home' | 'road',
          truck_id: (formData.get('truck_id') as string) || null,
          current_trailer_id: (formData.get('current_trailer_id') as string) || null,
          current_invoice: (formData.get('current_invoice') as string) || null,
          status: 'active' as const
        };

        // Safety check for "undefined" strings
        Object.keys(data).forEach(key => {
          if ((data as any)[key] === 'undefined') {
            (data as any)[key] = null;
          }
        });

        if (editingItem?.id) {
          await dbService.updateDriver(editingItem.id, data);
          showToast('Motorista atualizado!', 'success');
        } else {
          await dbService.addDriver(data);
          showToast('Motorista cadastrado!', 'success');
        }
        refreshDrivers();
      } else {
        const data = {
          plate: formData.get('plate') as string,
          model: (formData.get('model') as string) || null,
          trailer_category: (formData.get('trailer_category') as any) || null,
          location_status: formData.get('location_status') as 'yard' | 'road',
          maintenance_status: formData.get('maintenance_status') as 'ok' | 'needed' || 'ok',
          type: formData.get('type') as 'cavalo' | 'carreta',
          doc_url: documentUrl || null,
          status: 'available' as const
        };

        // Safety check for "undefined" strings
        Object.keys(data).forEach(key => {
          if ((data as any)[key] === 'undefined') {
            (data as any)[key] = null;
          }
        });

        if (editingItem?.id) {
          await dbService.updateTruck(editingItem.id, data);
          showToast('Veículo atualizado!', 'success');
        } else {
          await dbService.addTruck(data);
          showToast('Veículo cadastrado!', 'success');
        }
        refreshTrucks();
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setDocumentUrl('');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      showToast(error.message || 'Erro ao salvar dados', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      if (activeTab === 'drivers') {
        await dbService.deleteDriver(deleteId);
        showToast('Motorista excluído', 'success');
        refreshDrivers();
      } else {
        await dbService.deleteTruck(deleteId);
        showToast('Veículo excluído', 'success');
        refreshTrucks();
      }
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      const message = error.message?.includes('foreign key constraint') 
        ? 'Não é possível excluir: este registro possui vínculos (fretes, dívidas, etc).'
        : 'Erro ao excluir registro.';
      showToast(message, 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredItems = (activeTab === 'drivers' ? drivers : trucks).filter((item: any) => {
    const search = (searchTerm || '').toLowerCase();
    
    if (activeTab === 'drivers') {
      const name = (item.name || '').toLowerCase();
      const phone = (item.phone || '');
      return name.includes(search) || phone.includes(search);
    }
    
    const plate = (item.plate || '').toLowerCase();
    const model = (item.model || '').toLowerCase();
    return plate.includes(search) || model.includes(search);
  });

  const isLoading = driversLoading || trucksLoading;

  const renderItem = (item: any, index: number) => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.05 }}
      className="panel group overflow-hidden"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center text-white transition-all group-hover:scale-105 overflow-hidden border border-brand-border shadow-sm",
            activeTab === 'drivers' ? "bg-brand-primary/10" : (item.type === 'cavalo' ? "bg-brand-dark" : "bg-brand-primary/10")
          )}>
            {activeTab === 'drivers' ? (
              item.avatar_url ? (
                <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : <UserCircle size={28} className="text-brand-primary" />
            ) : (
              item.type === 'cavalo' ? <TruckIcon size={28} className="text-brand-primary" /> : <Box size={28} className="text-brand-primary" />
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => { 
                setEditingItem(item); 
                setDocumentUrl((activeTab === 'drivers' ? item.cnh_url : item.doc_url) || '');
                setIsModalOpen(true); 
              }}
              className="p-1.5 text-brand-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-all"
            >
              <Edit2 size={15} />
            </button>
            <button 
              onClick={() => setDeleteId(item.id)}
              className="p-1.5 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-bold text-brand-text leading-tight truncate">
              {activeTab === 'drivers' ? item.name : item.plate}
            </h4>
            <p className="text-xs font-semibold text-brand-text-muted font-mono tracking-tighter uppercase mt-0.5">
              {activeTab === 'drivers' ? item.phone : (item.type === 'cavalo' ? item.model : (item.trailer_category === 'frigorifica' ? 'Frigorífica' : 'Normal'))}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(activeTab === 'drivers' ? item.cnh_url : item.doc_url) && (
              <button 
                type="button"
                onClick={() => {
                  setPreviewUrl((activeTab === 'drivers' ? item.cnh_url : item.doc_url) || '');
                  setPreviewTitle(activeTab === 'drivers' ? `CNH Digital - ${item.name}` : `CRLV Digital - ${item.plate}`);
                  setIsPreviewOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg text-brand-text hover:bg-brand-primary/10 hover:text-brand-primary border border-brand-border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <FileText size={12} />
                {activeTab === 'drivers' ? 'CNH Digital' : 'CRLV Digital'}
                <Download size={10} />
              </button>
            )}
            {activeTab === 'drivers' && item.phone && (
              <a 
                href={`https://wa.me/55${item.phone.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            )}
          </div>

          {activeTab === 'drivers' && (
            <div className="space-y-2 py-3 border-y border-brand-border">
              <div className="flex items-center justify-between text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                <span>Vínculos Atuais</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-brand-bg p-2 rounded-lg border border-brand-border flex items-center gap-2">
                  <TruckIcon size={12} className="text-brand-primary" />
                  <span className="text-[10px] font-bold text-brand-text">{trucks.find(t => t.id === item.truck_id)?.plate || 'Nenhum'}</span>
                </div>
                <div className="bg-brand-bg p-2 rounded-lg border border-brand-border flex items-center gap-2">
                  <Box size={12} className="text-brand-primary" />
                  <span className="text-[10px] font-bold text-brand-text">{trucks.find(t => t.id === item.current_trailer_id)?.plate || 'Nenhum'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
            activeTab === 'drivers' 
              ? (item.work_status === 'road' ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20")
              : (item.location_status === 'yard' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-brand-primary/10 text-brand-primary border-brand-primary/20")
          )}>
            {activeTab === 'drivers' 
              ? (item.work_status === 'road' ? 'Em Viagem' : 'Disponível')
              : (item.location_status === 'yard' ? 'No Pátio' : 'Operando')}
          </div>
          {activeTab === 'trucks' && item.type === 'carreta' && (
            <div className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
              item.maintenance_status === 'needed' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-brand-bg text-brand-text-muted border-brand-border"
            )}>
              {item.maintenance_status === 'needed' ? '⚠️ Oficina' : 'OK'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {!isSupabaseConfigured && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-red-800">
          <div className="flex items-start gap-4">
            <AlertTriangle className="shrink-0 mt-1" />
            <div className="text-sm">
              <p className="font-bold text-lg mb-1">Banco de Dados não conectado!</p>
              <p className="opacity-90 leading-relaxed">
                Para salvar e editar dados, você precisa configurar o Supabase.<br/>
                Vá em <b>Settings &gt; Secrets</b> e adicione as chaves <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 shrink-0"
          >
            <Database size={16} />
            Ver Instruções SQL
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex p-1 bg-brand-bg border border-brand-border rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('drivers')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 font-bold text-[10px] uppercase tracking-widest transition-all rounded-lg",
              activeTab === 'drivers' ? "bg-brand-panel text-brand-text shadow-sm border border-brand-border" : "text-brand-text-muted hover:text-brand-text"
            )}
          >
            <Users size={14} />
            <span>Recursos Humanos</span>
          </button>
          <button
            onClick={() => setActiveTab('trucks')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 font-bold text-[10px] uppercase tracking-widest transition-all rounded-lg",
              activeTab === 'trucks' ? "bg-brand-panel text-brand-text shadow-sm border border-brand-border" : "text-brand-text-muted hover:text-brand-text"
            )}
          >
            <TruckIcon size={14} />
            <span>Frota Operacional</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
            <input 
              type="text" 
              placeholder={`Filtrar registro...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-2.5 bg-brand-panel border border-brand-border text-brand-text rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="btn-primary"
          >
            <Plus size={16} />
            <span>Cadastrar</span>
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <AnimatePresence mode="popLayout">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="panel h-48 animate-pulse"></div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-24 text-center panel border-dashed border-2">
            <div className="w-16 h-16 bg-brand-bg rounded-2xl flex items-center justify-center mx-auto mb-6">
              {activeTab === 'drivers' ? <Users size={32} className="text-brand-text-muted" /> : <TruckIcon size={32} className="text-brand-text-muted" />}
            </div>
            <p className="text-brand-text-muted font-medium">Nenhum registro operacional encontrado</p>
          </div>
        ) : activeTab === 'drivers' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Disponíveis Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
                    <Home size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-brand-text uppercase tracking-widest">Base / Pátio</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-brand-text-muted bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                  {filteredItems.filter(i => i.work_status === 'home').length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {filteredItems.filter(i => i.work_status === 'home').map((item: any, index) => renderItem(item, index))}
                {filteredItems.filter(i => i.work_status === 'home').length === 0 && (
                  <div className="p-12 text-center panel border-dashed border-2 text-brand-text-muted text-[10px] font-bold uppercase tracking-widest">
                    Sem motoristas em espera
                  </div>
                )}
              </div>
            </div>

            {/* Estrada Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-primary/10 text-brand-primary rounded-lg flex items-center justify-center">
                    <Globe size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-brand-text uppercase tracking-widest">Em Trânsito</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-brand-text-muted bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                  {filteredItems.filter(i => i.work_status === 'road').length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {filteredItems.filter(i => i.work_status === 'road').map((item: any, index) => renderItem(item, index))}
                {filteredItems.filter(i => i.work_status === 'road').length === 0 && (
                  <div className="p-12 text-center panel border-dashed border-2 text-brand-text-muted text-[10px] font-bold uppercase tracking-widest">
                    Sem motoristas em trânsito
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cavalos Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-dark text-brand-primary rounded-lg flex items-center justify-center border border-brand-border">
                    <TruckIcon size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-brand-text uppercase tracking-widest">Cavalos Mecânicos</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-brand-text-muted bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                  {filteredItems.filter(i => i.type === 'cavalo').length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {filteredItems.filter(i => i.type === 'cavalo').map((item: any, index) => renderItem(item, index))}
                {filteredItems.filter(i => i.type === 'cavalo').length === 0 && (
                  <div className="p-12 text-center panel border-dashed border-2 text-brand-text-muted text-[10px] font-bold uppercase tracking-widest">
                    Nenhuma unidade registrada
                  </div>
                )}
              </div>
            </div>

            {/* Carretas Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-primary/10 text-brand-primary rounded-lg flex items-center justify-center">
                    <Box size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-brand-text uppercase tracking-widest">Unidades Carga</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-brand-text-muted bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                  {filteredItems.filter(i => i.type === 'carreta').length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {filteredItems.filter(i => i.type === 'carreta').map((item: any, index) => renderItem(item, index))}
                {filteredItems.filter(i => i.type === 'carreta').length === 0 && (
                  <div className="p-12 text-center panel border-dashed border-2 text-brand-text-muted text-[10px] font-bold uppercase tracking-widest">
                    Sem carretas no inventário
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? `Ajustar Ficha: ${activeTab === 'drivers' ? 'Motorista' : 'Veículo'}` : `Novo Registro: ${activeTab === 'drivers' ? 'Recurso Humano' : 'Unidade Frota'}`}
      >
        <form onSubmit={handleSave} className="space-y-6">
          {activeTab === 'drivers' ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                    {editingItem?.avatar_url ? (
                      <img src={editingItem.avatar_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Camera size={32} className="text-gray-300" />
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="label-tech mb-1.5 block">URL da Foto de Perfil</label>
                <input name="avatar_url" defaultValue={editingItem?.avatar_url} placeholder="https://..." />
              </div>
              <div>
                <label className="label-tech mb-1.5 block">Nome Completo do Operador</label>
                <input name="name" defaultValue={editingItem?.name} required placeholder="Ex: João Silva" />
              </div>
              <div>
                <label className="label-tech mb-1.5 block">Telefone de Contato</label>
                <input name="phone" defaultValue={editingItem?.phone} required placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <label className="label-tech flex items-center justify-between">
                  <span>Documento CNH (Arraste aqui)</span>
                </label>
                <FileDropzone 
                  onFileSelect={handleFileDrop}
                  isUploading={isUploading}
                  currentValue={documentUrl}
                  onClear={() => setDocumentUrl('')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-tech mb-1.5 block">Status Operacional</label>
                  <select name="work_status" defaultValue={editingItem?.work_status || 'home'} className="w-full">
                    <option value="home">Base / Disponível</option>
                    <option value="road">Em Trânsito / Estrada</option>
                  </select>
                </div>
                <div>
                  <label className="label-tech mb-1.5 block">Cavalo Vinculado</label>
                  <select name="truck_id" defaultValue={editingItem?.truck_id} className="w-full">
                    <option value="">Sem Vínculo</option>
                    {trucks.filter(t => t.type === 'cavalo').map(t => (
                      <option key={t.id} value={t.id}>{t.plate} - {t.model}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-tech mb-1.5 block">Implemento (Carreta)</label>
                <select name="current_trailer_id" defaultValue={editingItem?.current_trailer_id} className="w-full">
                  <option value="">Sem Implemento</option>
                  {trucks.filter(t => t.type === 'carreta').map(t => (
                    <option key={t.id} value={t.id}>{t.plate} - {t.trailer_category === 'frigorifica' ? 'Frigorífica' : 'Carga Seca'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-tech mb-1.5 block">Documento de Carga Atual</label>
                <input name="current_invoice" defaultValue={editingItem?.current_invoice} placeholder="Ex: NF-123456" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label-tech mb-1.5 block">Placa Mercosul</label>
                  <input name="plate" defaultValue={editingItem?.plate} required className="uppercase" placeholder="ABC-1234" />
                </div>
                <div>
                  <label className="label-tech mb-1.5 block">Tipo de Unidade</label>
                  <select 
                    name="type" 
                    defaultValue={editingItem?.type || 'cavalo'} 
                    className="w-full"
                    onChange={(e) => {
                      setEditingItem({...editingItem, type: e.target.value});
                    }}
                  >
                    <option value="cavalo">Cavalo Mecânico</option>
                    <option value="carreta">Implemento (Carreta)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label-tech flex items-center justify-between">
                  <span>Documento do Veículo (Arraste aqui)</span>
                </label>
                <FileDropzone 
                  onFileSelect={handleFileDrop}
                  isUploading={isUploading}
                  currentValue={documentUrl}
                  onClear={() => setDocumentUrl('')}
                />
              </div>
              
              {editingItem?.type === 'carreta' || (!editingItem && (document.getElementsByName('type')[0] as HTMLSelectElement)?.value === 'carreta') ? (
                <div>
                  <label className="label-tech mb-1.5 block">Categoria de Implemento</label>
                  <select name="trailer_category" defaultValue={editingItem?.trailer_category || 'normal'} className="w-full">
                    <option value="normal">Carga Geral</option>
                    <option value="frigorifica">Frigorífica / Termo</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label-tech mb-1.5 block">Especificação (Modelo)</label>
                  <input name="model" defaultValue={editingItem?.model} required placeholder="Ex: Volvo FH 540" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label-tech mb-1.5 block">Localização Base</label>
                  <select name="location_status" defaultValue={editingItem?.location_status || 'yard'} className="w-full">
                    <option value="yard">No Pátio / CD</option>
                    <option value="road">Em Viagem / Operação</option>
                  </select>
                </div>
                {(editingItem?.type === 'carreta' || (!editingItem && (document.getElementsByName('type')[0] as HTMLSelectElement)?.value === 'carreta')) && (
                  <div>
                    <label className="label-tech mb-1.5 block">Condição de Uso</label>
                    <select name="maintenance_status" defaultValue={editingItem?.maintenance_status || 'ok'} className="w-full">
                      <option value="ok">Operacional ✅</option>
                      <option value="needed">Requer Oficina ⚠️</option>
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          <button 
            disabled={isSubmitting}
            className="w-full btn-primary mt-6"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              editingItem ? 'Salvar Alterações' : 'Confirmar Cadastro'
            )}
          </button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir este ${activeTab === 'drivers' ? 'motorista' : 'veículo'}? Esta ação não pode ser desfeita.`}
        variant="danger"
      />



      <Modal isOpen={showSetup} onClose={() => setShowSetup(false)} title="Configuração do Banco de Dados">
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3 text-blue-800">
            <Info className="shrink-0 mt-1" size={18} />
            <p className="text-xs leading-relaxed">
              Copie o código abaixo e cole no <b>SQL Editor</b> do seu painel Supabase para criar as tabelas necessárias.
            </p>
          </div>
          
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-[10px] font-mono overflow-x-auto max-h-[300px]">
{`-- 1. CRIAR TABELA DE VEÍCULOS (TRUCKS)
CREATE TABLE IF NOT EXISTS trucks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  model TEXT,
  type TEXT CHECK (type IN ('cavalo', 'carreta')),
  trailer_category TEXT, -- 'frigorifica' ou 'normal'
  location_status TEXT DEFAULT 'yard', -- 'yard' ou 'road'
  maintenance_status TEXT DEFAULT 'ok', -- 'ok' ou 'needed'
  status TEXT DEFAULT 'available',
  doc_url TEXT, -- Documento do veículo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CRIAR TABELA DE MOTORISTAS (DRIVERS)
CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  cnh_url TEXT, -- Documento CNH
  work_status TEXT DEFAULT 'home', -- 'home' ou 'road'
  truck_id UUID REFERENCES trucks(id) ON DELETE SET NULL, -- Cavalo Fixo
  current_trailer_id UUID REFERENCES trucks(id) ON DELETE SET NULL, -- Carreta Atual
  current_invoice TEXT, -- Nota Fiscal Atual
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR TABELA DE FRETES (TRIPS)
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  truck_id UUID REFERENCES trucks(id) ON DELETE SET NULL,
  trailer_id UUID REFERENCES trucks(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('ida', 'volta')),
  origin TEXT,
  destination TEXT,
  cte TEXT,
  loading_date DATE,
  cte_date DATE,
  delivery_date DATE,
  km_initial DECIMAL(12,2),
  km_final DECIMAL(12,2),
  freight_value DECIMAL(12,2),
  advance_value DECIMAL(12,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CRIAR TABELA DE GASTOS DE VIAGEM (TRIP_EXPENSES)
CREATE TABLE IF NOT EXISTS trip_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('fuel', 'diverse', 'advance')),
  date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  value DECIMAL(12,2) NOT NULL,
  liters DECIMAL(12,2),
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CRIAR TABELA DE DÍVIDAS/FINANCEIRO (DEBTS)
CREATE TABLE IF NOT EXISTS debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_name TEXT NOT NULL,
  total_value DECIMAL(12,2),
  installments_count INTEGER DEFAULT 1,
  installments_paid INTEGER DEFAULT 0,
  due_date DATE,
  type TEXT CHECK (type IN ('pagar', 'receber')),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CRIAR TABELA DE GASTOS GERAIS DA EMPRESA (COMPANY_EXPENSES)
CREATE TABLE IF NOT EXISTS company_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  category TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ATUALIZAÇÃO DE COLUNAS (PARA BANCOS JÁ EXISTENTES)
DO $$ 
BEGIN 
  -- Trucks
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trucks' AND column_name='trailer_category') THEN ALTER TABLE trucks ADD COLUMN trailer_category TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trucks' AND column_name='location_status') THEN ALTER TABLE trucks ADD COLUMN location_status TEXT DEFAULT 'yard'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trucks' AND column_name='maintenance_status') THEN ALTER TABLE trucks ADD COLUMN maintenance_status TEXT DEFAULT 'ok'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trucks' AND column_name='doc_url') THEN ALTER TABLE trucks ADD COLUMN doc_url TEXT; END IF;

  -- Drivers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='avatar_url') THEN ALTER TABLE drivers ADD COLUMN avatar_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='work_status') THEN ALTER TABLE drivers ADD COLUMN work_status TEXT DEFAULT 'home'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='current_invoice') THEN ALTER TABLE drivers ADD COLUMN current_invoice TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='cnh_url') THEN ALTER TABLE drivers ADD COLUMN cnh_url TEXT; END IF;

  -- Trips
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='type') THEN ALTER TABLE trips ADD COLUMN type TEXT DEFAULT 'ida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='cte_date') THEN ALTER TABLE trips ADD COLUMN cte_date DATE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='trailer_id') THEN ALTER TABLE trips ADD COLUMN trailer_id UUID REFERENCES trucks(id) ON DELETE SET NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='km_initial') THEN ALTER TABLE trips ADD COLUMN km_initial DECIMAL(12,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='km_final') THEN ALTER TABLE trips ADD COLUMN km_final DECIMAL(12,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='delivery_date') THEN ALTER TABLE trips ADD COLUMN delivery_date DATE; END IF;

  -- Receipts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_expenses' AND column_name='receipt_url') THEN ALTER TABLE trip_expenses ADD COLUMN receipt_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_expenses' AND column_name='receipt_url') THEN ALTER TABLE company_expenses ADD COLUMN receipt_url TEXT; END IF;
END $$;

-- 8. CRIAR TABELA DE LEMBRETES (REMINDERS)
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  type TEXT DEFAULT 'normal', -- 'normal', 'urgent', 'maintenance'
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CRIAR TABELA DE DOCUMENTOS DA EMPRESA (COMPANY DOCUMENTS)
CREATE TABLE IF NOT EXISTS company_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- Ex: 'Contratos', 'Licenças', etc.
  file_url TEXT NOT NULL,
  expiration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. RECARREGAR CACHE DE SCHEMAS (Corrige o erro "Database error querying schema")
NOTIFY pgrst, 'reload schema';`}
            </pre>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-xs">
            <Info className="shrink-0 mt-1" size={18} />
            <div className="space-y-1">
              <p className="font-bold">⚠️ Erro "Database error querying schema"?</p>
              <p className="leading-relaxed">
                Este erro ocorre quando o banco de dados é alterado mas o cache do Supabase (PostgREST) fica desatualizado. Para corrigi-lo:
              </p>
              <ul className="list-disc pl-4 space-y-1 mt-1 font-medium">
                <li>Execute a linha <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-bold text-[10px]">NOTIFY pgrst, 'reload schema';</code> no SQL Editor do Supabase.</li>
                <li>Ou no painel do Supabase, vá em <b>Database</b> &gt; <b>Schema Cache</b> e clique em <b>Reload Schema Cache</b>.</li>
              </ul>
            </div>
          </div>

          <button 
            onClick={() => setShowSetup(false)}
            className="w-full py-3 bg-brand-dark text-white rounded-xl font-bold text-xs uppercase tracking-widest"
          >
            Entendi
          </button>
        </div>
      </Modal>

      <DocPreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        fileUrl={previewUrl} 
        title={previewTitle} 
      />
    </div>
  );
}
