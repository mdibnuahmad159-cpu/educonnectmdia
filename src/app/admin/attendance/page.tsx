"use client";

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, TeacherAttendance, Schedule, ScheduleEntry } from '@/types';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { id as dfnsId } from 'date-fns/locale';
import { cn, safePrint } from '@/lib/utils';
import { Loader2, Printer, FileDown, CheckCircle2, UserX, AlertCircle, Info, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAcademicYear } from '@/context/academic-year-provider';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const getStatusColor = (status: TeacherAttendance['status']) => {
    switch (status) {
        case 'Hadir': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'Sakit': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'Izin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'Alpa': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        default: return 'bg-muted/50';
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

export default function AttendancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { activeYear } = useAcademicYear();

    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    useEffect(() => {
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

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
    const { data: teachers, isLoading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !fromDate || !toDate) return null;
        return query(collection(firestore, 'teacher_attendances'), where('date', '>=', fromDate), where('date', '<=', toDate));
    }, [firestore, fromDate, toDate]);
    const { data: attendanceData, isLoading: loadingAttendance } = useCollection<TeacherAttendance>(attendanceQuery);
    
    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', 'pelajaran'));
    }, [firestore, activeYear]);
    const { data: schedules } = useCollection<Schedule>(schedulesQuery);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, TeacherAttendance['status']>();
        if (attendanceData) {
            attendanceData.forEach(att => map.set(`${att.teacherId}-${att.date}`, att.status));
        }
        return map;
    }, [attendanceData]);
    
    const scheduledTeachersByDay = useMemo(() => {
        const map = new Map<string, Set<string>>();
        if (!schedules) return map;
        for (const dayKey of Object.values(dayMapping)) {
            const dailyTeacherIds = new Set<string>();
            for (const schedule of schedules) {
                const daySchedule = schedule[dayKey as keyof typeof schedule] as ScheduleEntry[] | undefined;
                if (daySchedule) {
                    for (const entry of daySchedule) {
                        if (entry.teacherId) dailyTeacherIds.add(entry.teacherId);
                    }
                }
            }
            map.set(dayKey, dailyTeacherIds);
        }
        return map;
    }, [schedules]);
    
    const sortedTeachers = useMemo(() => {
        if (!teachers) return [];
        return [...teachers].sort((a,b) => a.name.localeCompare(b.name));
    }, [teachers]);

    const teacherSummaries = useMemo(() => {
        if (!sortedTeachers.length || !daysInRange.length) return [];

        return sortedTeachers.map(teacher => {
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
                
                const isScheduled = dayKey ? scheduledTeachersByDay.get(dayKey)?.has(teacher.id) : false;
                if (!isScheduled) return;

                totalScheduled++;
                const status = attendanceMap.get(`${teacher.id}-${dateStr}`);
                if (status === 'Hadir') hadir++;
                else if (status === 'Sakit') sakit++;
                else if (status === 'Izin') izin++;
                else if (status === 'Alpa') alpa++;
            });

            return {
                id: teacher.id,
                name: teacher.name,
                hadir,
                sakit,
                izin,
                alpa,
                totalScheduled
            };
        });
    }, [sortedTeachers, daysInRange, attendanceMap, scheduledTeachersByDay]);

    const globalStats = useMemo(() => {
        if (!teacherSummaries.length) return null;
        
        return teacherSummaries.reduce((acc, curr) => ({
            totalScheduled: acc.totalScheduled + curr.totalScheduled,
            totalHadir: acc.totalHadir + curr.hadir,
            totalSakit: acc.totalSakit + curr.sakit,
            totalIzin: acc.totalIzin + curr.izin,
            totalAlpa: acc.totalAlpa + curr.alpa,
        }), { totalScheduled: 0, totalHadir: 0, totalSakit: 0, totalIzin: 0, totalAlpa: 0 });
    }, [teacherSummaries]);

    const handleExportPdf = () => {
        if (!sortedTeachers.length || !fromDate || !toDate || !globalStats) return;
        
        const doc = new jsPDF({ orientation: 'landscape' });
        const start = parseISO(fromDate);
        const end = parseISO(toDate);
        const rangeTitle = `${format(start, 'd MMMM yyyy', { locale: dfnsId })} - ${format(end, 'd MMMM yyyy', { locale: dfnsId })}`;

        doc.setFontSize(14);
        doc.text('REKAP ABSENSI GURU', 14, 15);
        doc.setFontSize(10);
        doc.text(`Periode: ${rangeTitle}`, 14, 22);

        const tableHead = [['Nama Guru', ...daysInRange.map(day => format(day, 'd/M'))]];
        const tableBody = sortedTeachers.map(teacher => {
            const row = [teacher.name];
            daysInRange.forEach(day => {
                const isFri = day.getDay() === 5;
                const status = attendanceMap.get(`${teacher.id}-${format(day, 'yyyy-MM-dd')}`);
                row.push(isFri ? 'L' : (status ? status.charAt(0) : '-'));
            });
            return row;
        });

        (doc as any).autoTable({
            head: tableHead,
            body: tableBody,
            startY: 28,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1 },
            headStyles: { fillColor: [46, 125, 50] },
            didParseCell: (data: any) => {
                if (data.section === 'body' && data.column.index > 0) {
                    if (data.cell.text[0] === 'L') data.cell.styles.fillColor = [239, 246, 255];
                    if (data.cell.text[0] === 'H') data.cell.styles.textColor = [22, 163, 74];
                    if (data.cell.text[0] === 'A') data.cell.styles.textColor = [220, 38, 38];
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.text('RINGKASAN KEHADIRAN PER GURU', 14, finalY);

        const summaryHead = [['Nama Guru', 'Jadwal', 'Hadir', 'Sakit', 'Izin', 'Alpa']];
        const summaryBody = teacherSummaries.map(s => [
            s.name, s.totalScheduled, s.hadir, s.sakit, s.izin, s.alpa
        ]);

        (doc as any).autoTable({
            head: summaryHead,
            body: summaryBody,
            startY: finalY + 5,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [60, 60, 60] }
        });

        doc.save(`Rekap_Absensi_Guru_${fromDate}_to_${toDate}.pdf`);
    };

    const handlePrint = () => {
       if (!sortedTeachers.length || !fromDate || !toDate) return;
        const start = parseISO(fromDate);
        const end = parseISO(toDate);
        const rangeTitle = `${format(start, 'd MMMM yyyy', { locale: dfnsId })} - ${format(end, 'd MMMM yyyy', { locale: dfnsId })}`;

        let tableHtml = `
            <html>
                <head>
                    <title>Rekap Absensi Guru - ${rangeTitle}</title>
                    <style>
                        body { font-family: sans-serif; font-size: 10px; }
                        @page { size: A4 landscape; margin: 15mm; }
                        h1 { font-size: 16px; text-align: center; }
                        h2 { font-size: 14px; margin-top: 30px; }
                        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 4px; text-align: center; }
                        th { background-color: #f2f2f2; }
                        .teacher-name { text-align: left; }
                        .Hadir { background-color: #dcfce7 !important; color: #166534; font-weight: bold; }
                        .Sakit { background-color: #fef9c3 !important; }
                        .Izin { background-color: #dbeafe !important; }
                        .Alpa { background-color: #fee2e2 !important; color: #991b1b; font-weight: bold; }
                        .Friday { background-color: #eff6ff !important; font-weight: bold; }
                        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                    </style>
                </head>
                <body>
                    <h1>REKAPITULASI ABSENSI GURU</h1>
                    <p style="text-align: center;">Periode: ${rangeTitle}</p>
                    <table>
                        <thead>
                            <tr>
                                <th class="teacher-name">Nama Guru</th>
                                ${daysInRange.map(day => `<th>${format(day, 'd/M')}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;
        sortedTeachers.forEach(teacher => {
            tableHtml += '<tr>';
            tableHtml += `<td class="teacher-name">${teacher.name}</td>`;
            daysInRange.forEach(day => {
                const isFri = day.getDay() === 5;
                const status = attendanceMap.get(`${teacher.id}-${format(day, 'yyyy-MM-dd')}`);
                const dayKey = dayMapping[day.getDay()];
                const isScheduled = dayKey ? scheduledTeachersByDay.get(dayKey)?.has(teacher.id) : false;

                let cellClass = isFri ? 'Friday' : (status || (isScheduled || !dayKey ? 'pending' : 'not-scheduled'));
                let cellContent = isFri ? 'L' : (status ? status.charAt(0) : '-');
                tableHtml += `<td class="${cellClass}">${cellContent}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';
        
        tableHtml += `
            <h2>Ringkasan Kehadiran Guru</h2>
            <table>
                <thead>
                    <tr>
                        <th class="teacher-name">Nama Guru</th>
                        <th>Total Jadwal</th>
                        <th>Hadir</th>
                        <th>Sakit</th>
                        <th>Izin</th>
                        <th>Alpa</th>
                    </tr>
                </thead>
                <tbody>
                    ${teacherSummaries.map(s => `
                        <tr>
                            <td class="teacher-name">${s.name}</td>
                            <td>${s.totalScheduled}</td>
                            <td style="color: green; font-weight: bold;">${s.hadir}</td>
                            <td>${s.sakit}</td>
                            <td>${s.izin}</td>
                            <td style="color: red; font-weight: bold;">${s.alpa}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        tableHtml += '</body></html>';
        safePrint(tableHtml);
    };

    const isLoading = loadingTeachers || loadingAttendance || !fromDate;

    return (
        <div className="space-y-6 pb-10">
            <Card className="border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="p-4 flex flex-row flex-wrap items-center justify-between gap-4">
                    <div className="grid grid-cols-2 gap-2 flex-1 max-w-sm">
                        <Input 
                            type="date" 
                            value={fromDate} 
                            onChange={(e) => setFromDate(e.target.value)} 
                            className="h-8 text-xs bg-white/10 border-white/20 text-white focus:ring-white/30"
                        />
                        <Input 
                            type="date" 
                            value={toDate} 
                            onChange={(e) => setToDate(e.target.value)} 
                            className="h-8 text-xs bg-white/10 border-white/20 text-white focus:ring-white/30"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="xs" onClick={handleExportPdf} className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none">
                            <FileDown className="h-3.5 w-3.5" /> Ekspor PDF
                        </Button>
                        <Button variant="secondary" size="xs" onClick={handlePrint} className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none">
                            <Printer className="h-3.5 w-3.5" /> Cetak
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-4">
                    {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div> : (
                        <div className="overflow-x-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[150px] font-bold border-r">Nama Guru</TableHead>
                                        {daysInRange.map(day => (
                                            <TableHead key={day.toISOString()} className={cn(
                                                "text-center px-1 text-[10px] font-bold border-r",
                                                day.getDay() === 5 && "text-blue-600 bg-blue-50"
                                            )}>{format(day, 'd')}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedTeachers.map(teacher => (
                                        <TableRow key={teacher.id}>
                                            <TableCell className="sticky left-0 bg-card text-xs font-medium border-r">{teacher.name}</TableCell>
                                            {daysInRange.map(day => {
                                                const isFri = day.getDay() === 5;
                                                const status = attendanceMap.get(`${teacher.id}-${format(day, 'yyyy-MM-dd')}`);
                                                return (
                                                    <TableCell key={day.toISOString()} className={cn("text-center text-[10px] p-0 h-8 border-r last:border-r-0 font-mono", isFri ? 'bg-blue-50 text-blue-600 font-bold' : status ? getStatusColor(status) : 'bg-muted/10')}>
                                                        {isFri ? 'L' : status ? status.charAt(0) : '-'}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {!isLoading && globalStats && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <Card className="bg-primary/5 border-primary/10">
                            <CardContent className="p-3">
                                <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Total Jadwal</p>
                                <div className="flex items-center gap-2">
                                    <Info className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-lg font-bold">{globalStats.totalScheduled}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-green-50 border-green-100">
                            <CardContent className="p-3">
                                <p className="text-[9px] font-bold uppercase text-green-700 mb-1">Hadir</p>
                                <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span className="text-lg font-bold">{globalStats.totalHadir}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-yellow-50 border-yellow-100">
                            <CardContent className="p-3">
                                <p className="text-[9px] font-bold uppercase text-yellow-700 mb-1">Sakit</p>
                                <div className="flex items-center gap-2 text-yellow-700">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span className="text-lg font-bold">{globalStats.totalSakit}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-blue-50 border-blue-100">
                            <CardContent className="p-3">
                                <p className="text-[9px] font-bold uppercase text-blue-700 mb-1">Izin</p>
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Info className="h-3.5 w-3.5" />
                                    <span className="text-lg font-bold">{globalStats.totalIzin}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50 border-red-100">
                            <CardContent className="p-3">
                                <p className="text-[9px] font-bold uppercase text-red-700 mb-1">Alpa</p>
                                <div className="flex items-center gap-2 text-red-700">
                                    <UserX className="h-3.5 w-3.5" />
                                    <span className="text-lg font-bold">{globalStats.totalAlpa}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-3 border-b bg-muted/5">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Users className="h-4 w-4" /> Ringkasan Per Guru
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="px-4 font-bold text-[10px] uppercase">Nama Guru</TableHead>
                                        <TableHead className="text-center font-bold text-[10px] uppercase">Jadwal</TableHead>
                                        <TableHead className="text-center font-bold text-[10px] uppercase text-green-700">Hadir</TableHead>
                                        <TableHead className="text-center font-bold text-[10px] uppercase text-yellow-700">Sakit</TableHead>
                                        <TableHead className="text-center font-bold text-[10px] uppercase text-blue-700">Izin</TableHead>
                                        <TableHead className="text-center font-bold text-[10px] uppercase text-red-700">Alpa</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {teacherSummaries.map(s => (
                                        <TableRow key={s.id} className="hover:bg-muted/5 transition-colors">
                                            <TableCell className="px-4 font-medium text-xs py-2">{s.name}</TableCell>
                                            <TableCell className="text-center text-xs font-mono">{s.totalScheduled}</TableCell>
                                            <TableCell className="text-center text-xs font-bold text-green-600">{s.hadir}</TableCell>
                                            <TableCell className="text-center text-xs font-medium">{s.sakit}</TableCell>
                                            <TableCell className="text-center text-xs font-medium">{s.izin}</TableCell>
                                            <TableCell className="text-center text-xs font-bold text-red-600">{s.alpa}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
