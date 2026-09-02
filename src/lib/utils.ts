import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Menangani pencetakan dokumen dengan mendeteksi apakah aplikasi berjalan di WebView Android (APK).
 * Jika di WebView, konten dilemparkan ke browser sistem via Blob URL.
 * Jika di browser normal, menjalankan alur window.print() standar.
 */
export function safePrint(htmlContent: string) {
  if (typeof window === 'undefined') return;

  const ua = window.navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isWebView = isAndroid && (ua.includes('wv') || ua.includes('Version/'));

  if (isWebView) {
    // Strategi APK: Gunakan Blob untuk memicu pembukaan di browser eksternal/viewer sistem
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Gunakan link tersembunyi untuk memicu pembukaan
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Revoke URL setelah beberapa saat
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error("Gagal melempar cetakan ke browser", e);
      alert("Gunakan browser standar (Chrome/Safari) untuk fitur cetak yang stabil.");
    }
  } else {
    // Strategi Browser Normal
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Berikan jeda untuk rendering CSS/Gambar
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      };
    }
  }
}
