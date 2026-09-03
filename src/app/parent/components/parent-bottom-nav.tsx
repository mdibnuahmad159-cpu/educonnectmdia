
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Home, 
  Wallet, 
  FileText,
  UserCheck,
  X,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from 'qrcode';

const navItems = [
  { href: "/parent/dashboard", icon: Home, label: "Beranda" },
  { href: "/parent/finance", icon: Wallet, label: "Keuangan" },
  { href: "/parent/reports", icon: FileText, label: "Rapor" },
];

export function ParentBottomNav() {
  const pathname = usePathname();
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [nis, setNis] = useState<string | null>(null);

  useEffect(() => {
    const storedNis = sessionStorage.getItem('studentNis');
    setNis(storedNis);
  }, []);

  useEffect(() => {
    if (nis && isQrOpen) {
      QRCode.toDataURL(nis, {
        width: 512,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(setQrDataUrl).catch(err => console.error(err));
    }
  }, [nis, isQrOpen]);

  return (
    <>
      <div className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
        <div className="flex items-center gap-3 max-w-md w-full pointer-events-auto">
          <nav className="flex-1 bg-primary/95 backdrop-blur-md rounded-full p-1.5 flex items-center justify-around shadow-2xl border border-white/10">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200",
                    isActive ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95 duration-200">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => setIsQrOpen(true)}
            className="w-14 h-14 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
            aria-label="Tampilkan QR Absen"
          >
            <UserCheck className="w-6 h-6" />
          </button>
        </div>
      </div>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-xs p-6 rounded-[32px] border-none shadow-2xl">
          <DialogHeader className="text-center">
            <DialogTitle className="text-sm font-bold uppercase tracking-tight text-primary">ID Absensi Santri</DialogTitle>
            <DialogDescription className="text-[10px]">
              Tunjukkan kode ini kepada Guru untuk dicatat kehadirannya.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
             <div className="p-4 bg-white rounded-[32px] shadow-inner border border-muted/50">
                {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
                    </div>
                )}
             </div>
             <div className="text-center space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Nomor Induk Siswa</p>
                <p className="text-sm font-mono font-bold text-primary tracking-wider">{nis?.replace('MDIA', '')}</p>
             </div>
          </div>

          <Button 
            variant="ghost" 
            onClick={() => setIsQrOpen(false)} 
            className="w-full h-10 rounded-full font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5 mr-2" /> Tutup
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
