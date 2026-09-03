
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Teacher, TeacherAttendance, Schedule, Announcement, Curriculum, Student, StudentAttendance } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Loader2, 
    AlertTriangle, 
    ClipboardCheck, 
    UserCheck, 
    PiggyBank, 
    Calendar, 
    Clock, 
    Megaphone,
    ArrowRight,
    CheckCircle2,
    Info,
    UserCircle,
    BookOpen,
    QrCode,
    X,
    Users,
    Save
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import QRCode from 'qrcode';
import { saveStudentAttendanceBatch } from "@/lib/firebase-helpers";
import { useToast } from "@/hooks/use-toast";
import { useAcademicYear } from "@/context/academic-year-provider";

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

const STATUS_OPTIONS = ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Diabsen'];

export default function TeacherDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { activeYear } = useAcademicYear();
  const { toast } = useToast();

  const [nig, setNig] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState<string>("");
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  
  // Student Attendance States
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  useEffect(() => {
    const storedNig = sessionStorage.getItem('teacherNig');
    setNig(storedNig);
    setTodayStr(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const teacherRef = useMemoFirebase(() => {
    if (!firestore || !nig) return null;
    return doc(firestore, "teachers", nig);
  }, [firestore, nig]);

  const { data: teacher, loading: isTeacherLoading, error: teacherError } = useDoc<Teacher>(teacherRef);

  // Generate QR Code
  useEffect(() => {
      if (teacher?.nig) {
          QRCode.toDataURL(teacher.nig, {
              width: 512,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' }
          }).then(setQrDataUrl).catch(err => console.error(err));
      }
  }, [teacher]);

  // Today's Self Attendance
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !nig || !todayStr) return null;
    return query(
        collection(firestore, "teacher_attendances"),
        where("teacherId", "==", nig),
        where("date", "==", todayStr)
    );
  }, [firestore, nig, todayStr]);
  const { data: selfAttendanceData } = useCollection<TeacherAttendance>(attendanceQuery);

  // Today's Schedules
  const scheduleQuery = useMemoFirebase(() => {
    if (!firestore || !activeYear) return null;
    return query(collection(firestore, "schedules"), where("academicYear", "==", activeYear), where("type", "==", "pelajaran"));
  }, [firestore, activeYear]);
  const { data: allSchedules, loading: isScheduleLoading } = useCollection<Schedule>(scheduleQuery);

  const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
  const { data: curriculum } = useCollection<Curriculum>(curriculumQuery);

  // Announcements
  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "announcements"), orderBy("createdAt", "desc"), limit(5));
  }, [firestore]);
  const { data: announcements, loading: isAnnouncementsLoading } = useCollection<Announcement>(announcementsQuery);

  // Logic for Student Attendance Classes (First Hour ONLY)
  const assignedAttendanceClasses = useMemo(() => {
    const classes = new Set<number>();
    if (allSchedules && nig) {
        const dayIndex = new Date().getDay();
        const dayKey = dayMapping[dayIndex];
        if (dayKey) {
            allSchedules.forEach(s => {
                const entries = s[dayKey] || [];
                if (entries[0]?.teacherId === nig) {
                    classes.add(s.classLevel);
                }
            });
        }
    }
    return Array.from(classes).sort((a, b) => a - b);
  }, [allSchedules, nig]);

  useEffect(() => {
    if (assignedAttendanceClasses.length > 0 && !selectedClass) {
        setSelectedClass(String(assignedAttendanceClasses[0]));
    }
  }, [assignedAttendanceClasses, selectedClass]);

  // Fetch Students for selected class
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClass) return null;
    return query(collection(firestore, 'students'), where('kelas', '==', Number(selectedClass)));
  }, [firestore, selectedClass]);
  const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);

  // Fetch current student attendance
  const studentAttendanceQuery = useMemoFirebase(() => {
    if (!firestore || !todayStr || !selectedClass) return null;
    return query(
        collection(firestore, 'student_attendances'),
        where('date', '==', todayStr),
        where('kelas', '==', Number(selectedClass))
    );
  }, [firestore, todayStr, selectedClass]);
  const { data: currentStudentAttendance, loading: loadingStudentAttendance } = useCollection<StudentAttendance>(studentAttendanceQuery);

  useEffect(() => {
    if (students) {
        const initial: Record<string, string> = {};
        students.forEach(s => initial[s.id] = 'Belum Diabsen');
        if (currentStudentAttendance) {
            currentStudentAttendance.forEach(a => initial[a.studentId] = a.status);
        }
        setAttendance(initial);
    }
  }, [students, currentStudentAttendance]);

  const teachingScheduleToday = useMemo(() => {
    if (!allSchedules || !nig || !curriculum) return [];
    const dayIndex = new Date().getDay();
    const dayKey = dayMapping[dayIndex];
    if (!dayKey) return [];

    const myEntries: any[] = [];
    allSchedules.forEach(schedule => {
        const entries = schedule[dayKey] || [];
        entries.forEach(entry => {
            if (entry.teacherId === nig) {
                const subject = curriculum.find(c => c.id === entry.subjectId);
                myEntries.push({
                    ...entry,
                    classLevel: schedule.classLevel,
                    subjectName: subject?.subjectName || 'Mata Pelajaran'
                });
            }
        });
    });
    return myEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [allSchedules, nig, curriculum]);

  const handleSaveStudentAttendance = async () => {
    if (!firestore || !students?.length || !selectedClass || !todayStr) return;
    setIsSavingAttendance(true);
    const payload = students.map(s => ({
        studentId: s.id,
        studentName: s.name,
        nis: s.nis,
        kelas: Number(selectedClass),
        date: todayStr,
        status: (attendance[s.id] || 'Belum Diabsen') as any
    }));
    try {
        await saveStudentAttendanceBatch(firestore, payload);
        toast({ title: "Absensi Disimpan", description: `Data kehadiran Kelas ${selectedClass} berhasil diperbarui.` });
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal Menyimpan" });
    } finally {
        setIsSavingAttendance(false);
    }
  };

  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return announcements.filter(a => a.target === 'Semua' || a.target === 'Guru');
  }, [announcements]);

  const isLoading = isUserLoading || isTeacherLoading || !nig;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (teacherError || !teacher) {
    return (
      <div className="p-4">
        <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" /> Data Tidak Ditemukan
                </CardTitle>
                <CardDescription>Maaf, data profil guru Anda tidak ditemukan.</CardDescription>
            </CardHeader>
        </Card>
      </div>
    );
  }

  const isFriday = new Date().getDay() === 5;

  return (
    <div className="space-y-4 pb-10">
        {/* Profile Card */}
        <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white/20 shadow-lg">
                    <AvatarImage src={teacher.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-xl">{teacher.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-bold truncate leading-tight">{teacher.name}</h2>
                            <p className="text-xs opacity-90 font-medium">{teacher.jabatan || 'Guru Madrasah'}</p>
                        </div>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 gap-2 bg-white text-primary hover:bg-white/90"
                            onClick={() => setIsQrOpen(true)}
                        >
                            <QrCode className="h-4 w-4" /> Absen
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-tighter">NIG: {teacher.nig}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
            <Link href="/teacher/grades" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border shadow-sm hover:border-primary/50 transition-all text-center group">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                    <ClipboardCheck className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Nilai</span>
            </Link>
            <Link href="/teacher/student-attendance" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border shadow-sm hover:border-primary/50 transition-all text-center group">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:scale-110 transition-transform">
                    <UserCheck className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Laporan</span>
            </Link>
            <Link href="/teacher/tabungan" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border shadow-sm hover:border-primary/50 transition-all text-center group">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                    <PiggyBank className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Tabungan</span>
            </Link>
        </div>

        {/* Self Attendance Status */}
        <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> Kehadiran Saya
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    selfAttendanceData?.[0]?.status === 'Hadir' ? "bg-green-50/50 border-green-100" : 
                    selfAttendanceData?.[0]?.status ? "bg-orange-50/50 border-orange-100" : "bg-muted/30 border-muted/50"
                )}>
                    <div className="flex items-center gap-3">
                        {selfAttendanceData?.[0]?.status === 'Hadir' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : selfAttendanceData?.[0]?.status ? (
                            <Info className="h-5 w-5 text-orange-600" />
                        ) : (
                            <Clock className="h-5 w-5 text-muted-foreground/50" />
                        )}
                        <div>
                            <p className="text-xs font-bold">{selfAttendanceData?.[0]?.status || "Belum Absen"}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(), "EEEE, d MMMM yyyy", { locale: dfnsId })}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Teaching Schedule Today */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Jadwal Mengajar
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {isScheduleLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin opacity-20" /></div>
                ) : teachingScheduleToday.length > 0 ? (
                    <div className="space-y-3 mt-2">
                        {teachingScheduleToday.map((entry, idx) => (
                            <div key={idx} className="flex items-start gap-3 relative pl-4 border-l-2 border-primary/20 last:border-l-0">
                                <div className="absolute -left-1.5 top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[11px] font-bold text-primary uppercase">{entry.subjectName}</p>
                                        <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{entry.startTime} - {entry.endTime}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Kelas {entry.classLevel}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed mt-2">
                        <p className="text-[10px]">Tidak ada jadwal mengajar hari ini.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Student Attendance Section (New) */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5" /> Absensi Santri (Jam Ke-1)
                    </CardTitle>
                    <CardDescription className="text-[9px]">Input kehadiran santri oleh pengajar jam pertama.</CardDescription>
                </div>
                {assignedAttendanceClasses.length > 0 && (
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="h-7 w-[90px] text-[10px] font-bold uppercase">
                            <SelectValue placeholder="Kelas" />
                        </SelectTrigger>
                        <SelectContent>
                            {assignedAttendanceClasses.map(cl => <SelectItem key={cl} value={String(cl)} className="text-[10px]">Kelas {cl}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            </CardHeader>
            <CardContent className="p-0">
                {isFriday ? (
                    <div className="py-10 text-center text-blue-600 bg-blue-50/50 flex flex-col items-center gap-2">
                        <Coffee className="h-6 w-6 opacity-30" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">Libur Jum'at</p>
                    </div>
                ) : assignedAttendanceClasses.length === 0 && !isScheduleLoading ? (
                    <div className="py-10 text-center text-muted-foreground/60 flex flex-col items-center gap-2 px-6">
                        <Info className="h-6 w-6 opacity-20" />
                        <p className="text-[10px] font-medium leading-relaxed italic">Anda tidak memiliki jadwal mengajar di jam pertama hari ini.</p>
                    </div>
                ) : students && students.length > 0 ? (
                    <div className="divide-y max-h-[300px] overflow-y-auto">
                        <Table>
                            <TableBody>
                                {students.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                                    <TableRow key={s.id} className="h-12 hover:bg-muted/10">
                                        <TableCell className="py-2 pl-4">
                                            <p className="text-[11px] font-bold uppercase truncate max-w-[140px]">{s.name}</p>
                                        </TableCell>
                                        <TableCell className="py-2 pr-4 text-right">
                                            <Select value={attendance[s.id]} onValueChange={(v) => setAttendance(prev => ({...prev, [s.id]: v}))}>
                                                <SelectTrigger className={cn(
                                                    "h-7 w-28 text-[9px] font-bold uppercase",
                                                    attendance[s.id] === 'Hadir' ? "text-green-600" : 
                                                    attendance[s.id] === 'Alpa' ? "text-red-600" : "text-muted-foreground"
                                                )}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {STATUS_OPTIONS.map(opt => <SelectItem key={opt} value={opt} className="text-[10px]">{opt}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-10 text-center flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary/30" /></div>
                )}
            </CardContent>
            {assignedAttendanceClasses.length > 0 && !isFriday && (
                <CardFooter className="p-3 border-t bg-muted/5">
                    <Button 
                        size="sm" 
                        className="w-full h-9 gap-2 font-bold uppercase text-[10px]" 
                        onClick={handleSaveStudentAttendance}
                        disabled={isSavingAttendance}
                    >
                        {isSavingAttendance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Simpan Absensi Kelas {selectedClass}
                    </Button>
                </CardFooter>
            )}
        </Card>

        {/* Announcements */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Megaphone className="h-3.5 w-3.5" /> Info & Pengumuman
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
                {isAnnouncementsLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin opacity-20" /></div>
                ) : filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((item) => (
                        <div key={item.id} className="group p-3 rounded-lg bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
                            {item.imageUrl && (
                                <div className="mb-2 rounded-md overflow-hidden bg-muted/50 border">
                                    <img src={item.imageUrl} alt={item.title} className="w-full h-auto max-h-[300px] object-contain" />
                                </div>
                            )}
                            <div className="flex justify-between items-start gap-2">
                                <h4 className="text-[11px] font-bold leading-tight line-clamp-1">{item.title}</h4>
                                <span className="text-[8px] whitespace-nowrap text-muted-foreground font-mono">{format(parseISO(item.createdAt), "dd MMM")}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{item.content}</p>
                            {item.linkUrl && (
                                <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-primary font-bold mt-2 hover:underline">
                                    Lihat Selengkapnya <ArrowRight className="h-2.5 w-2.5" />
                                </a>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="py-4 text-center text-[10px] text-muted-foreground italic">Belum ada pengumuman terbaru.</p>
                )}
            </CardContent>
        </Card>

        {/* QR CODE DIALOG */}
        <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
            <DialogContent className="sm:max-w-xs p-6">
                <DialogHeader>
                    <DialogTitle className="text-center font-headline text-primary">Absen Sekarang</DialogTitle>
                    <DialogDescription className="text-center text-[10px]">Tunjukkan QR Code ini kepada petugas absen.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center gap-4 py-4">
                    <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-primary/10">
                        {qrDataUrl ? <img src={qrDataUrl} alt="My QR Code" className="w-48 h-48" /> : <div className="w-48 h-48 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/20" /></div>}
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-primary uppercase tracking-wider">{teacher.name}</p>
                        <p className="text-[10px] font-mono font-bold text-muted-foreground mt-1">NIG: {teacher.nig}</p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => setIsQrOpen(false)} className="w-full h-10 gap-2 border-primary/20"><X className="h-4 w-4" /> Tutup</Button>
            </DialogContent>
        </Dialog>
    </div>
  );
}
