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
  // Deteksi WebView yang lebih akurat
  const isWebView = isAndroid && (ua.includes('wv') || (ua.includes('Chrome') && ua.includes('Version/')));

  if (isWebView) {
    try {
      // Buat Blob dari konten HTML
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Strategi: Mencoba membuka di jendela baru (yang biasanya di-intercept oleh OS untuk dibuka di browser)
      // Tanpa atribut 'download' agar sistem mencoba merender/membuka, bukan menyimpan.
      const win = window.open(url, '_blank');
      
      // Jika window.open diblokir/gagal, gunakan trik link tersembunyi
      if (!win) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        // Atribut rel="external" membantu pada beberapa wrapper WebView untuk melempar ke browser sistem
        link.setAttribute('rel', 'external');
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
        }, 500);
      }
      
      // Revoke URL setelah beberapa saat agar memori bersih
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
      
      console.log("WebView Print: Attempted to open in external browser");
    } catch (e) {
      console.error("WebView opening failed", e);
      alert("Gagal melempar dokumen ke browser. Harap pastikan browser utama terpasang di HP Anda.");
    }
  } else {
    // Strategi Browser Normal (Desktop / Mobile Chrome Standar)
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        
        // Injeksi skrip untuk trigger print otomatis setelah konten dimuat
        // Menggunakan event 'load' untuk memastikan gambar (seperti logo/kop) sudah muncul
        printWindow.document.write(`
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 500);
            });
          </script>
        `);
        
        printWindow.document.close();
      } else {
        // Fallback jika window.open diblokir popup blocker: gunakan blob di tab saat ini
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.location.assign(url);
      }
    } catch (e) {
      console.error("Standard print failed", e);
    }
  }
}
