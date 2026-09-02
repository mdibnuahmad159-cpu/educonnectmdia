import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Mengembalikan fungsi cetak ke standar window.print
 * Ini akan bekerja secara normal di browser PC/Laptop dan Chrome Android.
 */
export function safePrint(htmlContent: string) {
  if (typeof window === 'undefined') return;

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
      // Jika pop-up diblokir, gunakan navigasi langsung sebagai upaya terakhir
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.location.assign(url);
    }
  } catch (e) {
    console.error("Print failed", e);
    alert("Gagal memproses dokumen untuk dicetak.");
  }
}
