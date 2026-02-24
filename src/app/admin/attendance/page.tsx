
"use client";

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, TeacherAttendance, Schedule, ScheduleEntry } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { id as dfnsId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, Printer, FileSpreadsheet, FileText, FileDown, CalendarIcon } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
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

    const [date, setDate] = useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
    
    const daysInRange = useMemo(() => {
        if (date?.from && date.to) {
            return eachDayOfInterval({ start: date.from, end: date.to });
        }
        return [];
    }, [date]);

    const startDate = useMemo(() => (date?.from ? format(date.from, 'yyyy-MM-dd') : undefined), [date?.from]);
    const endDate = useMemo(() => (date?.to ? format(date.to, 'yyyy-MM-dd') : undefined), [date?.to]);

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !startDate || !endDate) return null;
        return query(
            collection(firestore, 'teacher_attendances'),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );
    }, [firestore, startDate, endDate]);
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

    const isLoading = loadingTeachers || loadingAttendance || loadingSchedules;

    const handleExport = (formatType: 'excel' | 'pdf') => {
      if (!sortedTeachers || !date?.from || !date?.to) {
          toast({ title: 'Tidak ada data untuk diekspor', variant: 'destructive' });
          return;
      }
      const rangeTitle = `${format(date.from, 'd MMM yyyy', { locale: dfnsId })} - ${format(date.to, 'd MMM yyyy', { locale: dfnsId })}`;
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
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, `Absensi`);
          XLSX.writeFile(wb, `absensi_guru_${format(date.from, 'yyyyMMdd')}-${format(date.to, 'yyyyMMdd')}.xlsx`);
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
          doc.save(`absensi_guru_${format(date.from, 'yyyyMMdd')}-${format(date.to, 'yyyyMMdd')}.pdf`);
      }
    };
    
    const handlePrint = () => {
       if (!sortedTeachers || !date?.from || !date?.to) {
            toast({ title: 'Tidak ada data untuk dicetak', variant: 'destructive' });
            return;
       }
        const rangeTitle = `${format(date.from, 'd MMMM yyyy', { locale: dfnsId })} - ${format(date.to, 'd MMMM yyyy', { locale: dfnsId })}`;
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
        <Card>
            <CardHeader>
                <CardTitle>Rekap Absensi Guru</CardTitle>
                <CardDescription>Lihat rekapitulasi absensi guru per rentang tanggal.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full sm:w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {format(date.from, "d LLL, y")} -{" "}
                                {format(date.to, "d LLL, y")}
                                </>
                            ) : (
                                format(date.from, "d LLL, y")
                            )
                            ) : (
                            <span>Pilih tanggal</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                     <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="xs" variant="outline" className="gap-1">
                                <FileDown className="h-3 w-3" />
                                Ekspor
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport('excel')}>
                                <FileSpreadsheet className="mr-2 h-3 w-3" />
                                Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                <FileText className="mr-2 h-3 w-3" />
                                PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="xs" variant="outline" className="gap-1" onClick={handlePrint}>
                            <Printer className="h-3 w-3" />
                            Cetak
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table className="min-w-full border-collapse">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 z-10 bg-card min-w-[200px] border">Nama Guru</TableHead>
                                    {daysInRange.map(day => (
                                        <TableHead key={day.toISOString()} className="text-center border min-w-[40px]">{format(day, 'd')}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedTeachers && sortedTeachers.length > 0 ? sortedTeachers.map(teacher => (
                                    <TableRow key={teacher.id}>
                                        <TableCell className="sticky left-0 z-10 bg-card font-medium border">{teacher.name}</TableCell>
                                        {daysInRange.map(day => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const status = attendanceMap.get(`${teacher.id}-${dateStr}`);
                                            const dayKey = dayMapping[day.getDay()];
                                            const isScheduled = dayKey ? scheduledTeachersByDay.get(dayKey)?.has(teacher.id) : false;

                                            return (
                                                <TableCell 
                                                    key={dateStr} 
                                                    className={cn(
                                                        "text-center text-xs p-1 border",
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
    );
}
