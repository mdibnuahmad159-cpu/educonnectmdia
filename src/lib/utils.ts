import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Menangani pencetakan dokumen dengan mendeteksi apakah aplikasi berjalan di WebView Android (APK).
 * Jika di WebView, mencoba memicu pembukaan konten di browser sistem.
 * Jika di browser normal, menggunakan window.open + window.print().
 */
export function safePrint(htmlContent: string) {
  if (typeof window === 'undefined') return;

  const ua = window.navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  // Deteksi WebView yang lebih akurat (biasanya mengandung 'wv' atau 'Version/X.X' bersama 'Chrome')
  const isWebView = isAndroid && (ua.includes('wv') || (ua.includes('Chrome') && ua.includes('Version/')));

  if (isWebView) {
    try {
      // Buat Blob dari konten HTML
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Strategi di WebView: Gunakan navigasi lokasi saat ini. 
      // Kebanyakan wrapper WebView akan melempar URL yang tidak dikenal (seperti blob:) 
      // ke browser default perangkat jika window.open gagal.
      const win = window.open(url, '_blank');
      
      // Jika window.open diblokir (umum di WebView), gunakan navigasi langsung
      if (!win) {
        window.location.assign(url);
      }
      
      // Revoke URL setelah 1 menit agar memori bersih
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
      
      console.log("WebView Print: Intent triggered via location assign");
    } catch (e) {
      console.error("WebView Print Error:", e);
      // Fallback terakhir: Masukkan ke tab baru menggunakan data URI jika Blob gagal
      try {
        const dataUri = "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent);
        window.location.href = dataUri;
      } catch (e2) {
        alert("Gagal memproses dokumen untuk dicetak. Harap hubungi Admin.");
      }
    }
  } else {
    // Strategi Browser Normal (Desktop / Mobile Chrome Standar)
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Gunakan onload untuk memastikan aset (gambar/logo) dimuat sebelum cetak
        printWindow.onload = function() {
            printWindow.focus();
            printWindow.print();
        };

        // Fallback jika onload tidak terpicu
        setTimeout(() => {
            if (printWindow) {
                printWindow.focus();
                printWindow.print();
            }
        }, 1000);
      } else {
        // Jika pop-up diblokir total, gunakan Blob di tab yang sama
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.location.assign(url);
      }
    } catch (e) {
      console.error("Standard print failed", e);
    }
  }
}
