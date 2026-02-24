
"use client";

import { useState, useMemo, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
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
    const [selectedClass, setSelectedClass] = useState<string>('semua');
    
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
        const scheduleForClass = selectedClass !== 'semua' ? schedulesMap.get(parseInt(selectedClass)) : allSchedulesData?.[0];
        const firstDaySchedule = scheduleForClass?.saturday;
        
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
    }, [schedulesMap, selectedClass, allSchedulesData]);
    
    const isLoading = loadingCurriculum || loadingTeachers || loadingAllSchedules;

    const handleExportExcel = () => {
        if (isLoading) return;
        const workbook = XLSX.utils.book_new();
        const classLevels = selectedClass === 'semua' ? [...Array(7).keys()] : [parseInt(selectedClass, 10)];
        if (isNaN(classLevels[0])) return;
    
        classLevels.forEach(classLevel => {
            const dataToExport: any[] = [];
            periods.forEach(period => {
                const row: { [key: string]: any } = {
                    'Jam': `${period.startTime} - ${period.endTime} (${period.name})`
                };
                days.forEach(day => {
                    const schedule = schedulesMap.get(classLevel);
                    const periodIndex = periods.findIndex(p => p.name === period.name);
                    const entry = schedule?.[day.key]?.[periodIndex];
                    const subject = curriculumData?.find(s => s.id === entry?.subjectId);
                    const teacher = teachers?.find(t => t.id === entry?.teacherId);
                    row[day.name] = subject ? `${subject.subjectName} (${teacher?.name || '...'})` : '';
                });
                dataToExport.push(row);
            });
            
            if (dataToExport.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                XLSX.utils.book_append_sheet(workbook, worksheet, `Kelas ${classLevel}`);
            }
        });
    
        if (workbook.SheetNames.length === 0) {
            toast({ title: "Tidak ada data jadwal untuk diekspor." });
            return;
        }
        XLSX.writeFile(workbook, `jadwal_${scheduleType}_${activeYear.replace('/', '-')}.xlsx`);
    };
    
    const handleExportPdf = () => {
        if (isLoading) return;
    
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text(`Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear}`, 14, 16);
        
        const classLevels = selectedClass === 'semua' ? [...Array(7).keys()] : [parseInt(selectedClass, 10)];
        if (isNaN(classLevels[0])) return;
    
        let startY = 25;
    
        classLevels.forEach((classLevel, index) => {
            const body: any[] = [];
            periods.forEach((period) => {
                const rowData: string[] = [`${period.startTime}-${period.endTime} (${period.name})`];
                days.forEach(day => {
                    const schedule = schedulesMap.get(classLevel);
                    const periodIndex = periods.findIndex(p => p.name === period.name);
                    const entry = schedule?.[day.key]?.[periodIndex];
                    const subject = curriculumData?.find(s => s.id === entry?.subjectId);
                    const teacher = teachers?.find(t => t.id === entry?.teacherId);
                    rowData.push(subject ? `${subject.subjectName}\n(${teacher?.name || '...'})` : '');
                });
                body.push(rowData);
            });
    
            if (body.length > 0) {
                const tableHeight = (body.length + 1) * 10 + 15; // rough estimation
                if (index > 0 && startY + tableHeight > doc.internal.pageSize.getHeight() - 20) {
                    doc.addPage();
                    startY = 20;
                }
                doc.setFontSize(12);
                doc.text(`Kelas ${classLevel}`, 14, startY);
                (doc as any).autoTable({
                    head: [['Jam', ...days.map(d => d.name)]],
                    body: body,
                    startY: startY + 5,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [230, 230, 230], textColor: 20 },
                });
                startY = (doc as any).lastAutoTable.finalY + 15;
            }
        });
    
        if (startY === 25) { // no data was added
            toast({ title: "Tidak ada data jadwal untuk diekspor." });
            return;
        }
        
        doc.save(`jadwal_${scheduleType}_${activeYear.replace('/', '-')}.pdf`);
    };

    const handlePrintTable = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast({ variant: "destructive", title: "Gagal membuka jendela cetak." });
          return;
        }
    
        const tableContainerHtml = document.getElementById('schedule-table-container')?.innerHTML;
        if (!tableContainerHtml) {
            toast({ variant: "destructive", title: "Tidak ada data untuk dicetak." });
            return;
        }
        
        const content = `
          <html>
            <head>
              <title>Cetak Jadwal</title>
              <style>
                body { font-family: sans-serif; font-size: 10px; background-color: #fff; }
                @page { size: A4 landscape; margin: 15mm; }
                h1 { font-size: 16px; margin-bottom: 1rem; }
                .card { 
                    border: 1px solid #e5e7eb; 
                    border-radius: 0.5rem; 
                    margin-bottom: 1.5rem; 
                    break-inside: avoid;
                }
                .card-header { padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; }
                .card-title { font-size: 1.125rem; font-weight: 600; line-height: 1; }
                .p-0 { padding: 0 !important; }
                .overflow-x-auto { overflow-x: auto !important; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 4px; text-align: left; vertical-align: top; }
                th { background-color: #f2f2f2; }
                .font-semibold { font-weight: 600; }
                .text-primary { color: #15803d; }
                .text-xs { font-size: 9px; }
                .text-muted-foreground { color: #555; }
                .font-medium { font-weight: 500; }
                .whitespace-nowrap { white-space: nowrap; }
              </style>
            </head>
            <body>
              <h1>Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear} - Kelas: ${selectedClass === 'semua' ? 'Semua' : `Kelas ${selectedClass}`}</h1>
              ${tableContainerHtml}
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
                        Lihat jadwal pelajaran dan ujian untuk setiap kelas.
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
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Pilih kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="semua">Semua Kelas</SelectItem>
                                    {[...Array(7).keys()].map(i => (
                                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                    ))}
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
                        <ScheduleTable />
                    )}
                </CardContent>
            </Card>
        </>
    );

    function ScheduleTable() {
        const classLevelsToRender = selectedClass === 'semua' ? [...Array(7).keys()] : [parseInt(selectedClass, 10)];
    
        if (isNaN(classLevelsToRender[0])) {
            return (
                <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
                    <div className="text-center text-muted-foreground">Kelas tidak valid.</div>
                </div>
            );
        }
    
        return (
            <div id="schedule-table-container" className="space-y-6">
                {classLevelsToRender.map(classLevel => (
                    <Card key={classLevel}>
                        <CardHeader>
                            <CardTitle>Kelas {classLevel}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Jam</TableHead>
                                            {days.map(day => (
                                                <TableHead key={day.key} className="min-w-[150px] whitespace-nowrap">{day.name}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {periods.map((period, periodIndex) => {
                                            return (
                                                <TableRow key={periodIndex}>
                                                    <TableCell className="font-medium align-top whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span>{period.name}</span>
                                                            <span className="text-xs text-muted-foreground">{period.startTime} - {period.endTime}</span>
                                                        </div>
                                                    </TableCell>
                                                    {days.map(day => {
                                                        const schedule = schedulesMap.get(classLevel);
                                                        const entry = schedule?.[day.key]?.[periodIndex];
                                                        const subject = curriculumData?.find(c => c.id === entry?.subjectId);
                                                        const teacher = teachers?.find(t => t.id === entry?.teacherId);
    
                                                        return (
                                                            <TableCell key={day.key}>
                                                                {subject ? (
                                                                    <div>
                                                                        <p className="font-semibold text-primary whitespace-nowrap">{subject.subjectName}</p>
                                                                        <p className="text-xs text-muted-foreground whitespace-nowrap">{teacher?.name || '...'}</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-10"></div>
                                                                )}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }
}

    