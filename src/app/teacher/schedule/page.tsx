"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Teacher, Schedule, Curriculum, ScheduleEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    ArrowLeft, 
    CalendarDays, 
    Clock, 
    BookOpen,
    Users,
    Bookmark
} from "lucide-react";
import Link from "next/link";
import { useAcademicYear } from "@/context/academic-year-provider";
import { cn } from "@/lib/utils";

const days = [
    { key: 'monday', name: 'Senin' },
    { key: 'tuesday', name: 'Selasa' },
    { key: 'wednesday', name: 'Rabu' },
    { key: 'thursday', name: 'Kamis' },
    { key: 'saturday', name: 'Sabtu' },
    { key: 'sunday', name: 'Minggu' },
] as const;

export default function TeacherSchedulePage() {
    const [nig, setNig] = useState<string | null>(null);
    const firestore = useFirestore();
    const { activeYear } = useAcademicYear();

    useEffect(() => {
        setNig(sessionStorage.getItem('teacherNig'));
    }, []);

    // 1. Fetch Teacher Info
    const teacherRef = useMemoFirebase(() => {
        if (!firestore || !nig) return null;
        return doc(firestore, "teachers", nig);
    }, [firestore, nig]);
    const { data: teacher, loading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

    // 2. Fetch All Schedules for Active Year
    const scheduleQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(
            collection(firestore, "schedules"), 
            where("academicYear", "==", activeYear),
            where("type", "==", "pelajaran")
        );
    }, [firestore, activeYear]);
    const { data: allSchedules, loading: isScheduleLoading } = useCollection<Schedule>(scheduleQuery);

    // 3. Fetch Curriculum for Details
    const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculum } = useCollection<Curriculum>(curriculumQuery);

    // 4. Process and Group Schedule for THIS Teacher
    const myWeeklySchedule = useMemo(() => {
        if (!allSchedules || !nig || !curriculum) return new Map<string, any[]>();
        
        const dayGroups = new Map<string, any[]>();
        
        days.forEach(day => {
            const dayEntries: any[] = [];
            
            allSchedules.forEach(classSchedule => {
                const entries = classSchedule[day.key] || [];
                entries.forEach((entry: ScheduleEntry) => {
                    if (entry.teacherId === nig) {
                        const subject = curriculum.find(c => c.id === entry.subjectId);
                        dayEntries.push({
                            ...entry,
                            classLevel: classSchedule.classLevel,
                            subjectName: subject?.subjectName || 'Mata Pelajaran',
                            bookName: subject?.bookName || '-'
                        });
                    }
                });
            });
            
            if (dayEntries.length > 0) {
                // Sort by start time
                dayGroups.set(day.key, dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime)));
            }
        });
        
        return dayGroups;
    }, [allSchedules, nig, curriculum]);

    const isLoading = isTeacherLoading || isScheduleLoading || !nig;

    if (isLoading) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const hasSchedule = myWeeklySchedule.size > 0;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Card className="border-none shadow-sm bg-primary/5 rounded-[28px]">
                <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                        <CalendarDays className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Tahun Ajaran {activeYear}</p>
                        <h2 className="text-sm font-bold text-foreground/80 uppercase">Agenda Mengajar Mingguan</h2>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-8 pb-10">
                {days.map(day => {
                    const dayEntries = myWeeklySchedule.get(day.key);
                    if (!dayEntries) return null;

                    return (
                        <div key={day.key} className="space-y-4">
                            <div className="flex items-center gap-3 px-1">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-foreground/70">{day.name}</h3>
                                <div className="flex-1 h-px bg-muted" />
                            </div>

                            <div className="grid gap-3">
                                {dayEntries.map((entry, idx) => (
                                    <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden group">
                                        <CardContent className="p-0 flex items-stretch">
                                            <div className="w-1.5 bg-primary/20 group-hover:bg-primary transition-colors" />
                                            <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">Kelas {entry.classLevel}</span>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono font-bold">
                                                            <Clock className="h-3 w-3" />
                                                            {entry.startTime} - {entry.endTime}
                                                        </div>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-primary uppercase leading-tight">{entry.subjectName}</h4>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 bg-muted/30 w-fit px-2 py-1 rounded-lg">
                                                        <Bookmark className="h-3 w-3" />
                                                        <span className="font-medium italic">Kitab: {entry.bookName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!hasSchedule && (
                <div className="py-24 text-center space-y-3 opacity-30">
                    <CalendarDays className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm font-medium italic">Anda belum memiliki jadwal mengajar terdaftar pada sistem untuk tahun ini.</p>
                </div>
            )}

            <div className="fixed bottom-20 left-0 right-0 px-6 pointer-events-none">
                <div className="max-w-md mx-auto flex justify-center">
                    <div className="bg-primary text-white text-[9px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 pointer-events-auto border border-white/10 backdrop-blur-md">
                        <BookOpen className="h-3 w-3" />
                        Kurikulum Resmi Madrasah
                    </div>
                </div>
            </div>
        </div>
    );
}
