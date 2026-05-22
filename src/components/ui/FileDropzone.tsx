import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileDropzoneProps {
  onFileSelect: (file: File) => Promise<void>;
  isUploading?: boolean;
  currentValue?: string;
  onClear?: () => void;
  className?: string;
  accept?: string;
}

export function FileDropzone({ 
  onFileSelect, 
  isUploading = false, 
  currentValue, 
  onClear, 
  className,
  accept = "image/*,.pdf" 
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await onFileSelect(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onFileSelect(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (currentValue) {
    return (
      <div className={cn("panel p-3 bg-emerald-500/5 border-emerald-500/20 flex items-center justify-between", className)}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500">
            <CheckCircle2 size={16} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none mb-1">Anexo Confirmado</p>
            <p className="text-[9px] text-brand-text-muted truncate font-mono">{currentValue}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a 
            href={currentValue} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
          >
            <FileText size={14} />
          </a>
          <button 
            type="button"
            onClick={onClear}
            className="p-1.5 bg-brand-bg border border-brand-border text-red-500 rounded-lg hover:bg-red-500/10 transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
      className={cn(
        "relative panel border-dashed border-2 p-4 min-h-[100px] flex flex-col items-center justify-center cursor-pointer transition-all gap-2 group",
        isDragging ? "border-brand-primary bg-brand-primary/5" : "border-brand-border hover:border-brand-primary/50 hover:bg-brand-bg/50",
        isUploading && "pointer-events-none opacity-70",
        className
      )}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        onChange={handleFileChange}
        accept={accept}
      />
      
      {isUploading ? (
        <>
          <Loader2 className="text-brand-primary animate-spin" size={24} />
          <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest animate-pulse">Subindo Arquivo...</p>
        </>
      ) : (
        <>
          <div className={cn(
            "p-2 rounded-xl transition-all",
            isDragging ? "bg-brand-primary text-white scale-110" : "bg-brand-bg text-brand-text-muted group-hover:text-brand-primary"
          )}>
            <Upload size={20} />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-brand-text uppercase tracking-widest mb-0.5">Clique ou arraste o comprovante</p>
            <p className="text-[9px] text-brand-text-muted">PDF ou Imagem (Máx 5MB)</p>
          </div>
        </>
      )}
    </div>
  );
}
