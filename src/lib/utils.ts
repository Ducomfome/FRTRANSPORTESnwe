import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date) {
  if (!date) return '-';
  
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('pt-BR').format(d);
  }
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

export function openDocument(url: string, title?: string) {
  if (!url) return;

  // Se for uma data URL (Base64)
  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      const mimePart = parts[0];
      const mimeMatch = mimePart.match(/data:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const base64Data = parts[1];

      // Converte Base64 para array de bytes
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });

      // Cria object URL
      const blobUrl = URL.createObjectURL(blob);
      
      // Abre em nova aba
      const newWin = window.open(blobUrl, '_blank');
      if (newWin) {
        newWin.focus();
      } else {
        // Fallback se popup-blocker bloquear
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.click();
      }
    } catch (e) {
      console.error('Erro ao converter Base64:', e);
      // Fallback: se falhar, tenta fazer o download
      const link = document.createElement('a');
      link.href = url;
      link.download = title || 'documento';
      link.click();
    }
  } else {
    // Se for URL normal
    const newWin = window.open(url, '_blank');
    if (newWin) {
      newWin.focus();
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }
  }
}

