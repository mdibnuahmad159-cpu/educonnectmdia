"use client";

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Firestore } from 'firebase/firestore';
import type { Student, StudentAttendance } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { id as dfnsId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, Printer, FileSpreadsheet, FileText, FileDown, Users, AlertTriangle, ExternalLink, Calendar, ClipboardList } from 'lucide-react';
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

const getStatusColor = (status: StudentAttendance['status']) => {
    switch (status) {
        case 'Hadir': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'Sakit': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'Izin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'Alpa': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        default: return 'bg-muted/10';
    }
};

export default function StudentAttendancePage() {
    const firestore = useFirestore() as Firestore;
    const { toast } = useToast();

    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("0");

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

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'), where('kelas', '==', Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: students, isLoading: loadingStudents } = useCollection<Student>(studentsQuery);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !fromDate || !toDate || !selectedClass) return null;
        return query(
            collection(firestore, 'student_attendances'),
            where('kelas', '==', Number(selectedClass)),
            where('date', '>=', fromDate),
            where('date', '<=', toDate)
        );
    }, [firestore, fromDate, toDate, selectedClass]);
    const { data: attendanceData, isLoading: loadingAttendance, error: attendanceError } = useCollection<StudentAttendance>(attendanceQuery);
    
    const attendanceMap = useMemo(() => {
        const map = new Map<string, StudentAttendance['status']>();
        if (attendanceData) {
            attendanceData.forEach(att => {
                map.set(`${att.studentId}-${att.date}`, att.status);
            });
        }
        return map;
    }, [attendanceData]);
    
    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return [...students].sort((a,b) => a.name.localeCompare(b.name));
    }, [students]);

    const isLoading = loadingStudents || loadingAttendance || !fromDate;

    const attendanceSummary = useMemo(() => {
        if (!sortedStudents || !daysInRange.length || !attendanceMap) return [];

        return sortedStudents.map(student => {
            const summary: { [key in StudentAttendance['status']]: number } = {
                Hadir: 0,
                Sakit: 0,
                Izin: 0,
                Alpa: 0,
                'Belum Diabsen': 0,
                'Libur': 0
            };

            daysInRange.forEach(day => {
                const isFri = day.getDay() === 5;
                if (isFri) return;

                const dateStr = format(day, 'yyyy-MM-dd');
                const status = attendanceMap.get(`${student.id}-${dateStr}`);
                
                if (status && summary[status] !== undefined) {
                    summary[status]++;
                }
            });

            return {
                studentId: student.id,
                studentName: student.name,
                nis: student.nis,
                summary,
            };
        });
    }, [sortedStudents, daysInRange, attendanceMap]);

    const indexLink = useMemo(() => {
        if (!attendanceError) return null;
        const match = attendanceError.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        return match ? match[0] : null;
    }, [attendanceError]);

    const handleExport = (formatType: 'excel' | 'pdf') => {
      if (!sortedStudents.length || !fromDate || !toDate) {
          toast({ title: 'Tidak ada data untuk diekspor', variant: 'destructive' });
          return;
      }
      const start = parseISO(fromDate);
      const end = parseISO(toDate);
      const rangeTitle = `${format(start, 'd MMM yyyy', { locale: dfnsId })} - ${format(end, 'd MMM yyyy', { locale: dfnsId })}`;
      const head = [
          ['Nama Siswa', 'NIS', ...daysInRange.map(day => format(day, 'd/M'))]
      ];
      const body = sortedStudents.map(student => [
          student.name,
          student.nis,
          ...daysInRange.map(day => {
              const isFri = day.getDay() === 5;
              if (isFri) return 'L';
              const dateStr = format(day, 'yyyy-MM-dd');
              return attendanceMap.get(`${student.id}-${dateStr}`) || '-';
          })
      ]);

      if (formatType === 'excel') {
          const ws = XLSX.utils.aoa_to_sheet([...head, ...body]);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, ws, `Absensi Siswa Kelas ${selectedClass}`);
          XLSX.writeFile(workbook, `absensi_siswa_kelas_${selectedClass}_${fromDate}_${toDate}.xlsx`);
      } else {
          const doc = new jsPDF({ orientation: 'landscape' });
          doc.text(`Rekap Absensi Siswa Kelas ${selectedClass} - ${rangeTitle}`, 14, 15);
          (doc as any).autoTable({
              head: head,
              body: body,
              startY: 20,
              theme: 'grid',
              styles: { fontSize: 7 },
              headStyles: { fillColor: [22, 163, 74] },
          });
          doc.save(`absensi_siswa_kelas_${selectedClass}_${fromDate}_${toDate}.pdf`);
      }
    };
    
    const handlePrint = () => {
       if (!sortedStudents.length || !fromDate || !toDate) {
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
                    <title>Rekap Absensi Siswa Kelas ${selectedClass} - ${rangeTitle}</title>
                    <style>
                        body { font-family: sans-serif; font-size: 9px; }
                        @page { size: A4 landscape; margin: 10mm; }
                        h1 { font-size: 14px; text-align: center; }
                        table { border-collapse: collapse; width: 100%; }
                        th, td { border: 1px solid #ddd; padding: 3px; text-align: center; }
                        th { background-color: #f2f2f2; }
                        .student-name { text-align: left; }
                        .Hadir { background-color: #dcfce7 !important; }
                        .Sakit { background-color: #fef9c3 !important; }
                        .Izin { background-color: #dbeafe !important; }
                        .Alpa { background-color: #fee2e2 !important; }
                        .Friday { background-color: #eff6ff !important; font-weight: bold; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Rekap Absensi Siswa Kelas ${selectedClass}</h1>
                    <p style="text-align: center; margin-bottom: 10px;">Periode: ${rangeTitle}</p>
                    <table>
                        <thead>
                            <tr>
                                <th class="student-name">Nama Siswa</th>
                                <th>NIS</th>
                                ${daysInRange.map(day => `<th>${format(day, 'd/M')}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;
        sortedStudents.forEach(student => {
            tableHtml += '<tr>';
            tableHtml += `<td class="student-name">${student.name}</td>`;
            tableHtml += `<td>${student.nis}</td>`;
            daysInRange.forEach(day => {
                const isFri = day.getDay() === 5;
                const dateStr = format(day, 'yyyy-MM-dd');
                const status = attendanceMap.get(`${student.id}-${dateStr}`);
                
                let cellClass = isFri ? 'Friday' : (status || '');
                let cellContent = isFri ? 'L' : (status ? status.charAt(0) : '-');
                
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
        <div className="space-y-4 pb-10">
            <Card className="sticky top-[106px] z-20 border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="p-4 flex flex-row flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                         <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-8 text-xs w-[120px] bg-white/10 border-white/20 text-white font-normal">
                                <Users className="h-3.5 w-3.5 mr-2 opacity-70" />
                                <SelectValue placeholder="Kelas" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(7).keys()].map(i => (
                                    <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-xs bg-white/10 border-white/20 text-white focus:ring-white/30" />
                            <span className="text-white/40">-</span>
                            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-xs bg-white/10 border-white/20 text-white focus:ring-white/30" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none">
                                <FileDown className="h-3.5 w-3.5" />
                                Ekspor
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport('excel')}>
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                <FileText className="mr-2 h-4 w-4 text-red-600" />
                                PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none" onClick={handlePrint}>
                            <Printer className="h-3.5 w-3.5" />
                            Cetak
                        </Button>
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
                            <Calendar className="h-4 w-4 mr-2" /> Jurnal Harian
                        </TabsTrigger>
                        <TabsTrigger 
                            value="rekap"
                            className="flex-1 rounded-t-[24px] rounded-b-none py-4 data-[state=active]:bg-card data-[state=active]:shadow-none bg-transparent text-[11px] font-bold uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary transition-all"
                        >
                            <ClipboardList className="h-4 w-4 mr-2" /> Rekapitulasi
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="bg-card rounded-b-[24px] border-x border-b shadow-sm overflow-hidden min-h-[400px]">
                    <TabsContent value="jurnal" className="m-0 p-4 border-none outline-none">
                        {attendanceError && (
                            <div className="mb-4 p-4 rounded-md bg-destructive/10 text-destructive flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5" />
                                    <div className="text-xs">
                                        <p className="font-bold">Gagal memuat data absensi</p>
                                        <p>{attendanceError.message.split('\n')[0]}</p>
                                    </div>
                                </div>
                                {indexLink && (
                                    <div className="mt-2 p-3 bg-destructive/20 rounded border border-destructive/30">
                                        <p className="text-[11px] mb-3">Kueri ini memerlukan indeks komposit. Silakan klik tombol di bawah untuk membuatnya di Konsol Firebase Anda.</p>
                                        <Button variant="destructive" size="xs" className="h-8 gap-2 font-bold" asChild>
                                            <a href={indexLink} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                BUAT INDEKS SEKARANG
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto border rounded-xl">
                                <Table className="min-w-full border-collapse">
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="sticky left-0 z-10 bg-muted/50 min-w-[150px] border-r font-bold text-[10px] uppercase">Nama Santri</TableHead>
                                            {daysInRange.map(day => (
                                                <TableHead key={day.toISOString()} className={cn(
                                                    "text-center border-r min-w-[35px] px-1 text-[10px] font-bold",
                                                    day.getDay() === 5 && "text-blue-600 bg-blue-50/50"
                                                )}>
                                                    {format(day, 'd')}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedStudents && sortedStudents.length > 0 ? sortedStudents.map(student => (
                                            <TableRow key={student.id}>
                                                <TableCell className="sticky left-0 z-10 bg-card font-bold border-r text-[11px] py-2 uppercase">{student.name}</TableCell>
                                                {daysInRange.map(day => {
                                                    const isFri = day.getDay() === 5;
                                                    const dateStr = format(day, 'yyyy-MM-dd');
                                                    const status = attendanceMap.get(`${student.id}-${dateStr}`);

                                                    return (
                                                        <TableCell 
                                                            key={dateStr} 
                                                            className={cn(
                                                                "text-center text-[10px] p-0 border-r h-8 font-mono",
                                                                isFri ? 'bg-blue-50/50 text-blue-600 font-bold' : status ? getStatusColor(status) : 'bg-muted/10'
                                                            )}
                                                        >
                                                            {isFri ? 'L' : status ? status.charAt(0) : '-'}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={daysInRange.length + 1} className="text-center h-48 italic text-muted-foreground text-xs">
                                                    Belum ada data siswa di kelas {selectedClass}.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="rekap" className="m-0 p-4 border-none outline-none">
                        {!isLoading && (
                            <div className="border rounded-2xl overflow-hidden bg-card">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="px-4 font-bold text-[10px] uppercase">Nama Santri</TableHead>
                                            <TableHead className="text-center font-bold text-[10px] uppercase text-green-700">Hadir</TableHead>
                                            <TableHead className="text-center font-bold text-[10px] uppercase text-yellow-700">Sakit</TableHead>
                                            <TableHead className="text-center font-bold text-[10px] uppercase text-blue-700">Izin</TableHead>
                                            <TableHead className="text-center font-bold text-[10px] uppercase text-red-700">Alpa</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendanceSummary.length > 0 ? (
                                            attendanceSummary.map(item => (
                                                <TableRow key={item.studentId} className="hover:bg-muted/5 transition-colors">
                                                    <TableCell className="px-4 py-3">
                                                        <p className="font-bold text-[11px] uppercase">{item.studentName}</p>
                                                        <p className="text-[9px] text-muted-foreground font-mono">{item.nis}</p>
                                                    </TableCell>
                                                    <TableCell className="text-center text-[11px] font-bold text-green-600">{item.summary.Hadir}</TableCell>
                                                    <TableCell className="text-center text-[11px] font-medium">{item.summary.Sakit}</TableCell>
                                                    <TableCell className="text-center text-[11px] font-medium">{item.summary.Izin}</TableCell>
                                                    <TableCell className="text-center text-[11px] font-bold text-red-600">{item.summary.Alpa}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground text-xs italic">
                                                    Tidak ada data ringkasan untuk ditampilkan.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {isLoading && (
                            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
