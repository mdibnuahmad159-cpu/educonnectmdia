"use client";

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { TeacherAttendance, Schedule, ScheduleEntry } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { id as dfnsId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, Calendar, ClipboardList, AlertCircle, Info } from 'lucide-react';
import { useAcademicYear } from '@/context/academic-year-provider';

const getStatusColor = (status: TeacherAttendance['status']) => {
    switch (status) {
        case 'Hadir': return 'bg-green-100 text-green-800';
        case 'Sakit': return 'bg-yellow-100 text-yellow-800';
        case 'Izin': return 'bg-blue-100 text-blue-800';
        case 'Alpa': return 'bg-red-100 text-red-800';
        default: return 'bg-muted/10';
    }
};

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

export default function TeacherAttendanceHistoryPage() {
    const firestore = useFirestore();
    const { activeYear } = useAcademicYear();

    const [nig, setNig] = useState<string | null>(null);
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    useEffect(() => {
        setNig(sessionStorage.getItem('teacherNig'));
        setFromDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    }, []);
    
    const daysInRange = useMemo(() => {
        if (fromDate && toDate) {
            try {
                return eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) });
            } catch (e) { return []; }
        }
        return [];
    }, [fromDate, toDate]);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !fromDate || !toDate || !nig) return null;
        return query(
            collection(firestore, 'teacher_attendances'), 
            where('teacherId', '==', nig),
            where('date', '>=', fromDate), 
            where('date', '<=', toDate)
        );
    }, [firestore, fromDate, toDate, nig]);
    const { data: attendanceData, isLoading: loadingAttendance } = useCollection<TeacherAttendance>(attendanceQuery);
    
    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', 'pelajaran'));
    }, [firestore, activeYear]);
    const { data: schedules } = useCollection<Schedule>(schedulesQuery);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, TeacherAttendance['status']>();
        if (attendanceData) {
            attendanceData.forEach(att => map.set(att.date, att.status));
        }
        return map;
    }, [attendanceData]);
    
    const scheduledTeacherIdsByDay = useMemo(() => {
        const map = new Map<string, Set<string>>();
        if (!schedules || !nig) return map;
        for (const dayKey of Object.values(dayMapping)) {
            const dailyTeacherIds = new Set<string>();
            for (const schedule of schedules) {
                const daySchedule = schedule[dayKey as keyof typeof schedule] as ScheduleEntry[] | undefined;
                if (daySchedule) {
                    for (const entry of daySchedule) {
                        if (entry.teacherId === nig) dailyTeacherIds.add(nig);
                    }
                }
            }
            map.set(dayKey, dailyTeacherIds);
        }
        return map;
    }, [schedules, nig]);

    const summary = useMemo(() => {
        let hadir = 0;
        let sakit = 0;
        let izin = 0;
        let alpa = 0;
        let totalScheduled = 0;

        daysInRange.forEach(day => {
            const isFri = day.getDay() === 5;
            if (isFri) return;

            const dayKey = dayMapping[day.getDay()];
            const dateStr = format(day, 'yyyy-MM-dd');
            
            const isScheduled = dayKey ? scheduledTeacherIdsByDay.get(dayKey)?.has(nig || "") : false;
            if (!isScheduled) return;

            totalScheduled++;
            const status = attendanceMap.get(dateStr);
            if (status === 'Hadir') hadir++;
            else if (status === 'Sakit') sakit++;
            else if (status === 'Izin') izin++;
            else if (status === 'Alpa') alpa++;
        });

        return { hadir, sakit, izin, alpa, totalScheduled };
    }, [daysInRange, attendanceMap, scheduledTeacherIdsByDay, nig]);

    const isLoading = loadingAttendance || !fromDate || !nig;

    return (
        <div className="space-y-4 pb-10">
            <Card className="sticky top-[106px] z-20 border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="p-4 flex flex-row flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <Input 
                            type="date" 
                            value={fromDate} 
                            onChange={(e) => setFromDate(e.target.value)} 
                            className="h-8 text-xs bg-white/10 border-white/20 text-white focus:ring-white/30"
                        />
                        <span className="text-white/40">-</span>
                        <Input 
                            type="date" 
                            value={toDate} 
                            onChange={(e) => setToDate(e.target.value)} 
                            className="h-8 text-xs bg-white/10 border-white/20 text-white focus:ring-white/30"
                        />
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue="jurnal" className="w-full">
                <div className="bg-muted/40 rounded-t-[24px] flex overflow-hidden">
                    <TabsList className="bg-transparent h-auto p-0 gap-0 w-full flex">
                        <TabsTrigger 
                            value="jurnal"
                            className="flex-1 rounded-t-[24px] rounded-b-none py-4 data-[state=active]:bg-card data-[state=active]:shadow-none bg-transparent text-[11px] font-bold uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary transition-all"
                        >
                            <Calendar className="h-4 w-4 mr-2" /> Jurnal Saya
                        </TabsTrigger>
                        <TabsTrigger 
                            value="rekap"
                            className="flex-1 rounded-t-[24px] rounded-b-none py-4 data-[state=active]:bg-card data-[state=active]:shadow-none bg-transparent text-[11px] font-bold uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary transition-all"
                        >
                            <ClipboardList className="h-4 w-4 mr-2" /> Ringkasan
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="bg-card rounded-b-[24px] border-x border-b shadow-sm overflow-hidden min-h-[400px]">
                    <TabsContent value="jurnal" className="m-0 p-4 border-none outline-none">
                        {isLoading ? (
                            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-blue-700 leading-relaxed">
                                        Halaman ini menampilkan riwayat kehadiran Anda berdasarkan jadwal mengajar jam pertama atau verifikasi manual oleh Admin.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {daysInRange.map(day => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const status = attendanceMap.get(dateStr);
                                        const isFri = day.getDay() === 5;
                                        const dayKey = dayMapping[day.getDay()];
                                        const isScheduled = dayKey ? scheduledTeacherIdsByDay.get(dayKey)?.has(nig || "") : false;

                                        if (!isScheduled && !isFri && !status) return null;

                                        return (
                                            <div key={dateStr} className="p-3 rounded-xl border flex items-center justify-between bg-card hover:border-primary/20 transition-all group">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{format(day, 'EEEE, d MMMM', { locale: dfnsId })}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter",
                                                            isFri ? "bg-blue-100 text-blue-700" :
                                                            status === 'Hadir' ? "bg-green-100 text-green-700" :
                                                            status === 'Alpa' ? "bg-red-100 text-red-700" :
                                                            status ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground/60"
                                                        )}>
                                                            {isFri ? 'Libur Jum\'at' : status || 'Belum Diabsen'}
                                                        </span>
                                                        {isScheduled && !isFri && (
                                                            <span className="text-[8px] bg-primary/5 text-primary/60 font-medium px-1.5 rounded">TERJADWAL</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="rekap" className="m-0 p-6 border-none outline-none">
                        {!isLoading ? (
                            <div className="max-w-md mx-auto space-y-8 py-4">
                                <div className="text-center space-y-1">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Rekapitulasi Kehadiran</h3>
                                    <p className="text-[10px] text-muted-foreground">Tahun Ajaran {activeYear}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-[24px] bg-green-50 border border-green-100 text-center space-y-1">
                                        <p className="text-[10px] font-bold text-green-600 uppercase">Hadir</p>
                                        <p className="text-2xl font-bold text-green-700">{summary.hadir}</p>
                                    </div>
                                    <div className="p-4 rounded-[24px] bg-red-50 border border-red-100 text-center space-y-1">
                                        <p className="text-[10px] font-bold text-red-600 uppercase">Alpa</p>
                                        <p className="text-2xl font-bold text-red-700">{summary.alpa}</p>
                                    </div>
                                    <div className="p-4 rounded-[24px] bg-yellow-50 border border-yellow-100 text-center space-y-1">
                                        <p className="text-[10px] font-bold text-yellow-600 uppercase">Sakit</p>
                                        <p className="text-2xl font-bold text-yellow-700">{summary.sakit}</p>
                                    </div>
                                    <div className="p-4 rounded-[24px] bg-blue-50 border border-blue-100 text-center space-y-1">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase">Izin</p>
                                        <p className="text-2xl font-bold text-blue-700">{summary.izin}</p>
                                    </div>
                                </div>

                                <Card className="border-none shadow-sm bg-muted/20 rounded-[28px] overflow-hidden">
                                    <CardContent className="p-6 space-y-3">
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-muted-foreground">Total Jadwal Mengajar</span>
                                            <span className="font-bold">{summary.totalScheduled} Hari</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-muted-foreground">Persentase Kehadiran</span>
                                            <span className="font-bold text-primary">
                                                {summary.totalScheduled > 0 
                                                    ? Math.round((summary.hadir / summary.totalScheduled) * 100) 
                                                    : 0}%
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground italic px-6 text-center">
                                    <AlertCircle className="h-3 w-3" />
                                    Data ini digunakan sebagai salah satu dasar evaluasi kinerja pendidik.
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
