import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Menangani pencetakan dokumen dengan mendeteksi apakah aplikasi berjalan di WebView Android (APK).
 * Jika di WebView, menggunakan teknik Blob + Anchor untuk memaksa pembukaan di browser sistem atau penampil file.
 * Jika di browser normal, menggunakan window.open + window.print().
 */
export function safePrint(htmlContent: string) {
  if (typeof window === 'undefined') return;

  const ua = window.navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  // Deteksi WebView yang lebih akurat: 'wv' atau kombinasi Chrome + Version/ (khas engine WebView)
  const isWebView = isAndroid && (ua.includes('wv') || (ua.includes('Chrome') && ua.includes('Version/')));

  if (isWebView) {
    // Strategi APK: Menggunakan Blob dan Anchor dengan atribut download.
    // Di WebView, window.open sering diblokir, namun link.click() pada URL blob biasanya diizinkan
    // dan memicu sistem Android untuk menangani file tersebut (membuka di browser eksternal).
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      // Atribut download membantu sistem Android mengenali ini sebagai file yang perlu dibuka/disimpan
      link.download = `dokumen_cetak_${new Date().getTime()}.html`;
      
      document.body.appendChild(link);
      link.click();
      
      // Berikan sedikit jeda sebelum menghapus elemen
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 60000);
      
      console.log("Printing triggered via Blob strategy for WebView");
    } catch (e) {
      console.error("Gagal melempar cetakan ke browser", e);
      alert("Gagal memproses dokumen. Pastikan browser utama (Chrome) terpasang di HP Anda.");
    }
  } else {
    // Strategi Browser Normal (PC / Mobile Chrome Standar)
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        
        // Injeksi skrip untuk trigger print otomatis setelah load
        printWindow.document.write(`
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 1000);
            };
          </script>
        `);
        
        printWindow.document.close();
      } else {
        // Jika window.open diblokir popup blocker, coba gunakan blob sebagai fallback
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.location.assign(url);
      }
    } catch (e) {
      console.error("Standard print failed", e);
    }
  }
}
