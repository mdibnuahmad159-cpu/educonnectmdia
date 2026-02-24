
"use client";

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, TeacherAttendance } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getDaysInMonth, getYear, getMonth, format, startOfMonth, endOfMonth } from 'date-fns';
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

const years = [getYear(new Date()) - 1, getYear(new Date()), getYear(new Date()) + 1];
const months = Array.from({ length: 12 }, (_, i) => i);

const getStatusColor = (status: TeacherAttendance['status']) => {
    switch (status) {
        case 'Hadir': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'Sakit': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'Izin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'Alpa': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        default: return 'bg-muted/50';
    }
};

export default function AttendancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
    const [selectedMonth, setSelectedMonth] = useState(getMonth(new Date()));
    
    const selectedDate = useMemo(() => new Date(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
    const daysInMonth = useMemo(() => getDaysInMonth(selectedDate), [selectedDate]);
    const monthDays = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    const startDate = useMemo(() => format(startOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate]);
    const endDate = useMemo(() => format(endOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate]);

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'teacher_attendances'),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );
    }, [firestore, startDate, endDate]);
    const { data: attendanceData, isLoading: loadingAttendance } = useCollection<TeacherAttendance>(attendanceQuery);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, TeacherAttendance['status']>();
        if (attendanceData) {
            attendanceData.forEach(att => {
                const day = new Date(att.date).getUTCDate(); // Use getUTCDate to avoid timezone issues
                map.set(`${att.teacherId}-${day}`, att.status);
            });
        }
        return map;
    }, [attendanceData]);
    
    const sortedTeachers = useMemo(() => {
        if (!teachers) return [];
        return [...teachers].sort((a,b) => a.name.localeCompare(b.name));
    }, [teachers]);

    const isLoading = loadingTeachers || loadingAttendance;

    const handleExport = (formatType: 'excel' | 'pdf') => {
      if (!sortedTeachers) {
          toast({ title: 'Tidak ada data untuk diekspor', variant: 'destructive' });
          return;
      }
      const monthName = format(selectedDate, 'MMMM yyyy', { locale: dfnsId });
      const head = [
          ['Nama Guru', ...monthDays.map(String)]
      ];
      const body = sortedTeachers.map(teacher => [
          teacher.name,
          ...monthDays.map(day => attendanceMap.get(`${teacher.id}-${day}`) || '-')
      ]);

      if (formatType === 'excel') {
          const ws = XLSX.utils.aoa_to_sheet([...head, ...body]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, `Absensi ${monthName}`);
          XLSX.writeFile(wb, `absensi_guru_${selectedYear}-${selectedMonth + 1}.xlsx`);
      } else {
          const doc = new jsPDF({ orientation: 'landscape' });
          doc.text(`Rekap Absensi Guru - ${monthName}`, 14, 15);
          (doc as any).autoTable({
              head: head,
              body: body,
              startY: 20,
              theme: 'grid',
              styles: { fontSize: 8 },
              headStyles: { fillColor: [22, 163, 74] },
          });
          doc.save(`absensi_guru_${selectedYear}-${selectedMonth + 1}.pdf`);
      }
    };
    
    const handlePrint = () => {
       if (!sortedTeachers) {
            toast({ title: 'Tidak ada data untuk dicetak', variant: 'destructive' });
            return;
       }
        const monthName = format(selectedDate, 'MMMM yyyy', { locale: dfnsId });
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let tableHtml = `
            <html>
                <head>
                    <title>Rekap Absensi Guru - ${monthName}</title>
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
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Rekap Absensi Guru - ${monthName}</h1>
                    <table>
                        <thead>
                            <tr>
                                <th class="teacher-name">Nama Guru</th>
                                ${monthDays.map(day => `<th>${day}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;
        sortedTeachers.forEach(teacher => {
            tableHtml += '<tr>';
            tableHtml += `<td class="teacher-name">${teacher.name}</td>`;
            monthDays.forEach(day => {
                const status = attendanceMap.get(`${teacher.id}-${day}`) || '';
                tableHtml += `<td class="${status}">${status.charAt(0) || '-'}</td>`;
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
                <CardDescription>Lihat rekapitulasi absensi guru per bulan.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
                    <div className="flex gap-2">
                        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Pilih Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => (
                                    <SelectItem key={m} value={String(m)}>
                                        {format(new Date(0, m), 'MMMM', { locale: dfnsId })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                             <SelectTrigger className="w-full sm:w-[120px]">
                                <SelectValue placeholder="Pilih Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
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
                                    {monthDays.map(day => (
                                        <TableHead key={day} className="text-center border min-w-[40px]">{day}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedTeachers && sortedTeachers.length > 0 ? sortedTeachers.map(teacher => (
                                    <TableRow key={teacher.id}>
                                        <TableCell className="sticky left-0 z-10 bg-card font-medium border">{teacher.name}</TableCell>
                                        {monthDays.map(day => {
                                            const status = attendanceMap.get(`${teacher.id}-${day}`);
                                            return (
                                                <TableCell key={day} className={cn("text-center text-xs p-1 border", status && getStatusColor(status))}>
                                                    {status ? status.charAt(0) : '-'}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={daysInMonth + 1} className="text-center h-24">
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
