"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { Student, StudentAttendance, Schedule, Curriculum, Teacher, SavingsTransaction, SPPPayment } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Loader2, 
    AlertTriangle, 
    CalendarDays, 
    UserCheck, 
    Clock, 
    ArrowRight,
    CheckCircle2,
    Info,
    UserCircle,
    ExternalLink,
    FileSearch,
    FileText,
    Fingerprint,
    Baby,
    HeartHandshake,
    Phone,
    MapPin,
    Calendar,
    Users,
    X,
    ArrowRightCircle,
    PiggyBank,
    ReceiptText,
    WifiOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSchoolProfile } from "@/context/school-profile-provider";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { useAcademicYear } from "@/context/academic-year-provider";
import { cn } from "@/lib/utils";
import QRCode from 'qrcode';

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

function InfoField({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-muted/60 last:border-0">
            <div className="p-1.5 bg-primary/5 rounded-lg text-primary shrink-0">
                <Icon className="h-3 w-3" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-[10px] font-semibold text-foreground/80 leading-snug uppercase">{value || '-'}</p>
            </div>
        </div>
    );
}

export default function ParentDashboardPage() {
  const [nis, setNis] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState<string>("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const firestore = useFirestore();
  const { activeYear } = useAcademicYear();
  const { profile } = useSchoolProfile();

  useEffect(() => {
    const storedNis = sessionStorage.getItem('studentNis');
    setNis(storedNis);
    setTodayStr(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const studentRef = useMemoFirebase(() => {
    if (!firestore || !nis) return null;
    return doc(firestore, "students", nis);
  }, [firestore, nis]);
  const { data: student, loading: isStudentLoading, error: studentError } = useDoc<Student>(studentRef);

  const savingsQuery = useMemoFirebase(() => {
    if (!firestore || !nis) return null;
    return query(collection(firestore, "savingsTransactions"), where("saverId", "==", nis));
  }, [firestore, nis]);
  const { data: rawSavings } = useCollection<SavingsTransaction>(savingsQuery);

  const savingsBalance = useMemo(() => {
    if (!rawSavings) return 0;
    return rawSavings.reduce((acc, t) => t.type === 'deposit' ? acc + t.amount : acc - t.amount, 0);
  }, [rawSavings]);

  const sppQuery = useMemoFirebase(() => {
    if (!firestore || !nis) return null;
    return query(collection(firestore, "sppPayments"), where("studentId", "==", nis));
  }, [firestore, nis]);
  const { data: allPayments } = useCollection<SPPPayment>(sppQuery);

  const sppStats = useMemo(() => {
    if (!allPayments || !activeYear) return { totalPaid: 0, unpaidMonths: 0, totalArrears: 0 };
    const [startYear, endYear] = activeYear.split('/').map(Number);
    
    const currentYearPayments = allPayments.filter(p => {
        if (p.month >= 7) return p.year === startYear;
        if (p.month <= 6) return p.year === endYear;
        return false;
    });

    const totalPaid = currentYearPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const targetMonths = 10;
    const paidCount = currentYearPayments.length;
    const unpaidMonths = Math.max(0, targetMonths - paidCount);
    
    const defaultAmount = profile?.defaultSppAmount || 50000;
    const totalArrears = unpaidMonths * defaultAmount;

    return { totalPaid, unpaidMonths, totalArrears };
  }, [allPayments, activeYear, profile]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !nis || !todayStr) return null;
    return query(
        collection(firestore, "student_attendances"),
        where("studentId", "==", nis),
        where("date", "==", todayStr)
    );
  }, [firestore, nis, todayStr]);
  const { data: attendanceData } = useCollection<StudentAttendance>(attendanceQuery);

  const scheduleQuery = useMemoFirebase(() => {
    if (!firestore || student?.kelas === undefined) return null;
    return query(
        collection(firestore, "schedules"),
        where("classLevel", "==", student.kelas),
        where("type", "==", "pelajaran")
    );
  }, [firestore, student?.kelas]);
  const { data: allSchedules } = useCollection<Schedule>(scheduleQuery);

  const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
  const { data: curriculum } = useCollection<Curriculum>(curriculumQuery);

  const teachersQuery = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
  const { data: teachers } = useCollection<Teacher>(teachersQuery);

  const todayAttendance = attendanceData?.[0];
  
  const todayScheduleEntries = useMemo(() => {
    if (!allSchedules || !curriculum || !teachers) return [];
    
    const activeYearSchedule = allSchedules.find(s => s.academicYear === activeYear);
    const fallbackSchedule = [...allSchedules].sort((a,b) => b.academicYear.localeCompare(a.academicYear))[0];
    const scheduleToUse = activeYearSchedule || fallbackSchedule;
    
    if (!scheduleToUse) return [];

    const dayIndex = new Date().getDay();
    const dayKey = dayMapping[dayIndex];
    if (!dayKey) return [];

    const entries = scheduleToUse[dayKey] || [];
    return entries.map(entry => {
        const subject = curriculum.find(c => c.id === entry.subjectId);
        const teacher = teachers.find(t => t.id === entry.teacherId);
        return { ...entry, subjectName: subject?.subjectName, teacherName: teacher?.name };
    }).filter(e => e.subjectName);
  }, [allSchedules, curriculum, teachers, activeYear]);

  if (!nis || isStudentLoading) {
    return <div className="flex h-[60vh] w-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const isOffline = studentError?.message?.toLowerCase().includes('offline');

  if (studentError || !student) {
      return (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-4 bg-destructive/5 rounded-[32px] border border-destructive/20 mt-10">
             <div className="p-4 bg-destructive/10 rounded-full">
                {isOffline ? <WifiOff className="h-8 w-8 text-destructive" /> : <AlertTriangle className="h-8 w-8 text-destructive" />}
             </div>
             <div className="space-y-1">
                <p className="font-bold text-destructive">
                    {isOffline ? "Koneksi Terputus" : "Data Santri Tidak Ditemukan"}
                </p>
                <p className="text-xs text-muted-foreground">
                    {isOffline 
                        ? "Gagal memuat data karena Anda sedang offline. Silakan periksa koneksi internet Anda." 
                        : "Profil santri tidak ditemukan di sistem. Harap periksa kembali NIS Anda atau hubungi Admin Madrasah."}
                </p>
             </div>
             <Button variant="outline" className="rounded-full h-10 px-6 mt-2" onClick={() => window.location.reload()}>
                Muat Ulang
             </Button>
          </div>
      );
  }

  return (
    <div className="space-y-3 pb-8">
        {/* Profile Card (Compact) */}
        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-white/20">
                    <AvatarImage src={student?.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-lg">{student?.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-1">
                            <h2 className="text-sm font-bold truncate leading-tight uppercase">{student?.name}</h2>
                            <div className="flex items-center gap-2 mt-0.5 opacity-70">
                                <span className="text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded tracking-tighter">NIS: {student?.nis?.replace('MDIA', '')}</span>
                                <span className="text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded tracking-tighter">KLAS: {student?.kelas}</span>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="xs" 
                            className="text-white/80 h-6 px-1.5 gap-1 text-[8px] uppercase font-bold border border-white/20"
                            onClick={() => setIsDetailOpen(true)}
                        >
                            Detail
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Finance Stats (Compact) */}
        <div className="grid grid-cols-2 gap-2">
            <Card className="bg-primary text-primary-foreground border-none shadow-sm">
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[8px] font-bold uppercase tracking-tight opacity-60">Tabungan</CardTitle>
                    <PiggyBank className="h-3 w-3 opacity-30" />
                </CardHeader>
                <CardContent className="px-3 pb-2">
                    <div className="text-sm font-bold truncate">Rp {savingsBalance.toLocaleString()}</div>
                </CardContent>
            </Card>
            <Card className="bg-primary text-primary-foreground border-none shadow-sm">
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[8px] font-bold uppercase tracking-tight opacity-60">SPP</CardTitle>
                    <ReceiptText className="h-3 w-3 opacity-30" />
                </CardHeader>
                <CardContent className="px-3 pb-2">
                    <div className="text-sm font-bold truncate">Rp {sppStats.totalPaid.toLocaleString()}</div>
                    <p className="text-[7px] font-bold mt-0.5 truncate uppercase">Tunggakan: Rp {sppStats.totalArrears.toLocaleString()}</p>
                </CardContent>
            </div >
        </div>

        {/* Today's Attendance (Compact) */}
        <Card className="border-none shadow-sm">
            <CardHeader className="p-3 pb-1.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3 w-3" /> Absensi Hari Ini
                </CardTitle>
                <Link href="/parent/attendance">
                    <Button variant="ghost" size="xs" className="h-5 px-1 text-[8px] font-bold text-primary uppercase">Riwayat</Button>
                </Link>
            </CardHeader>
            <CardContent className="px-3 pb-3">
                <div className={cn(
                    "flex items-center justify-between p-2 rounded-lg border",
                    todayAttendance?.status === 'Hadir' ? "bg-green-50/50 border-green-100" : "bg-muted/30 border-muted/50"
                )}>
                    <div className="flex items-center gap-2">
                        {todayAttendance?.status === 'Hadir' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 opacity-30" />}
                        <div>
                            <p className="text-[11px] font-bold">{todayAttendance?.status || "Belum Absen"}</p>
                            <p className="text-[9px] opacity-60">{format(new Date(), "d MMMM yyyy", { locale: dfnsId })}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Today's Schedule (Compact) */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-3 pb-1.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Jadwal Pelajaran
                </CardTitle>
                <Link href="/parent/schedule">
                    <Button variant="ghost" size="xs" className="h-5 px-1 text-[8px] font-bold text-primary uppercase">Lihat</Button>
                </Link>
            </CardHeader>
            <CardContent className="px-3 pb-3">
                {todayScheduleEntries.length > 0 ? (
                    <div className="space-y-2 mt-1">
                        {todayScheduleEntries.map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px] border-l-2 border-primary/20 pl-2">
                                <div className="font-bold text-primary uppercase truncate max-w-[150px]">{entry.subjectName}</div>
                                <span className="font-mono opacity-60 text-[9px]">{entry.startTime}</span>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-[10px] text-muted-foreground italic text-center py-2">Tidak ada jadwal.</p>}
            </CardContent>
        </Card>

        {/* Profile Dialog (Compact) */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="sm:max-w-xs p-0 overflow-hidden rounded-[24px]">
                <div className="bg-primary/5 p-4 flex flex-col items-center text-center">
                    <Avatar className="h-16 w-16 border-2 border-white mb-2">
                        <AvatarImage src={student?.avatarUrl} className="object-cover" />
                        <AvatarFallback>{student?.name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-sm font-bold uppercase text-primary leading-tight">{student?.name}</h3>
                    <p className="text-[10px] opacity-60">NIS: {student?.nis}</p>
                </div>
                <ScrollArea className="h-[250px] px-4">
                    <div className="py-2">
                        <InfoField label="NIK" value={student?.nik || ""} icon={Fingerprint} />
                        <InfoField label="Jenis Kelamin" value={student?.gender} icon={Baby} />
                        <InfoField label="TTL" value={`${student?.tempatLahir || '-'}, ${student?.dateOfBirth}`} icon={Calendar} />
                        <InfoField label="Ayah" value={student?.namaAyah || ""} icon={HeartHandshake} />
                        <InfoField label="Ibu" value={student?.namaIbu || ""} icon={HeartHandshake} />
                        <InfoField label="WhatsApp Wali" value={student?.noWa || ""} icon={Phone} />
                    </div>
                </ScrollArea>
                <div className="p-3 border-t bg-muted/30">
                    <Button variant="outline" className="w-full h-8 text-[10px] uppercase font-bold" onClick={() => setIsDetailOpen(false)}>Tutup Profil</Button>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
