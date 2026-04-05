
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Student, StudentAttendance, Schedule, Announcement, Curriculum, Teacher } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Loader2, 
    AlertTriangle, 
    Wallet, 
    FileText, 
    CalendarDays, 
    UserCheck, 
    Clock, 
    Megaphone,
    ArrowRight,
    CheckCircle2,
    XCircle,
    Info
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { useAcademicYear } from "@/context/academic-year-provider";
import { cn } from "@/lib/utils";

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

const dayNames: { [key: string]: string } = {
    sunday: 'Minggu',
    monday: 'Senin',
    tuesday: 'Selasa',
    wednesday: 'Rabu',
    thursday: 'Kamis',
    saturday: 'Sabtu',
    friday: 'Jumat'
};

export default function ParentDashboardPage() {
  const [nis, setNis] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState<string>("");
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

  // Fetch Today's Attendance
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
    if (!firestore || student?.kelas === undefined || !activeYear) return null;
    return query(
        collection(firestore, "schedules"),
        where("classLevel", "==", student.kelas),
        where("academicYear", "==", activeYear),
        where("type", "==", "pelajaran")
    );
  }, [firestore, student?.kelas, activeYear]);
  const { data: scheduleData, loading: isScheduleLoading } = useCollection<Schedule>(scheduleQuery);

  // Fetch Data for Schedule Mapping (Curriculum & Teachers)
  const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
  const { data: curriculum } = useCollection<Curriculum>(curriculumQuery);

  const teachersQuery = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
  const { data: teachers } = useCollection<Teacher>(teachersQuery);

  // Fetch Announcements
  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "announcements"), orderBy("createdAt", "desc"), limit(5));
  }, [firestore]);
  const { data: announcements, loading: isAnnouncementsLoading } = useCollection<Announcement>(announcementsQuery);

  const todayAttendance = attendanceData?.[0];
  
  const todayScheduleEntries = useMemo(() => {
    if (!scheduleData?.[0] || !curriculum || !teachers) return [];
    const dayIndex = new Date().getDay();
    const dayKey = dayMapping[dayIndex];
    if (!dayKey) return [];

    const entries = scheduleData[0][dayKey] || [];
    return entries.map(entry => {
        const subject = curriculum.find(c => c.id === entry.subjectId);
        const teacher = teachers.find(t => t.id === entry.teacherId);
        return { ...entry, subjectName: subject?.subjectName, teacherName: teacher?.name };
    }).filter(e => e.subjectName);
  }, [scheduleData, curriculum, teachers]);

  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return announcements.filter(a => a.target === 'Semua' || a.target === 'Wali Murid');
  }, [announcements]);

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
                    <h2 className="text-lg font-bold truncate">{student.name}</h2>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded">NIS: {student.nis}</span>
                        <span className="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded">KELAS: {student.kelas}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
            <Link href="/parent/finance" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border shadow-sm hover:border-primary/50 transition-all">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Wallet className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Keuangan</span>
            </Link>
            <Link href="/parent/reports" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border shadow-sm hover:border-primary/50 transition-all">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <FileText className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Rapor</span>
            </Link>
            <Link href="/parent/schedule" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border shadow-sm hover:border-primary/50 transition-all">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <CalendarDays className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Jadwal</span>
            </Link>
        </div>

        {/* Today's Attendance */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5" /> Absensi Hari Ini
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    todayAttendance?.status === 'Hadir' ? "bg-green-50/50 border-green-100" : 
                    todayAttendance?.status ? "bg-orange-50/50 border-orange-100" : "bg-muted/30 border-muted/50"
                )}>
                    <div className="flex items-center gap-3">
                        {todayAttendance?.status === 'Hadir' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : todayAttendance?.status ? (
                            <Info className="h-5 w-5 text-orange-600" />
                        ) : (
                            <Clock className="h-5 w-5 text-muted-foreground/50" />
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
                    {todayAttendance?.status === 'Hadir' && (
                        <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded uppercase">Tercatat</span>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Jadwal Pelajaran
                </CardTitle>
                <Link href="/parent/schedule" className="text-[10px] text-primary font-bold hover:underline">Lihat Semua</Link>
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

        {/* Announcements */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Megaphone className="h-3.5 w-3.5" /> Informasi & Pengumuman
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
                {isAnnouncementsLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin opacity-20" /></div>
                ) : filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((item) => (
                        <div key={item.id} className="group p-3 rounded-lg bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
                            <div className="flex justify-between items-start gap-2">
                                <h4 className="text-[11px] font-bold leading-tight line-clamp-1">{item.title}</h4>
                                <span className="text-[8px] whitespace-nowrap text-muted-foreground font-mono">
                                    {format(parseISO(item.createdAt), "dd MMM")}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                                {item.content}
                            </p>
                            {item.linkUrl && (
                                <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-primary font-bold mt-2 hover:underline">
                                    Info Lanjut <ArrowRight className="h-2.5 w-2.5" />
                                </a>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="py-4 text-center text-[10px] text-muted-foreground italic">Belum ada pengumuman terbaru.</p>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
