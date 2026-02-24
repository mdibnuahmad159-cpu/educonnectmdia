
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore, query, where } from "firebase/firestore";
import type { Schedule, Curriculum, Teacher } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileDown, Printer, FileSpreadsheet, FileText } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAcademicYear } from "@/context/academic-year-provider";

const days = [
    { key: 'saturday', name: 'Sabtu' },
    { key: 'sunday', name: 'Minggu' },
    { key: 'monday', name: 'Senin' },
    { key: 'tuesday', name: 'Selasa' },
    { key: 'wednesday', name: 'Rabu' },
    { key: 'thursday', name: 'Kamis' },
] as const;

type Period = {
    name: string;
    startTime: string;
    endTime: string;
};

const initialPeriods: Period[] = [
    { name: 'Jam ke-1', startTime: '07:00', endTime: '08:30' },
    { name: 'Jam ke-2', startTime: '09:00', endTime: '10:30' },
];

export default function SchedulePage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [scheduleType, setScheduleType] = useState<'pelajaran' | 'ujian'>('pelajaran');
    
    const curriculumCollection = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculumData, loading: loadingCurriculum } = useCollection<Curriculum>(curriculumCollection);

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const allSchedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', scheduleType));
    }, [firestore, activeYear, scheduleType]);
    const { data: allSchedulesData, isLoading: loadingAllSchedules } = useCollection<Schedule>(allSchedulesQuery);

    const schedulesMap = useMemo(() => {
        const map = new Map<number, Schedule>();
        if (allSchedulesData) {
            for (const schedule of allSchedulesData) {
                map.set(schedule.classLevel, schedule);
            }
        }
        return map;
    }, [allSchedulesData]);

    const periods = useMemo(() => {
        const firstSchedule = allSchedulesData?.[0];
        const firstDaySchedule = firstSchedule?.saturday;
        
        if (firstDaySchedule && firstDaySchedule.length > 0) {
             const subjectPeriods = firstDaySchedule.filter(e => e.type === 'subject');
             const newPeriods = subjectPeriods.map((entry, index) => ({
                name: `Jam ke-${index + 1}`,
                startTime: entry.startTime,
                endTime: entry.endTime,
            }));
            if (newPeriods.length > 0) return newPeriods;
        }
        return initialPeriods;
    }, [allSchedulesData]);

    const isLoading = loadingCurriculum || loadingTeachers || loadingAllSchedules;

    const classLevels = [...Array(7).keys()]; // Kelas 0 to 6

    const getCellData = (classLevel: number, dayKey: (typeof days)[number]['key'], periodIndex: number) => {
        const schedule = schedulesMap.get(classLevel);
        const entry = schedule?.[dayKey]?.[periodIndex];
        const subject = curriculumData?.find(s => s.id === entry?.subjectId);
        const teacher = teachers?.find(t => t.id === entry?.teacherId);

        return { subject, teacher };
    };

    const handleExportExcel = () => {
        if (isLoading) return;
        
        const dataToExport: any[] = [];
        days.forEach(day => {
            periods.forEach((period, periodIndex) => {
                const row: { [key: string]: any } = {
                    'Hari': day.name,
                    'Jam': `${period.startTime} - ${period.endTime}`,
                };
                classLevels.forEach(classLevel => {
                    const { subject, teacher } = getCellData(classLevel, day.key, periodIndex);
                    row[`Kelas ${classLevel}`] = subject ? `${subject.subjectName} (${teacher?.name || '...'})` : '';
                });
                dataToExport.push(row);
            });
        });
        
        if (dataToExport.length === 0) {
            toast({ title: "Tidak ada data jadwal untuk diekspor." });
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Jadwal`);
        XLSX.writeFile(workbook, `jadwal_${scheduleType}_${activeYear.replace('/', '-')}.xlsx`);
    };
    
    const handleExportPdf = () => {
        if (isLoading) return;
    
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text(`Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear}`, 14, 16);
        
        const head = [['Hari', 'Jam', ...classLevels.map(cl => `Kelas ${cl}`)]];
        const body: string[][] = [];

        days.forEach(day => {
            periods.forEach((period, periodIndex) => {
                const row: string[] = [
                    day.name,
                    `${period.startTime} - ${period.endTime}`
                ];
                classLevels.forEach(classLevel => {
                     const { subject, teacher } = getCellData(classLevel, day.key, periodIndex);
                     row.push(subject ? `${subject.subjectName}\n(${teacher?.name || '...'})` : '');
                });
                body.push(row);
            });
        });

        if (body.length === 0) {
            toast({ title: "Tidak ada data jadwal untuk diekspor." });
            return;
        }

        (doc as any).autoTable({
            head: head,
            body: body,
            startY: 20,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
            headStyles: { fillColor: [230, 230, 230], textColor: 20, fontSize: 8 },
        });
        
        doc.save(`jadwal_${scheduleType}_${activeYear.replace('/', '-')}.pdf`);
    };

    const handlePrintTable = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast({ variant: "destructive", title: "Gagal membuka jendela cetak." });
          return;
        }
    
        const tableHtml = document.getElementById('schedule-table-main')?.outerHTML;
        if (!tableHtml) {
            toast({ variant: "destructive", title: "Tidak ada data untuk dicetak." });
            return;
        }
        
        const content = `
          <html>
            <head>
              <title>Cetak Jadwal</title>
              <style>
                body { font-family: sans-serif; font-size: 9px; background-color: #fff; }
                @page { size: A4 landscape; margin: 15mm; }
                h1 { font-size: 14px; margin-bottom: 1rem; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 3px; text-align: left; vertical-align: top; }
                th { background-color: #f2f2f2; }
                .font-semibold { font-weight: 600; }
                .text-primary { color: #15803d; }
                .text-muted-foreground { color: #555; }
              </style>
            </head>
            <body>
              <h1>Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear}</h1>
              ${tableHtml}
            </body>
          </html>
        `;
    
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Jadwal</CardTitle>
                    <CardDescription>
                        Lihat jadwal pelajaran dan ujian untuk semua kelas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                             <Tabs value={scheduleType} onValueChange={(value) => setScheduleType(value as 'pelajaran' | 'ujian')} className="w-full sm:w-auto">
                                <TabsList className="grid grid-cols-2 w-full sm:w-fit">
                                    <TabsTrigger value="pelajaran">Pelajaran</TabsTrigger>
                                    <TabsTrigger value="ujian">Ujian</TabsTrigger>
                                </TabsList>
                            </Tabs>
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
                                    <DropdownMenuItem onClick={handleExportExcel}>
                                    <FileSpreadsheet className="mr-2 h-3 w-3" />
                                    Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportPdf}>
                                    <FileText className="mr-2 h-3 w-3" />
                                    PDF
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button size="xs" variant="outline" className="gap-1" onClick={handlePrintTable}>
                                <Printer className="h-3 w-3" />
                                Cetak
                            </Button>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table id="schedule-table-main" className="min-w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Hari</TableHead>
                                        <TableHead className="w-[120px]">Jam</TableHead>
                                        {classLevels.map(cl => <TableHead key={cl} className="min-w-[150px]">Kelas {cl}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {days.map(day => (
                                        periods.map((period, periodIndex) => (
                                            <TableRow key={`${day.key}-${periodIndex}`}>
                                                {periodIndex === 0 && (
                                                    <TableCell rowSpan={periods.length} className="font-semibold align-middle text-center">
                                                        {day.name}
                                                    </TableCell>
                                                )}
                                                <TableCell className="font-medium align-top">
                                                    <div>{period.startTime}</div>
                                                    <div>{period.endTime}</div>
                                                </TableCell>
                                                {classLevels.map(classLevel => {
                                                    const { subject, teacher } = getCellData(classLevel, day.key, periodIndex);
                                                    return (
                                                        <TableCell key={classLevel}>
                                                            {subject ? (
                                                                <div>
                                                                    <p className="font-semibold text-primary">{subject.subjectName}</p>
                                                                    <p className="text-xs text-muted-foreground">{teacher?.name || '...'}</p>
                                                                </div>
                                                            ) : (
                                                                <div className="h-10"></div>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
