import React from 'react';
import { X, Download, FileText, ExternalLink, Copy } from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from './Toast';

interface DocPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
}

export function DocPreviewModal({ isOpen, onClose, fileUrl, title }: DocPreviewModalProps) {
  const { showToast } = useToast();
  if (!fileUrl) return null;

  const isImage = fileUrl.startsWith('data:image/') || 
                  /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i.test(fileUrl);
  const isPdf = fileUrl.startsWith('data:application/pdf') || 
                /\.(pdf)$/i.test(fileUrl);

  const handleDownload = () => {
    try {
      if (fileUrl.startsWith('data:')) {
        const parts = fileUrl.split(',');
        const mimePart = parts[0];
        const mimeMatch = mimePart.match(/data:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const base64Data = parts[1];

        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = title || 'documento';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        showToast('Documento baixado com sucesso!', 'success');
      } else {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = title || 'documento';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Documento baixado!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao baixar documento:', err);
      // Fallback normal
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = title || 'documento';
      link.click();
      showToast('Documento baixado!', 'success');
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(fileUrl);
      showToast('Link/Base64 copiado para a área de transferência!', 'success');
    } catch (e) {
      showToast('Erro ao copiar link.', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-4xl">
      <div className="flex flex-col gap-6">
        {/* Preview Area */}
        <div className="bg-brand-bg rounded-xl border border-brand-border/60 p-4 min-h-[300px] flex items-center justify-center relative overflow-hidden">
          {isImage ? (
            <img 
              src={fileUrl} 
              alt={title} 
              className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md mx-auto" 
            />
          ) : isPdf ? (
            <div className="w-full flex flex-col gap-4 items-center">
              <iframe 
                src={fileUrl} 
                title={title}
                className="w-full h-[55vh] rounded-lg border border-brand-border/40 hidden md:block"
              />
              <div className="md:hidden flex flex-col items-center gap-3 p-8 text-center bg-brand-panel/40 rounded-xl w-full border border-brand-border">
                <FileText size={48} className="text-brand-primary" />
                <p className="text-sm font-bold text-brand-text">Visualização de PDF indisponível em telas pequenas</p>
                <p className="text-xs text-brand-text-muted">Por favor, clique no botão de download abaixo para baixar e abrir o PDF.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-primary/5 flex items-center justify-center border border-brand-border/80">
                <FileText size={32} className="text-brand-primary" />
              </div>
              <p className="text-sm font-bold text-brand-text">Pré-visualização não suportada para este formato</p>
              <p className="text-xs text-brand-text-muted">Use as opções abaixo para baixar ou visualizar o arquivo original.</p>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-brand-panel border border-brand-border rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-text truncate max-w-[200px] sm:max-w-[350px]" title={title}>
                {title}
              </p>
              <p className="text-[10px] text-brand-text-muted">
                {isImage ? 'Formato de Imagem' : isPdf ? 'Documento PDF' : 'Arquivo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              onClick={handleCopyLink}
              title="Copiar Código/Link"
              className="p-2.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-brand-text rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              <Copy size={15} />
              <span>Copiar</span>
            </button>
            <button
              onClick={handleDownload}
              className="btn-primary flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              <Download size={15} />
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
