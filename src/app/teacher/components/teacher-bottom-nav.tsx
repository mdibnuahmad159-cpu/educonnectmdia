
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { 
  Home, 
  ClipboardCheck, 
  UserCheck, 
  PiggyBank, 
  LogOut, 
  ScanLine, 
  X, 
  Camera 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, Firestore } from "firebase/firestore";
import type { Student, Schedule, ScheduleEntry } from "@/types";
import { format } from "date-fns";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useToast } from "@/hooks/use-toast";
import { saveStudentAttendanceBatch } from "@/lib/firebase-helpers";
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
  { href: "/teacher/dashboard", icon: Home, label: "Beranda" },
  { href: "/teacher/grades", icon: ClipboardCheck, label: "Nilai" },
  { href: "/teacher/student-attendance", icon: UserCheck, label: "Absen" },
  { href: "/teacher/tabungan", icon: PiggyBank, label: "Tabungan" },
];

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
      const html5QrCode = new Html5Qrcode("teacher-qr-reader");
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
        <div id="teacher-qr-reader" className="h-full w-full"></div>
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

export function TeacherBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore() as Firestore;
  const { activeYear } = useAcademicYear();
  const { toast } = useToast();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'students') : null, [firestore]);
  const { data: students } = useCollection<Student>(studentsCollection);

  const schedulesQuery = useMemoFirebase(() => {
      if (!firestore || !activeYear) return null;
      return query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', 'pelajaran'));
  }, [firestore, activeYear]);
  const { data: schedules } = useCollection<Schedule>(schedulesQuery);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      sessionStorage.removeItem('teacherNig');
      await signOut(auth);
      toast({ title: "Logout Berhasil" });
      router.push('/');
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Gagal" });
    }
  };

  const handleScannerResult = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dayIndex = new Date().getDay();
    const dayMapping: { [key: number]: string } = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 6: 'saturday' };
    const dayKey = dayMapping[dayIndex];

    const foundStudent = students?.find(s => s.nis === decodedText || s.id === decodedText);
    
    if (!foundStudent) {
      toast({ variant: "destructive", title: "ID Tidak Dikenal", description: "Data santri tidak ditemukan." });
      setIsProcessing(false);
      return;
    }

    if (!dayKey || !schedules) {
      toast({ variant: "destructive", title: "Gagal", description: "Jadwal tidak tersedia hari ini." });
      setIsProcessing(false);
      return;
    }

    const classSchedule = schedules.find(s => s.classLevel === foundStudent.kelas);
    if (!classSchedule || !classSchedule[dayKey as keyof Schedule] || (classSchedule[dayKey as keyof Schedule] as ScheduleEntry[]).length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Jadwal", description: `Kelas ${foundStudent.kelas} tidak memiliki jadwal hari ini.` });
      setIsProcessing(false);
      return;
    }

    try {
      await saveStudentAttendanceBatch(firestore, [{
        studentId: foundStudent.id,
        studentName: foundStudent.name,
        nis: foundStudent.nis,
        kelas: foundStudent.kelas!,
        date: todayStr,
        status: 'Hadir'
      }]);
      toast({ title: "Absen Berhasil", description: `${foundStudent.name} tercatat Hadir.` });
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
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-white/50 hover:text-white transition-all"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </nav>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-14 h-14 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
            aria-label="Scan Absen Siswa"
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
              Scanner Absen Siswa
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pindai barcode santri untuk mencatat kehadiran hari ini secara instan.
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
