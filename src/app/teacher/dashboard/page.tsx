
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Teacher, TeacherAttendance, Schedule, Announcement, Curriculum } from "@/types";
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
    BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { cn } from "@/lib/utils";

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

export default function TeacherDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [nig, setNig] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState<string>("");

  useEffect(() => {
    setNig(sessionStorage.getItem('teacherNig'));
    setTodayStr(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const teacherRef = useMemoFirebase(() => {
    if (!firestore || !nig) return null;
    return doc(firestore, "teachers", nig);
  }, [firestore, nig]);

  const { data: teacher, loading: isTeacherLoading, error: teacherError } = useDoc<Teacher>(teacherRef);

  // Today's Self Attendance (Teacher Attendance)
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !nig || !todayStr) return null;
    return query(
        collection(firestore, "teacher_attendances"),
        where("teacherId", "==", nig),
        where("date", "==", todayStr)
    );
  }, [firestore, nig, todayStr]);
  const { data: attendanceData, loading: isAttendanceLoading } = useCollection<TeacherAttendance>(attendanceQuery);

  // Today's Teaching Schedule (Inherited logic: fetch all and pick latest if active year is empty)
  const scheduleQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "schedules"), where("type", "==", "pelajaran"));
  }, [firestore]);
  const { data: allSchedules, loading: isScheduleLoading } = useCollection<Schedule>(scheduleQuery);

  const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
  const { data: curriculum } = useCollection<Curriculum>(curriculumQuery);

  // Announcements for Teachers
  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "announcements"), orderBy("createdAt", "desc"), limit(5));
  }, [firestore]);
  const { data: announcements, loading: isAnnouncementsLoading } = useCollection<Announcement>(announcementsQuery);

  const todayAttendance = attendanceData?.[0];

  const teachingScheduleToday = useMemo(() => {
    if (!allSchedules || !nig || !curriculum) return [];
    
    const dayIndex = new Date().getDay();
    const dayKey = dayMapping[dayIndex];
    if (!dayKey) return [];

    // Find all academic years available and pick latest
    const availableYears = Array.from(new Set(allSchedules.map(s => s.academicYear))).sort((a,b) => b.localeCompare(a));
    const latestYear = availableYears[0];
    
    if (!latestYear) return [];

    const myEntries: any[] = [];
    allSchedules.forEach(schedule => {
        // We filter for the latest year data ONLY here to provide a stable schedule
        if (schedule.academicYear !== latestYear) return;

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
                    <AlertTriangle className="h-5 w-5" />
                    Data Tidak Ditemukan
                </CardTitle>
                <CardDescription>
                    Maaf, data profil guru Anda tidak ditemukan. Silakan hubungi Administrator Madrasah.
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
                    <AvatarImage src={teacher.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-xl">{teacher.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold truncate leading-tight">{teacher.name}</h2>
                    <p className="text-xs opacity-90 font-medium">{teacher.jabatan || 'Guru Madrasah'}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-tighter">NIG: {teacher.nig}</span>
                        <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-tighter">{teacher.email || 'Tanpa Email'}</span>
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
                <span className="text-[10px] font-bold uppercase tracking-tight">Absen Siswa</span>
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
                    <Calendar className="h-3.5 w-3.5" /> Absensi Saya Hari Ini
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
                                {todayAttendance?.status || "Belum Diverifikasi Admin"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                {format(new Date(), "EEEE, d MMMM yyyy", { locale: dfnsId })}
                            </p>
                        </div>
                    </div>
                    {todayAttendance?.status && (
                        <span className="text-[9px] font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">Tercatat</span>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Teaching Schedule Today */}
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Jadwal Mengajar Hari Ini
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
                        <p className="text-[10px]">Tidak ada jadwal mengajar untuk Anda hari ini.</p>
                    </div>
                )}
            </CardContent>
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
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.title} 
                                        className="w-full h-auto max-h-[300px] object-contain"
                                    />
                                </div>
                            )}
                            <div className="flex justify-between items-start gap-2">
                                <h4 className="text-[11px] font-bold leading-tight line-clamp-1">{item.title}</h4>
                                <span className="text-[8px] whitespace-nowrap text-muted-foreground font-mono">
                                    {format(parseISO(item.createdAt), "dd MMM", { locale: dfnsId })}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                                {item.content}
                            </p>
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
    </div>
  );
}
