"use client";

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, TeacherAttendance, Schedule, ScheduleEntry } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { id as dfnsId } from 'date-fns/locale';
import { cn, safePrint } from '@/lib/utils';
import { Loader2, Printer, FileDown, CheckCircle2, UserX, AlertCircle, Info } from 'lucide-react';
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

    const summaryStats = useMemo(() => {
        let totalScheduled = 0;
        let totalHadir = 0;
        let totalSakit = 0;
        let totalIzin = 0;
        let totalAlpa = 0;

        if (!sortedTeachers.length || !daysInRange.length) return null;

        daysInRange.forEach(day => {
            const isFri = day.getDay() === 5;
            if (isFri) return;

            const dayKey = dayMapping[day.getDay()];
            const dateStr = format(day, 'yyyy-MM-dd');
            
            sortedTeachers.forEach(teacher => {
                const isScheduled = dayKey ? scheduledTeachersByDay.get(dayKey)?.has(teacher.id) : false;
                if (!isScheduled) return;

                totalScheduled++;
                const status = attendanceMap.get(`${teacher.id}-${dateStr}`);
                if (status === 'Hadir') totalHadir++;
                else if (status === 'Sakit') totalSakit++;
                else if (status === 'Izin') totalIzin++;
                else if (status === 'Alpa') totalAlpa++;
            });
        });

        return { totalScheduled, totalHadir, totalSakit, totalIzin, totalAlpa };
    }, [sortedTeachers, daysInRange, attendanceMap, scheduledTeachersByDay]);

    const handleExportPdf = () => {
        if (!sortedTeachers.length || !fromDate || !toDate || !summaryStats) return;
        
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
        doc.text('RINGKASAN KEHADIRAN (BERDASARKAN JADWAL)', 14, finalY);
        doc.setFontSize(9);
        doc.text(`Total Jadwal Guru: ${summaryStats.totalScheduled}`, 14, finalY + 7);
        doc.text(`Total Hadir: ${summaryStats.totalHadir}`, 14, finalY + 12);
        doc.text(`Total Sakit: ${summaryStats.totalSakit}`, 14, finalY + 17);
        doc.text(`Total Izin: ${summaryStats.totalIzin}`, 14, finalY + 22);
        doc.text(`Total Alpa: ${summaryStats.totalAlpa}`, 14, finalY + 27);

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
                        h1 { font-size: 16px; }
                        table { border-collapse: collapse; width: 100%; }
                        th, td { border: 1px solid #ddd; padding: 4px; text-align: center; }
                        th { background-color: #f2f2f2; }
                        .teacher-name { text-align: left; }
                        .Hadir { background-color: #dcfce7 !important; }
                        .Sakit { background-color: #fef9c3 !important; }
                        .Izin { background-color: #dbeafe !important; }
                        .Alpa { background-color: #fee2e2 !important; }
                        .Friday { background-color: #eff6ff !important; font-weight: bold; }
                        .summary { margin-top: 20px; font-weight: bold; }
                        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                    </style>
                </head>
                <body>
                    <h1>Rekap Absensi Guru - ${rangeTitle}</h1>
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
        
        if (summaryStats) {
            tableHtml += `
                <div class="summary">
                    <p>RINGKASAN KEHADIRAN:</p>
                    <p>Total Jadwal Guru: ${summaryStats.totalScheduled}</p>
                    <p>Total Hadir: ${summaryStats.totalHadir}</p>
                    <p>Total Sakit: ${summaryStats.totalSakit}</p>
                    <p>Total Izin: ${summaryStats.totalIzin}</p>
                    <p>Total Alpa: ${summaryStats.totalAlpa}</p>
                </div>
            `;
        }

        tableHtml += '</body></html>';
        safePrint(tableHtml);
    };

    const isLoading = loadingTeachers || loadingAttendance || !fromDate;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Rekap Absensi Guru</CardTitle>
                    <CardDescription>Lihat rekapitulasi absensi guru per rentang tanggal.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col lg:flex-row justify-between items-end gap-4 mb-6">
                        <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
                            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto">
                            <Button variant="outline" onClick={handleExportPdf} className="flex-1 lg:flex-none gap-2">
                                <FileDown className="h-4 w-4" /> Ekspor PDF
                            </Button>
                            <Button variant="outline" onClick={handlePrint} className="flex-1 lg:flex-none gap-2">
                                <Printer className="h-4 w-4" /> Cetak
                            </Button>
                        </div>
                    </div>
                    {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                        <div className="overflow-x-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="sticky left-0 bg-card min-w-[150px]">Nama Guru</TableHead>
                                        {daysInRange.map(day => (
                                            <TableHead key={day.toISOString()} className="text-center px-1 text-[10px]">{format(day, 'd')}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedTeachers.map(teacher => (
                                        <TableRow key={teacher.id}>
                                            <TableCell className="sticky left-0 bg-card text-xs">{teacher.name}</TableCell>
                                            {daysInRange.map(day => {
                                                const isFri = day.getDay() === 5;
                                                const status = attendanceMap.get(`${teacher.id}-${format(day, 'yyyy-MM-dd')}`);
                                                return (
                                                    <TableCell key={day.toISOString()} className={cn("text-center text-[10px] p-0 h-8", isFri ? 'bg-blue-50 text-blue-600 font-bold' : status ? getStatusColor(status) : 'bg-muted/10')}>
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

            {!isLoading && summaryStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Card className="bg-primary/5 border-primary/10">
                        <CardHeader className="p-3 pb-0">
                            <CardDescription className="text-[10px] font-bold uppercase">Total Jadwal</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-primary" />
                                <span className="text-lg font-bold">{summaryStats.totalScheduled}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-100">
                        <CardHeader className="p-3 pb-0">
                            <CardDescription className="text-[10px] font-bold uppercase text-green-700">Hadir</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-lg font-bold">{summaryStats.totalHadir}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-yellow-50 border-yellow-100">
                        <CardHeader className="p-3 pb-0">
                            <CardDescription className="text-[10px] font-bold uppercase text-yellow-700">Sakit</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="flex items-center gap-2 text-yellow-700">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-lg font-bold">{summaryStats.totalSakit}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-100">
                        <CardHeader className="p-3 pb-0">
                            <CardDescription className="text-[10px] font-bold uppercase text-blue-700">Izin</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="flex items-center gap-2 text-blue-700">
                                <Info className="h-4 w-4" />
                                <span className="text-lg font-bold">{summaryStats.totalIzin}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-100">
                        <CardHeader className="p-3 pb-0">
                            <CardDescription className="text-[10px] font-bold uppercase text-red-700">Alpa</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="flex items-center gap-2 text-red-700">
                                <UserX className="h-4 w-4" />
                                <span className="text-lg font-bold">{summaryStats.totalAlpa}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
