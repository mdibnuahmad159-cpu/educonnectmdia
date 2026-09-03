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
    ReceiptText
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

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.87 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

function InfoField({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
    return (
        <div className="flex items-center gap-3 py-3 border-b border-muted/60 last:border-0">
            <div className="p-2 bg-primary/5 rounded-lg text-primary shrink-0">
                <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-[11px] font-semibold text-foreground/80 leading-snug uppercase">{value || '-'}</p>
            </div>
        </div>
    );
}

export default function ParentDashboardPage() {
  const [nis, setNis] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState<string>("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const firestore = useFirestore();
  const { activeYear } = useAcademicYear();

  useEffect(() => {
    const storedNis = sessionStorage.getItem('studentNis');
    setNis(storedNis);
    setTodayStr(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  // Fetch Student Data
  const studentRef = useMemoFirebase(() => {
    if (!firestore || !nis) return null;
    return doc(firestore, "students", nis);
  }, [firestore, nis]);
  const { data: student, loading: isStudentLoading, error: studentError } = useDoc<Student>(studentRef);

  // Fetch Savings Transactions
  const savingsQuery = useMemoFirebase(() => {
    if (!firestore || !nis) return null;
    return query(collection(firestore, "savingsTransactions"), where("saverId", "==", nis));
  }, [firestore, nis]);
  const { data: rawSavings } = useCollection<SavingsTransaction>(savingsQuery);

  const savingsBalance = useMemo(() => {
    if (!rawSavings) return 0;
    return rawSavings.reduce((acc, t) => t.type === 'deposit' ? acc + t.amount : acc - t.amount, 0);
  }, [rawSavings]);

  // Fetch SPP Payments
  const sppQuery = useMemoFirebase(() => {
    if (!firestore || !nis) return null;
    return query(collection(firestore, "sppPayments"), where("studentId", "==", nis));
  }, [firestore, nis]);
  const { data: allPayments } = useCollection<SPPPayment>(sppQuery);

  const sppStats = useMemo(() => {
    if (!allPayments || !activeYear) return { totalPaid: 0, unpaidMonths: 0 };
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

    return { totalPaid, unpaidMonths };
  }, [allPayments, activeYear]);

  // Generate QR Code
  useEffect(() => {
      if (student?.nis) {
          QRCode.toDataURL(student.nis, {
              width: 512,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' }
          }).then(setQrDataUrl).catch(err => console.error(err));
      }
  }, [student]);

  // Today's Attendance
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !nis || !todayStr) return null;
    return query(
        collection(firestore, "student_attendances"),
        where("studentId", "==", nis),
        where("date", "==", todayStr)
    );
  }, [firestore, nis, todayStr]);
  const { data: attendanceData, loading: isAttendanceLoading } = useCollection<StudentAttendance>(attendanceQuery);

  // Fetch Schedule
  const scheduleQuery = useMemoFirebase(() => {
    if (!firestore || student?.kelas === undefined) return null;
    return query(
        collection(firestore, "schedules"),
        where("classLevel", "==", student.kelas),
        where("type", "==", "pelajaran")
    );
  }, [firestore, student?.kelas]);
  const { data: allSchedules, loading: isScheduleLoading } = useCollection<Schedule>(scheduleQuery);

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

  const isLoading = !nis || isStudentLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div className="p-4">
        <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Data Tidak Ditemukan
                </CardTitle>
                <CardDescription>
                    Maaf, kami tidak dapat menemukan data santri untuk akun Anda. Silakan hubungi admin Madrasah.
                </CardDescription>
            </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
        {/* Profile Card */}
        <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white/20 shadow-lg">
                    <AvatarImage src={student.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-xl">{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <h2 className="text-lg font-bold truncate leading-tight pr-2 uppercase">{student.name}</h2>
                        <Button 
                            variant="ghost" 
                            size="xs" 
                            className="text-white/80 hover:text-white hover:bg-white/10 h-7 px-2 gap-1 text-[9px] uppercase font-bold border border-white/20"
                            onClick={() => setIsDetailOpen(true)}
                        >
                            <UserCircle className="h-3 w-3" /> Detail Profil
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded uppercase tracking-tighter">NIS: {student.nis.replace('MDIA', '')}</span>
                        <span className="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded uppercase tracking-tighter">KELAS: {student.kelas}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Finance Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
            <Card className="bg-primary border-none shadow-sm text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-4">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-tight opacity-70">Total Tabungan</CardTitle>
                    <PiggyBank className="h-3.5 w-3.5 opacity-40" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="text-lg font-bold">Rp {savingsBalance.toLocaleString()}</div>
                    <p className="text-[8px] opacity-50 mt-0.5 uppercase font-medium">Saldo Tersedia</p>
                </CardContent>
            </Card>
            <Card className="bg-primary border-none shadow-sm text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-4">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-tight opacity-70">SPP Terbayar</CardTitle>
                    <ReceiptText className="h-3.5 w-3.5 opacity-40" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="text-lg font-bold">Rp {sppStats.totalPaid.toLocaleString()}</div>
                    <p className={cn(
                        "text-[8px] font-bold mt-0.5 uppercase",
                        sppStats.unpaidMonths > 0 ? "text-accent" : "text-green-400"
                    )}>
                        {sppStats.unpaidMonths > 0 ? `${sppStats.unpaidMonths} Bulan Tunggakan` : 'Lunas Tahunan'}
                    </p>
                </CardContent>
            </Card>
        </div>

        {/* Today's Attendance */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5" /> Absensi Hari Ini
                </CardTitle>
                <Link href="/parent/attendance">
                    <Button variant="ghost" size="xs" className="h-7 gap-1 text-[10px] font-bold text-primary hover:bg-primary/5 uppercase">
                        Lihat Riwayat <ArrowRightCircle className="h-3 w-3" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    todayAttendance?.status === 'Hadir' ? "bg-green-50/50 border-green-100" : 
                    todayAttendance?.status && todayAttendance?.status !== 'Belum Diabsen' ? "bg-orange-50/50 border-orange-100" : "bg-muted/30 border-muted/50"
                )}>
                    <div className="flex items-center gap-3">
                        {todayAttendance?.status === 'Hadir' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : todayAttendance?.status && todayAttendance?.status !== 'Belum Diabsen' ? (
                            <Info className="h-5 w-5 text-orange-600" />
                        ) : (
                            <Clock className="h-5 w-5 opacity-40" />
                        )}
                        <div>
                            <p className="text-xs font-bold">
                                {todayAttendance?.status || "Belum Absen"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                {format(new Date(), "EEEE, d MMMM yyyy", { locale: dfnsId })}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Jadwal Pelajaran
                </CardTitle>
                <Link href="/parent/schedule">
                    <Button variant="ghost" size="xs" className="h-7 gap-1 text-[10px] font-bold text-primary hover:bg-primary/5 uppercase">
                        Lihat Semua <ArrowRightCircle className="h-3 w-3" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {isScheduleLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin opacity-20" /></div>
                ) : todayScheduleEntries.length > 0 ? (
                    <div className="space-y-3 mt-2">
                        {todayScheduleEntries.map((entry, idx) => (
                            <div key={idx} className="flex items-start gap-3 relative pl-4 border-l-2 border-primary/20 last:border-l-0">
                                <div className="absolute -left-1.5 top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[11px] font-bold text-primary uppercase">{entry.subjectName}</p>
                                        <span className="text-[9px] font-mono text-muted-foreground">{entry.startTime} - {entry.endTime}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic mt-0.5">Oleh: {entry.teacherName || 'Guru Madrasah'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed mt-2">
                        <p className="text-[10px]">Tidak ada jadwal pelajaran untuk hari ini.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
                <div className="flex flex-col bg-card">
                    <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Profil Santri</DialogTitle>
                        </DialogHeader>
                        
                        <div className="relative mb-4">
                            <Avatar className="h-28 w-28 border-4 border-white shadow-xl scale-110">
                                <AvatarImage src={student.avatarUrl} className="object-cover" />
                                <AvatarFallback className="bg-primary/5 text-primary text-3xl font-bold">{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="space-y-1 mt-2">
                            <h3 className="text-lg font-bold leading-tight uppercase text-primary tracking-tight">{student.name}</h3>
                            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground/80 tracking-wide">
                                <Users className="h-3 w-3" />
                                Kelas {student.kelas !== undefined ? student.kelas : '-'}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-4">
                            <span className="text-[10px] font-bold bg-primary text-white px-4 py-1.5 rounded-full uppercase tracking-[0.1em] shadow-md shadow-primary/20">
                                NIS: {student.nis}
                            </span>
                        </div>
                    </div>

                    <div className="px-6 py-2">
                        <ScrollArea className="h-[350px] pr-2">
                            <div className="py-2">
                                <InfoField label="Nomor Induk Kependudukan (NIK)" value={student.nik || ""} icon={Fingerprint} />
                                <InfoField label="Jenis Kelamin" value={student.gender} icon={Baby} />
                                <InfoField label="Tempat, Tanggal Lahir" value={`${student.tempatLahir || '-'}, ${student.dateOfBirth}`} icon={Calendar} />
                                <InfoField label="Nama Ayah" value={student.namaAyah || ""} icon={HeartHandshake} />
                                <InfoField label="Nama Ibu" value={student.namaIbu || ""} icon={HeartHandshake} />
                                <InfoField label="Nomor WhatsApp Wali" value={student.noWa || ""} icon={Phone} />
                                <InfoField label="Alamat Domisili" value={student.address || ""} icon={MapPin} />
                            </div>
                            
                            {qrDataUrl && (
                                <div className="mt-4 mb-6 p-5 rounded-[24px] bg-muted/20 border-2 border-dashed border-muted flex flex-col items-center gap-3">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID Barcode Absensi</p>
                                    <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
                                    <span className="text-[10px] font-mono font-bold text-primary/40 tracking-tighter">{student.nis}</span>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-center">
                        <Button 
                            type="button"
                            variant="secondary"
                            className="rounded-full px-10 h-10 text-[10px] font-bold uppercase tracking-widest bg-white shadow-sm"
                            onClick={() => setIsDetailOpen(false)}
                        >
                            <X className="h-3.5 w-3.5 mr-2" /> Tutup Profil
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>

        {/* Report Link Modal */}
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" /> Akses Rapor Santri
                    </DialogTitle>
                    <DialogDescription>Silakan akses dokumen rapor resmi di bawah ini.</DialogDescription>
                </DialogHeader>
                
                <div className="py-6 space-y-4">
                    {student.reportUrl ? (
                        <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex flex-col items-center text-center gap-3">
                            <div className="p-3 bg-white rounded-full shadow-sm">
                                <FileSearch className="h-8 w-8 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-green-800">Rapor Digital PDF</h4>
                                <p className="text-[10px] text-green-600/80 mt-1">Dokumen rapor resmi yang telah diterbitkan oleh Admin Madrasah.</p>
                            </div>
                            <Button asChild className="w-full bg-green-600 hover:bg-green-700 gap-2 mt-2">
                                <a href={student.reportUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" /> Buka Link Rapor
                                </a>
                            </Button>
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-muted/30 border border-dashed flex flex-col items-center text-center gap-2">
                            <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-xs font-medium text-muted-foreground">Tautan rapor digital PDF belum tersedia dari Admin.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsReportDialogOpen(false)} className="w-full text-xs">Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
