"use client";

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { StudentAttendance, Student } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    parseISO, 
    setMonth, 
    setYear, 
    getYear, 
    getMonth 
} from 'date-fns';
import { id as dfnsId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, Calendar, ClipboardList, Info, CheckCircle2, TrendingUp } from 'lucide-react';
import { useAcademicYear } from '@/context/academic-year-provider';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const getStatusColor = (status: StudentAttendance['status']) => {
    switch (status) {
        case 'Hadir': return 'bg-green-100 text-green-800';
        case 'Sakit': return 'bg-yellow-100 text-yellow-800';
        case 'Izin': return 'bg-blue-100 text-blue-800';
        case 'Alpa': return 'bg-red-100 text-red-800';
        case 'Libur': return 'bg-purple-100 text-purple-800';
        default: return 'bg-muted/10 text-muted-foreground';
    }
};

const MONTHS = [
    { id: 0, name: "Januari" }, { id: 1, name: "Februari" }, { id: 2, name: "Maret" },
    { id: 3, name: "April" }, { id: 4, name: "Mei" }, { id: 5, name: "Juni" },
    { id: 6, name: "Juli" }, { id: 7, name: "Agustus" }, { id: 8, name: "September" },
    { id: 9, name: "Oktober" }, { id: 10, name: "November" }, { id: 11, name: "Desember" },
];

export default function ParentAttendancePage() {
    const firestore = useFirestore();
    const { activeYear } = useAcademicYear();

    const [nis, setNis] = useState<string | null>(null);
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");
    
    const [selectedMonth, setSelectedMonth] = useState<string>(String(getMonth(new Date())));
    const [selectedYear, setSelectedYear] = useState<string>(String(getYear(new Date())));

    useEffect(() => {
        setNis(sessionStorage.getItem('studentNis'));
        const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
        setFromDate(start);
        setToDate(end);
    }, []);

    useEffect(() => {
        if (selectedMonth !== "" && selectedYear !== "") {
            const baseDate = setYear(setMonth(new Date(), Number(selectedMonth)), Number(selectedYear));
            setFromDate(format(startOfMonth(baseDate), 'yyyy-MM-dd'));
            setToDate(format(endOfMonth(baseDate), 'yyyy-MM-dd'));
        }
    }, [selectedMonth, selectedYear]);
    
    const daysInRange = useMemo(() => {
        if (fromDate && toDate) {
            try {
                return eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) });
            } catch (e) { return []; }
        }
        return [];
    }, [fromDate, toDate]);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !fromDate || !toDate || !nis) return null;
        return query(
            collection(firestore, 'student_attendances'), 
            where('studentId', '==', nis),
            where('date', '>=', fromDate), 
            where('date', '<=', toDate)
        );
    }, [firestore, fromDate, toDate, nis]);
    const { data: attendanceData, isLoading: loadingAttendance } = useCollection<StudentAttendance>(attendanceQuery);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, StudentAttendance['status']>();
        if (attendanceData) {
            attendanceData.forEach(att => map.set(att.date, att.status));
        }
        return map;
    }, [attendanceData]);

    const summary = useMemo(() => {
        let hadir = 0;
        let sakit = 0;
        let izin = 0;
        let alpa = 0;
        let libur = 0;
        let totalEffectiveDays = 0;

        daysInRange.forEach(day => {
            const isFri = day.getDay() === 5;
            const dateStr = format(day, 'yyyy-MM-dd');
            const status = attendanceMap.get(dateStr);

            if (isFri) {
                if (status === 'Libur') libur++;
                return;
            }

            totalEffectiveDays++;
            if (status === 'Hadir') hadir++;
            else if (status === 'Sakit') sakit++;
            else if (status === 'Izin') izin++;
            else if (status === 'Alpa') alpa++;
            else if (status === 'Libur') libur++;
        });

        const attendanceRate = totalEffectiveDays > 0 ? Math.round((hadir / totalEffectiveDays) * 100) : 0;

        return { hadir, sakit, izin, alpa, libur, totalEffectiveDays, attendanceRate };
    }, [daysInRange, attendanceMap]);

    const isLoading = loadingAttendance || !fromDate || !nis;

    return (
        <div className="space-y-4 pb-10 max-w-2xl mx-auto">
            {/* Filter Card */}
            <Card className="sticky top-[106px] z-20 border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="p-4 flex flex-col gap-3">
                    <div className="flex flex-row items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Filter Periode Absensi</p>
                    </div>
                    <div className="flex flex-row gap-2">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="flex-1 h-9 text-xs bg-white/10 border-white/20 text-white focus:ring-white/30">
                                <SelectValue placeholder="Pilih Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map(m => (
                                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[100px] h-9 text-xs bg-white/10 border-white/20 text-white focus:ring-white/30">
                                <SelectValue placeholder="Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                {[2024, 2025, 2026].map(y => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                            <Calendar className="h-4 w-4 mr-2" /> Jurnal Santri
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
                                        Data berikut adalah catatan absensi harian anak Anda. Pastikan untuk selalu memantau kedisiplinan kehadiran di Madrasah.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[...daysInRange].reverse().map(day => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const status = attendanceMap.get(dateStr);
                                        const isFri = day.getDay() === 5;

                                        return (
                                            <div key={dateStr} className="p-3 rounded-xl border flex items-center justify-between bg-card hover:border-primary/20 transition-all group">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{format(day, 'EEEE, d MMMM', { locale: dfnsId })}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter",
                                                            isFri ? "bg-blue-50 text-blue-600" :
                                                            status === 'Hadir' ? "bg-green-100 text-green-700" :
                                                            status === 'Alpa' ? "bg-red-100 text-red-700" :
                                                            status ? getStatusColor(status) : "bg-muted text-muted-foreground/40"
                                                        )}>
                                                            {isFri ? 'Libur Jum\'at' : status || 'Belum Diabsen'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {!isFri && status === 'Hadir' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="rekap" className="m-0 p-6 border-none outline-none">
                        {!isLoading ? (
                            <div className="space-y-8 py-4">
                                <div className="text-center space-y-1">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Statistik Kehadiran Santri</h3>
                                    <p className="text-[10px] text-muted-foreground">Periode: {MONTHS[Number(selectedMonth)].name} {selectedYear}</p>
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
                                    <CardContent className="p-6 space-y-5">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-muted-foreground font-medium uppercase tracking-wider">Persentase Kehadiran</span>
                                                <span className="font-bold text-primary">{summary.attendanceRate}%</span>
                                            </div>
                                            <Progress value={summary.attendanceRate} className="h-2" />
                                        </div>

                                        <div className="space-y-2 border-t border-muted-foreground/10 pt-4">
                                            <div className="flex justify-between items-center text-[11px]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <span className="text-muted-foreground">Total Hari Efektif</span>
                                                </div>
                                                <span className="font-bold">{summary.totalEffectiveDays} Hari</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    <span className="text-muted-foreground">Total Hari Libur</span>
                                                </div>
                                                <span className="font-bold">{summary.libur} Hari</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex items-center gap-3 justify-center p-4 rounded-2xl bg-primary/5 text-[10px] text-primary font-medium italic border border-primary/10">
                                    <TrendingUp className="h-4 w-4" />
                                    Data kehadiran disinkronkan langsung dari absensi harian pengajar.
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
