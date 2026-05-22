import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Paperclip, 
  Download, 
  Calendar, 
  Clock, 
  AlertCircle,
  Database,
  Info,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { dbService } from '../lib/dbService';
import { CompanyDocument } from '../types';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { cn, formatDate, openDocument } from '../lib/utils';
import { FileDropzone } from './ui/FileDropzone';
import { isSupabaseConfigured } from '../lib/supabase';
import { DocPreviewModal } from './ui/DocPreviewModal';

export function CompanyDocumentsView() {
  const { showToast } = useToast();
  const [companyDocs, setCompanyDocs] = useState<CompanyDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docFileUrl, setDocFileUrl] = useState('');
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [newDoc, setNewDoc] = useState({
    title: '',
    category: 'Contratos',
    expiration_date: ''
  });

  const fetchCompanyDocs = async () => {
    setDocsLoading(true);
    try {
      const data = await dbService.getCompanyDocuments();
      setCompanyDocs(data);
    } catch (e) {
      console.error('Erro ao buscar documentos corporativos:', e);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDocs();
  }, []);

  const handleDocFileDrop = async (file: File) => {
    setIsDocUploading(true);
    try {
      const fileName = `company_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const bucket = 'documents';
      const publicUrl = await dbService.uploadFile(bucket, fileName, file);
      
      setDocFileUrl(publicUrl);
      showToast('Documento carregado!', 'success');
    } catch (error: any) {
      console.error('Erro no upload de doc corporativo:', error);
      showToast(`Erro no upload: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsDocUploading(false);
    }
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title.trim()) {
      showToast('Por favor, defina o nome do documento.', 'error');
      return;
    }
    if (!docFileUrl) {
      showToast('Por favor, faça o upload de um arquivo para o documento.', 'error');
      return;
    }

    setIsSubmittingDoc(true);
    try {
      await dbService.addCompanyDocument({
        title: newDoc.title.trim(),
        category: newDoc.category,
        file_url: docFileUrl,
        expiration_date: newDoc.expiration_date || null
      });
      showToast('Documento de empresa cadastrado!', 'success');
      setIsDocModalOpen(false);
      setNewDoc({ title: '', category: 'Contratos', expiration_date: '' });
      setDocFileUrl('');
      fetchCompanyDocs();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar o documento.', 'error');
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este documento geral da empresa?')) return;
    try {
      await dbService.deleteCompanyDocument(id);
      showToast('Documento excluído!', 'success');
      fetchCompanyDocs();
    } catch (error: any) {
      showToast(error.message || 'Erro ao excluir o documento.', 'error');
    }
  };

  const filteredDocs = companyDocs.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {!isSupabaseConfigured && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-red-800">
          <div className="flex items-start gap-4">
            <AlertTriangle className="shrink-0 mt-1" />
            <div className="text-sm">
              <p className="font-bold text-lg mb-1">Banco de Dados não conectado!</p>
              <p className="opacity-90 leading-relaxed">
                Para salvar e editar dados de documentos em nuvem, você precisa configurar o Supabase.<br/>
                No entanto, o sistema salvou e continuará exibindo as informações no <b>armazenamento do navegador</b> com segurança!
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

      {/* Header & Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-brand-text tracking-tight flex items-center gap-2">
            <FolderOpen size={22} className="text-brand-primary" />
            Documentos da Empresa 📋
          </h2>
          <p className="text-xs text-brand-text-muted font-medium mt-1">
            Gestão inteligente de alvarás, contratos, apólices de seguros, licenças e outros registros administrativos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={17} />
            <input 
              type="text" 
              placeholder="Buscar documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-brand-panel border border-brand-border text-brand-text rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all w-full md:w-64 text-xs"
            />
          </div>
          <button 
            onClick={() => {
              setNewDoc({ title: '', category: 'Contratos', expiration_date: '' });
              setDocFileUrl('');
              setIsDocModalOpen(true);
            }}
            className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            <Plus size={15} />
            <span>Cadastrar Documento</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="panel p-6 border border-brand-border bg-brand-panel rounded-3xl shadow-xl">
        {docsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="panel h-36 animate-pulse bg-brand-bg/50 border border-brand-border rounded-2xl"></div>
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-brand-border/60 rounded-3xl bg-brand-bg/20">
            <div className="w-16 h-16 bg-brand-bg border border-brand-border rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <FolderOpen size={26} className="text-brand-text-muted" />
            </div>
            <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider">Nenhum documento encontrado</p>
            <p className="text-xs text-brand-text-muted/85 mt-2 max-w-sm mx-auto">
              {searchTerm ? 'Experimente alterar os termos de busca ou filtros.' : 'Cadastre e armazene alvarás, contratos, apólices de seguros, ANTT e outros.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => {
              const isExpired = doc.expiration_date ? new Date(doc.expiration_date) < new Date() : false;
              const isExpiringSoon = doc.expiration_date ? (
                !isExpired && (new Date(doc.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30
              ) : false;

              return (
                <div key={doc.id} className="p-5 bg-brand-bg border border-brand-border hover:border-brand-primary/40 rounded-2xl flex flex-col justify-between transition-all group relative overflow-hidden shadow-sm hover:shadow-md">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/5 border border-brand-border flex items-center justify-center">
                        <FileText size={20} className="text-brand-primary" />
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir Documento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-brand-text leading-tight group-hover:text-brand-primary transition-colors duration-200 line-clamp-2" title={doc.title}>
                        {doc.title}
                      </h4>
                      <span className="inline-block px-2.5 py-1 bg-brand-panel border border-brand-border text-[9px] font-black uppercase tracking-wider text-brand-text-muted rounded-md mt-2">
                        {doc.category}
                      </span>
                    </div>

                    {doc.expiration_date ? (
                      <div className="flex items-center gap-1.5 pt-1">
                        <Calendar size={13} className="text-brand-text-muted shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-brand-text-muted">
                          Vencimento: {formatDate(doc.expiration_date)}
                        </span>
                        {isExpired ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                            Vencido
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Vence em breve
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-brand-text-muted font-mono font-medium">
                        <Clock size={13} className="shrink-0" />
                        <span>Sem vencimento fixo</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-5 border-t border-brand-border/60 flex items-center justify-between">
                    <span className="text-[9px] text-brand-text-muted/70 font-mono">
                      Cadastro em: {formatDate(doc.created_at)}
                    </span>
                    <button 
                      onClick={() => {
                        setPreviewUrl(doc.file_url);
                        setPreviewTitle(doc.title);
                        setIsPreviewOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white hover:bg-brand-primary/95 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm shadow-brand-primary/10 transition-all hover:scale-[1.02]"
                    >
                      <Download size={11} />
                      <span>Ver Documento</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Documentação da Empresa */}
      <Modal 
        isOpen={isDocModalOpen} 
        onClose={() => {
          setIsDocModalOpen(false);
          setNewDoc({ title: '', category: 'Contratos', expiration_date: '' });
          setDocFileUrl('');
        }} 
        title="Novo Documento da Empresa"
      >
        <form onSubmit={handleSaveDoc} className="space-y-6">
          <div>
            <label className="label-tech mb-1.5 block">Nome do Documento / Título</label>
            <input 
              value={newDoc.title}
              onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
              required 
              placeholder="Ex: Contrato de Prestação de Serviços, Certificado ANTT, Alvará de Funcionamento" 
              className="w-full text-xs"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-tech mb-1.5 block">Categoria</label>
              <select 
                value={newDoc.category}
                onChange={e => setNewDoc({ ...newDoc, category: e.target.value })}
                className="w-full text-xs"
              >
                <option value="Contratos">Contratos</option>
                <option value="Licenças">Licenças / Autorizações</option>
                <option value="Seguros">Seguros</option>
                <option value="Regulatórios / Fiscais">Regulatórios / Fiscais</option>
                <option value="Recibos">Recibos Comerciais</option>
                <option value="Outros">Outros Documentos</option>
              </select>
            </div>
            <div>
              <label className="label-tech mb-1.5 block">Data de Vencimento (Opcional)</label>
              <input 
                type="date"
                value={newDoc.expiration_date}
                onChange={e => setNewDoc({ ...newDoc, expiration_date: e.target.value })}
                className="w-full font-mono text-xs animate-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label-tech flex items-center justify-between">
              <span>Arquivo Documental (Arraste ou Clique para anexar)</span>
            </label>
            <FileDropzone 
              onFileSelect={handleDocFileDrop}
              isUploading={isDocUploading}
              currentValue={docFileUrl}
              onClear={() => setDocFileUrl('')}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmittingDoc || isDocUploading}
            className="w-full py-4 mt-2 bg-brand-primary text-white rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary/95 transition-all shadow-md disabled:opacity-50"
          >
            {isSubmittingDoc ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Anexar Documentação'
            )}
          </button>
        </form>
      </Modal>

      {/* Modal de Setup do Banco de Dados */}
      <Modal isOpen={showSetup} onClose={() => setShowSetup(false)} title="Configuração do Banco de Dados">
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3 text-blue-800">
            <Info className="shrink-0 mt-1" size={18} />
            <p className="text-xs leading-relaxed">
              Copie o código abaixo e cole no <b>SQL Editor</b> do seu painel Supabase para criar as tabelas necessárias de Documentos de Empresa.
            </p>
          </div>
          
          <div className="relative">
            <pre className="relative p-4 bg-brand-dark border border-brand-border rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto max-h-[250px] custom-scrollbar">
{`-- 1. CRIAR TABELA DE DOCUMENTOS DA EMPRESA (COMPANY DOCUMENTS)
CREATE TABLE IF NOT EXISTS company_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_url TEXT NOT NULL,
  expiration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RECARREGAR CACHE DE SCHEMAS
NOTIFY pgrst, 'reload schema';`}
            </pre>
          </div>
          
          <p className="text-xs text-brand-text-muted">
            Este comando criará a tabela <code>company_documents</code> permitindo sincronizar os arquivos em nuvem em tempo real!
          </p>
        </div>
      </Modal>

      {/* Modal de Pré-visualização do Documento */}
      <DocPreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        fileUrl={previewUrl} 
        title={previewTitle} 
      />
    </div>
  );
}
