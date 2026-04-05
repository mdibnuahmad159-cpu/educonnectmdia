
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Student, Schedule, Curriculum, Teacher } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    ArrowLeft, 
    CalendarDays, 
    Clock, 
    User,
    BookOpen
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

export default function ParentSchedulePage() {
    const [nis, setNis] = useState<string | null>(null);
    const firestore = useFirestore();
    const { activeYear } = useAcademicYear();

    useEffect(() => {
        setNis(sessionStorage.getItem('studentNis'));
    }, []);

    const studentRef = useMemoFirebase(() => nis && firestore ? doc(firestore, "students", nis) : null, [firestore, nis]);
    const { data: student } = useDoc<Student>(studentRef);

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

    const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculum } = useCollection<Curriculum>(curriculumQuery);

    const teachersQuery = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
    const { data: teachers } = useCollection<Teacher>(teachersQuery);

    const schedule = scheduleData?.[0];

    const getDaySchedule = (dayKey: typeof days[number]['key']) => {
        if (!schedule || !curriculum || !teachers) return [];
        const entries = schedule[dayKey] || [];
        return entries.map(entry => {
            const subject = curriculum.find(c => c.id === entry.subjectId);
            const teacher = teachers.find(t => t.id === entry.teacherId);
            return { ...entry, subjectName: subject?.subjectName, teacherName: teacher?.name };
        }).filter(e => e.subjectName);
    };

    if (!nis || isScheduleLoading) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/parent/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-headline font-bold text-primary">Jadwal Pelajaran</h1>
            </div>

            <Card className="border-none shadow-sm bg-muted/30">
                <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg"><CalendarDays className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Tahun Ajaran Aktif</p>
                        <p className="text-sm font-bold text-primary">{activeYear}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {days.map(day => {
                    const entries = getDaySchedule(day.key);
                    if (entries.length === 0) return null;

                    return (
                        <div key={day.key} className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1 flex items-center gap-2">
                                <BookOpen className="h-3 w-3" /> {day.name}
                            </h3>
                            <div className="grid gap-2">
                                {entries.map((entry, idx) => (
                                    <Card key={idx} className="border-none shadow-sm overflow-hidden">
                                        <CardContent className="p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-xs">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-primary uppercase">{entry.subjectName}</p>
                                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
                                                        <User className="h-2.5 w-2.5" />
                                                        <span>{entry.teacherName || 'Guru Madrasah'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1 justify-end text-[9px] font-mono font-bold text-muted-foreground">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    <span>{entry.startTime}</span>
                                                </div>
                                                <p className="text-[8px] text-muted-foreground opacity-50">s/d {entry.endTime}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!schedule && !isScheduleLoading && (
                <div className="py-20 text-center text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-10" />
                    <p className="text-xs italic">Data jadwal belum tersedia untuk tahun ajaran ini.</p>
                </div>
            )}
        </div>
    );
}
