"use client";

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, TeacherAttendance, Schedule, ScheduleEntry } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { id as dfnsId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, Printer, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAcademicYear } from '@/context/academic-year-provider';

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
    // Friday (5) is intentionally omitted
    6: 'saturday',
};

export default function AttendancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { activeYear } = useAcademicYear();

    // Fix hydration issues
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    useEffect(() => {
        setFromDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    }, []);
    
    const daysInRange = useMemo(() => {
        if (fromDate && toDate) {
            try {
                return eachDayOfInterval({ 
                    start: parseISO(fromDate), 
                    end: parseISO(toDate) 
                });
            } catch (e) {
                return [];
            }
        }
        return [];
    }, [fromDate, toDate]);

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
    const { data: teachers, isLoading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !fromDate || !toDate) return null;
        return query(
            collection(firestore, 'teacher_attendances'),
            where('date', '>=', fromDate),
            where('date', '<=', toDate)
        );
    }, [firestore, fromDate, toDate]);
    const { data: attendanceData, isLoading: loadingAttendance } = useCollection<TeacherAttendance>(attendanceQuery);
    
    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(
            collection(firestore, 'schedules'),
            where('academicYear', '==', activeYear),
            where('type', '==', 'pelajaran')
        );
    }, [firestore, activeYear]);
    const { data: schedules, isLoading: loadingSchedules } = useCollection<Schedule>(schedulesQuery);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, TeacherAttendance['status']>();
        if (attendanceData) {
            attendanceData.forEach(att => {
                map.set(`${att.teacherId}-${att.date}`, att.status);
            });
        }
        return map;
    }, [attendanceData]);
    
    const scheduledTeachersByDay = useMemo(() => {
        const map = new Map<string, Set<string>>(); // Map<DayKey, Set<TeacherId>>
        if (!schedules) return map;
    
        for (const dayKey of Object.values(dayMapping)) {
            const dailyTeacherIds = new Set<string>();
            for (const schedule of schedules) {
                const daySchedule = schedule[dayKey as keyof typeof schedule] as ScheduleEntry[] | undefined;
                if (daySchedule) {
                    for (const entry of daySchedule) {
                        if (entry.teacherId) {
                            dailyTeacherIds.add(entry.teacherId);
                        }
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

    const isLoading = loadingTeachers || loadingAttendance || loadingSchedules || !fromDate;

    const attendanceSummary = useMemo(() => {
        if (!sortedTeachers || !daysInRange.length || !attendanceMap) return [];

        return sortedTeachers.map(teacher => {
            const summary: { [key in TeacherAttendance['status']]: number } = {
                Hadir: 0,
                Sakit: 0,
                Izin: 0,
                Alpa: 0,
            };

            daysInRange.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const status = attendanceMap.get(`${teacher.id}-${dateStr}`);
                
                if (status && summary[status] !== undefined) {
                    summary[status]++;
                }
            });

            return {
                teacherId: teacher.id,
                teacherName: teacher.name,
                summary,
            };
        });
    }, [sortedTeachers, daysInRange, attendanceMap]);

    const handleExport = (formatType: 'excel' | 'pdf') => {
      if (!sortedTeachers.length || !fromDate || !toDate) {
          toast({ title: 'Tidak ada data untuk diekspor', variant: 'destructive' });
          return;
      }
      const start = parseISO(fromDate);
      const end = parseISO(toDate);
      const rangeTitle = `${format(start, 'd MMM yyyy', { locale: dfnsId })} - ${format(end, 'd MMM yyyy', { locale: dfnsId })}`;
      const head = [
          ['Nama Guru', ...daysInRange.map(day => format(day, 'd/M'))]
      ];
      const body = sortedTeachers.map(teacher => [
          teacher.name,
          ...daysInRange.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              return attendanceMap.get(`${teacher.id}-${dateStr}`) || '-';
          })
      ]);

      if (formatType === 'excel') {
          const ws = XLSX.utils.aoa_to_sheet([...head, ...body]);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, ws, `Absensi`);
          XLSX.writeFile(workbook, `absensi_guru_${fromDate}_${toDate}.xlsx`);
      } else {
          const doc = new jsPDF({ orientation: 'landscape' });
          doc.text(`Rekap Absensi Guru - ${rangeTitle}`, 14, 15);
          (doc as any).autoTable({
              head: head,
              body: body,
              startY: 20,
              theme: 'grid',
              styles: { fontSize: 8 },
              headStyles: { fillColor: [22, 163, 74] },
          });
          doc.save(`absensi_guru_${fromDate}_${toDate}.pdf`);
      }
    };
    
    const handlePrint = () => {
       if (!sortedTeachers.length || !fromDate || !toDate) {
            toast({ title: 'Tidak ada data untuk dicetak', variant: 'destructive' });
            return;
       }
        const start = parseISO(fromDate);
        const end = parseISO(toDate);
        const rangeTitle = `${format(start, 'd MMMM yyyy', { locale: dfnsId })} - ${format(end, 'd MMMM yyyy', { locale: dfnsId })}`;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

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
                        .not-scheduled { background-color: #fee2e2 !important; }
                        .pending { background-color: #f3f4f6 !important; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
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
                const dateStr = format(day, 'yyyy-MM-dd');
                const status = attendanceMap.get(`${teacher.id}-${dateStr}`);
                const dayKey = dayMapping[day.getDay()];
                const isScheduled = dayKey ? scheduledTeachersByDay.get(dayKey)?.has(teacher.id) : false;

                let cellClass = '';
                let cellContent = '';

                if (status) {
                    cellClass = status; // Hadir, Sakit, Izin, Alpa
                    cellContent = status.charAt(0);
                } else if (!dayKey) {
                    cellClass = 'pending';
                    cellContent = '-';
                } else if (!isScheduled) {
                    cellClass = 'not-scheduled';
                    cellContent = '';
                } else {
                    cellClass = 'pending';
                    cellContent = '-';
                }
                tableHtml += `<td class="${cellClass}">${cellContent}</td>`;
            });
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table></body></html>';
        printWindow.document.write(tableHtml);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Rekap Absensi Guru</CardTitle>
                    <CardDescription>Lihat rekapitulasi absensi guru per rentang tanggal.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col lg:flex-row justify-between items-end gap-4 mb-6">
                        <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase ml-1">Dari Tanggal</label>
                                <Input 
                                    type="date" 
                                    value={fromDate} 
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase ml-1">Sampai Tanggal</label>
                                <Input 
                                    type="date" 
                                    value={toDate} 
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-1 h-9">
                                    <FileDown className="h-4 w-4" />
                                    Ekspor
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleExport('excel')}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    PDF
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button size="sm" variant="outline" className="gap-1 h-9" onClick={handlePrint}>
                                <Printer className="h-4 w-4" />
                                Cetak
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto border rounded-md">
                            <Table className="min-w-full border-collapse">
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="sticky left-0 z-10 bg-muted/50 min-w-[180px] border-r font-bold">Nama Guru</TableHead>
                                        {daysInRange.map(day => (
                                            <TableHead key={day.toISOString()} className="text-center border-r min-w-[35px] px-1 text-[10px] font-bold">{format(day, 'd')}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedTeachers && sortedTeachers.length > 0 ? sortedTeachers.map(teacher => (
                                        <TableRow key={teacher.id}>
                                            <TableCell className="sticky left-0 z-10 bg-card font-medium border-r text-xs py-2">{teacher.name}</TableCell>
                                            {daysInRange.map(day => {
                                                const dateStr = format(day, 'yyyy-MM-dd');
                                                const status = attendanceMap.get(`${teacher.id}-${dateStr}`);
                                                const dayKey = dayMapping[day.getDay()];
                                                const isScheduled = dayKey ? scheduledTeachersByDay.get(dayKey)?.has(teacher.id) : false;

                                                return (
                                                    <TableCell 
                                                        key={dateStr} 
                                                        className={cn(
                                                            "text-center text-[10px] p-0 border-r h-8",
                                                            status 
                                                                ? getStatusColor(status)
                                                                : !isScheduled && dayKey 
                                                                    ? 'bg-red-100/70 dark:bg-red-900/30' 
                                                                    : 'bg-muted/30'
                                                        )}
                                                    >
                                                        {status ? status.charAt(0) : (isScheduled || !dayKey) ? '-' : ''}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={daysInRange.length + 1} className="text-center h-24">
                                                Belum ada data guru.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-4">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm">Ringkasan Absensi</CardTitle>
                    <CardDescription className="text-[10px]">
                        Total kehadiran guru untuk rentang tanggal yang dipilih.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                    <Table>
                        <TableHeader>
                            <TableRow className="h-8">
                                <TableHead className="text-xs">Nama Guru</TableHead>
                                <TableHead className="text-center text-xs w-[60px]">Hadir</TableHead>
                                <TableHead className="text-center text-xs w-[60px]">Sakit</TableHead>
                                <TableHead className="text-center text-xs w-[60px]">Izin</TableHead>
                                <TableHead className="text-center text-xs w-[60px]">Alpa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                            <span className="text-xs">Memuat ringkasan...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : attendanceSummary.length > 0 ? (
                                attendanceSummary.map(item => (
                                    <TableRow key={item.teacherId} className="h-8">
                                        <TableCell className="font-medium text-xs py-1">{item.teacherName}</TableCell>
                                        <TableCell className="text-center text-xs py-1 text-green-600 font-bold">{item.summary.Hadir}</TableCell>
                                        <TableCell className="text-center text-xs py-1 text-yellow-600 font-bold">{item.summary.Sakit}</TableCell>
                                        <TableCell className="text-center text-xs py-1 text-blue-600 font-bold">{item.summary.Izin}</TableCell>
                                        <TableCell className="text-center text-xs py-1 text-red-600 font-bold">{item.summary.Alpa}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-xs">
                                        Tidak ada data ringkasan untuk ditampilkan.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}