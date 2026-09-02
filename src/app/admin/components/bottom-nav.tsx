
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import { 
  Home, 
  Users, 
  GraduationCap, 
  Wallet, 
  ScanLine, 
  X, 
  Loader2, 
  Camera,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, Firestore } from "firebase/firestore";
import type { Teacher, Schedule, TeacherAttendance, ScheduleEntry } from "@/types";
import { format, parseISO } from "date-fns";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useToast } from "@/hooks/use-toast";
import { saveTeacherAttendanceBatch } from "@/lib/firebase-helpers";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin/dashboard", icon: Home, label: "Home" },
  { href: "/admin/akademik", icon: BookOpen, label: "Akademik" },
  { href: "/admin/siswa-menu", icon: GraduationCap, label: "Siswa" },
  { href: "/admin/keuangan-menu", icon: Wallet, label: "Keuangan" },
];

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

function BarcodeScanner({ 
  onResult, 
  onClose 
}: { 
  onResult: (text: string) => void, 
  onClose: () => void 
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const html5QrCode = new Html5Qrcode("global-qr-reader");
      scannerRef.current = html5QrCode;

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
      };

      html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => onResult(decodedText),
        undefined
      ).catch(() => {
        html5QrCode.start(
            { facingMode: "user" },
            config,
            (decodedText) => onResult(decodedText),
            undefined
        ).catch(e => console.error("Camera fail", e));
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
        }).catch(err => console.warn("Scanner cleanup failed", err));
      }
    };
  }, [onResult]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-primary/20 bg-muted/20">
        <div id="global-qr-reader" className="h-full w-full"></div>
        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 flex items-center justify-center">
            <div className="w-full h-full border-2 border-primary shadow-[0_0_0_100vw_rgba(0,0,0,0.3)]"></div>
        </div>
      </div>
      <Button variant="outline" onClick={onClose} className="w-full h-10 font-bold border-destructive/20 text-destructive">
          <X className="h-4 w-4 mr-2" /> Batalkan
      </Button>
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const firestore = useFirestore() as Firestore;
  const { activeYear } = useAcademicYear();
  const { toast } = useToast();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data fetching for scanner logic
  const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
  const { data: teachers } = useCollection<Teacher>(teachersCollection);
  
  const schedulesQuery = useMemoFirebase(() => {
      if (!firestore || !activeYear) return null;
      return query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', 'pelajaran'));
  }, [firestore, activeYear]);
  const { data: schedules } = useCollection<Schedule>(schedulesQuery);

  const handleScannerResult = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dayIndex = new Date().getDay();
    const dayKey = dayMapping[dayIndex];

    const foundTeacher = teachers?.find(t => t.nig === decodedText || t.id === decodedText);
    
    if (!foundTeacher) {
      toast({ variant: "destructive", title: "QR Tidak Dikenal", description: "Data guru tidak ditemukan." });
      setIsProcessing(false);
      return;
    }

    if (!dayKey || !schedules) {
      toast({ variant: "destructive", title: "Gagal", description: "Jadwal tidak tersedia." });
      setIsProcessing(false);
      return;
    }

    const scheduledIds = new Set<string>();
    schedules.forEach(s => {
      const entries = s[dayKey] as ScheduleEntry[];
      entries?.forEach(e => e.teacherId && scheduledIds.add(e.teacherId));
    });

    if (!scheduledIds.has(foundTeacher.id)) {
      toast({ variant: "destructive", title: "Tidak Terjadwal", description: `${foundTeacher.name} tidak mengajar hari ini.` });
      setIsProcessing(false);
      return;
    }

    try {
      await saveTeacherAttendanceBatch(firestore, [{
        teacherId: foundTeacher.id,
        teacherName: foundTeacher.name,
        date: todayStr,
        status: 'Hadir'
      }]);
      toast({ title: "Absen Berhasil", description: `${foundTeacher.name} tercatat Hadir.` });
      setIsScannerOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal Menyimpan" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
        <div className="flex items-center gap-3 max-w-md w-full pointer-events-auto">
          {/* Black Nav Pill */}
          <nav className="flex-1 bg-black/90 backdrop-blur-md rounded-full p-1.5 flex items-center justify-around shadow-2xl border border-white/10">
            {navItems.map((item) => {
              // Normalized check to handle trailing slashes
              const cleanPath = pathname.replace(/\/$/, '');
              const cleanItemHref = item.href.replace(/\/$/, '');
              const isActive = cleanPath === cleanItemHref || (cleanItemHref !== '/admin/dashboard' && cleanPath.startsWith(cleanItemHref));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300",
                    isActive ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-left-2 duration-300">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Yellow Scanner Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-14 h-14 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
            aria-label="Scan Absen Guru"
          >
            <ScanLine className="w-6 h-6" />
          </button>
        </div>
      </div>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-headline">
              <Camera className="h-5 w-5" />
              Scanner Absen Guru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pindai QR Code kartu guru untuk mencatat kehadiran hari ini secara otomatis.
            </DialogDescription>
          </DialogHeader>
          {isScannerOpen && (
            <BarcodeScanner 
              onResult={handleScannerResult} 
              onClose={() => setIsScannerOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
