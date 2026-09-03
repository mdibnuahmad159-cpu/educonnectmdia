"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, orderBy } from "firebase/firestore";
import type { Teacher, TeacherAttendance, Schedule, Curriculum, Student, StudentAttendance } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Loader2, 
    AlertTriangle, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    Info,
    UserCircle,
    BookOpen,
    X,
    Users,
    Save,
    UserCheck,
    Coffee,
    Fingerprint,
    Mail,
    Phone,
    MapPin,
    GraduationCap,
    ArrowRightCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { ScrollArea } from "@/components/ui/scroll-area";

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

const STATUS_OPTIONS = ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Diabsen'];

function InfoField({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
    return (
        <div className="flex items-center gap-3 py-2 border-b border-muted/60 last:border-0">
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

export default function TeacherDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { activeYear } = useAcademicYear();
  const { toast } = useToast();

  const [nig, setNig] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState<string>("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  
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

  useEffect(() => {
      if (teacher?.nig) {
          QRCode.toDataURL(teacher.nig, {
              width: 512,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' }
          }).then(setQrDataUrl).catch(err => console.error(err));
      }
  }, [teacher]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !nig || !todayStr) return null;
    return query(
        collection(firestore, "teacher_attendances"),
        where("teacherId", "==", nig),
        where("date", "==", todayStr)
    );
  }, [firestore, nig, todayStr]);
  const { data: selfAttendanceData } = useCollection<TeacherAttendance>(attendanceQuery);

  const scheduleQuery = useMemoFirebase(() => {
    if (!firestore || !activeYear) return null;
    return query(collection(firestore, "schedules"), where("academicYear", "==", activeYear), where("type", "==", "pelajaran"));
  }, [firestore, activeYear]);
  const { data: allSchedules, loading: isScheduleLoading } = useCollection<Schedule>(scheduleQuery);

  const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
  const { data: curriculum } = useCollection<Curriculum>(curriculumQuery);

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

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClass) return null;
    return query(collection(firestore, 'students'), where('kelas', '==', Number(selectedClass)));
  }, [firestore, selectedClass]);
  const { data: students } = useCollection<Student>(studentsQuery);

  const studentAttendanceQuery = useMemoFirebase(() => {
    if (!firestore || !todayStr || !selectedClass) return null;
    return query(
        collection(firestore, 'student_attendances'),
        where('date', '==', todayStr),
        where('kelas', '==', Number(selectedClass))
    );
  }, [firestore, todayStr, selectedClass]);
  const { data: currentStudentAttendance } = useCollection<StudentAttendance>(studentAttendanceQuery);

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
                    subjectName: subject?.subjectName || 'Mapel'
                });
            }
        });
    });
    return myEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [allSchedules, nig, curriculum]);

  const isFriday = new Date().getDay() === 5;
  const isScheduledToday = teachingScheduleToday.length > 0;
  const currentSelfStatus = selfAttendanceData?.[0]?.status;

  const displayStatus = useMemo(() => {
      if (currentSelfStatus) return currentSelfStatus;
      if (isFriday) return "Libur Jum'at";
      if (!isScheduledToday) return "Tidak Ada Jadwal";
      return "Belum Diabsen";
  }, [currentSelfStatus, isFriday, isScheduledToday]);

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
        toast({ title: "Berhasil", description: `Absensi Kelas ${selectedClass} disimpan.` });
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal" });
    } finally {
        setIsSavingAttendance(false);
    }
  };

  if (isUserLoading || isTeacherLoading || !nig) {
    return <div className="flex h-[60vh] w-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3 pb-8">
        {/* Profile Card (Compact) */}
        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-white/20">
                    <AvatarImage src={teacher.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-lg">{teacher.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <div className="min-w-0 pr-1">
                            <h2 className="text-sm font-bold truncate leading-tight uppercase">{teacher.name}</h2>
                            <p className="text-[10px] opacity-70 truncate">{teacher.jabatan || 'Guru'}</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="xs" 
                            className="text-white/80 h-6 px-1.5 gap-1 text-[8px] uppercase font-bold border border-white/20"
                            onClick={() => setIsProfileOpen(true)}
                        >
                            Detail
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Self Status & Schedule (Row) */}
        <div className="grid grid-cols-1 gap-3">
            <Card className="border-none shadow-sm">
                <CardHeader className="p-3 pb-1.5 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Kehadiran
                    </CardTitle>
                    <Link href="/teacher/attendance-history">
                        <Button variant="ghost" size="xs" className="h-5 px-1 text-[8px] font-bold text-primary uppercase">Riwayat</Button>
                    </Link>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                    <div className={cn(
                        "flex items-center justify-between p-2 rounded-lg border",
                        displayStatus === 'Hadir' ? "bg-green-50/50 border-green-100" : "bg-muted/30 border-muted/50"
                    )}>
                        <div className="flex items-center gap-2">
                            {displayStatus === 'Hadir' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 opacity-40" />}
                            <div>
                                <p className="text-[11px] font-bold">{displayStatus}</p>
                                <p className="text-[9px] opacity-60">{format(new Date(), "d MMM yyyy", { locale: dfnsId })}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
                <CardHeader className="p-3 pb-1.5 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Jadwal
                    </CardTitle>
                    <Link href="/teacher/schedule">
                        <Button variant="ghost" size="xs" className="h-5 px-1 text-[8px] font-bold text-primary uppercase">Semua</Button>
                    </Link>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                    {teachingScheduleToday.length > 0 ? (
                        <div className="space-y-2">
                            {teachingScheduleToday.map((entry, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px] bg-muted/20 p-2 rounded-md">
                                    <div className="font-bold text-primary truncate max-w-[120px] uppercase">{entry.subjectName}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary/10 text-primary px-1.5 rounded-sm font-bold">Kls {entry.classLevel}</span>
                                        <span className="font-mono text-muted-foreground">{entry.startTime}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-[10px] text-muted-foreground italic text-center py-2">Tidak ada jadwal hari ini.</p>}
                </CardContent>
            </Card>
        </div>

        {/* Student Attendance (Compact) */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-3 pb-1.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3 w-3" /> Absensi Santri (Jam 1)
                </CardTitle>
                {assignedAttendanceClasses.length > 0 && (
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="h-6 w-20 text-[9px] font-bold uppercase">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {assignedAttendanceClasses.map(cl => <SelectItem key={cl} value={String(cl)} className="text-[10px]">Kelas {cl}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            </CardHeader>
            <CardContent className="p-0">
                {students && students.length > 0 && !isFriday ? (
                    <div className="divide-y max-h-[200px] overflow-y-auto">
                        {students.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                            <div key={s.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/10">
                                <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{s.name}</span>
                                <Select value={attendance[s.id]} onValueChange={(v) => setAttendance(prev => ({...prev, [s.id]: v}))}>
                                    <SelectTrigger className={cn(
                                        "h-6 w-24 text-[8px] font-bold uppercase",
                                        attendance[s.id] === 'Hadir' ? "text-green-600" : attendance[s.id] === 'Alpa' ? "text-red-600" : ""
                                    )}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map(opt => <SelectItem key={opt} value={opt} className="text-[10px]">{opt}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                ) : <div className="py-10 text-center text-[10px] text-muted-foreground italic px-4">Bukan jam pertama atau hari libur.</div>}
            </CardContent>
            {assignedAttendanceClasses.length > 0 && !isFriday && (
                <CardFooter className="p-2 border-t">
                    <Button size="sm" className="w-full h-8 text-[9px] font-bold uppercase" onClick={handleSaveStudentAttendance} disabled={isSavingAttendance}>
                        {isSavingAttendance ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1.5" />} Simpan
                    </Button>
                </CardFooter>
            )}
        </Card>

        {/* Profile Dialog (Compact) */}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogContent className="sm:max-w-xs p-0 overflow-hidden rounded-[24px]">
                <div className="bg-primary/5 p-4 flex flex-col items-center text-center">
                    <Avatar className="h-16 w-16 border-2 border-white mb-2">
                        <AvatarImage src={teacher.avatarUrl} className="object-cover" />
                        <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-sm font-bold uppercase text-primary leading-tight">{teacher.name}</h3>
                    <p className="text-[10px] opacity-60">NIG: {teacher.nig}</p>
                </div>
                <ScrollArea className="h-[250px] px-4">
                    <div className="py-2">
                        <InfoField label="NIK" value={teacher.nik || ""} icon={Fingerprint} />
                        <InfoField label="WhatsApp" value={teacher.noWa || ""} icon={Phone} />
                        <InfoField label="Alamat" value={teacher.alamat || ""} icon={MapPin} />
                    </div>
                    {qrDataUrl && <div className="p-3 bg-muted/20 rounded-xl flex flex-col items-center gap-1 my-3">
                        <img src={qrDataUrl} alt="QR" className="w-24 h-24" />
                        <span className="text-[8px] font-mono opacity-40">{teacher.nig}</span>
                    </div>}
                </ScrollArea>
                <div className="p-3 border-t bg-muted/30">
                    <Button variant="outline" className="w-full h-8 text-[10px] uppercase font-bold" onClick={() => setIsProfileOpen(false)}>Tutup</Button>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
