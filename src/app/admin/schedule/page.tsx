
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore, query, where } from "firebase/firestore";
import type { Schedule, ScheduleEntry, Curriculum, Teacher } from "@/types";
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
import { Loader2, FileDown, Printer, FileSpreadsheet, FileText, Edit } from "lucide-react";
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
import { TimeSettingsForm } from "./components/time-settings-form";
import { upsertSchedule } from "@/lib/firebase-helpers";
import { ScheduleEntryForm } from "./components/schedule-entry-form";

const days = [
    { key: 'saturday', name: 'Sabtu' },
    { key: 'sunday', name: 'Minggu' },
    { key: 'monday', name: 'Senin' },
    { key: 'tuesday', name: 'Selasa' },
    { key: 'wednesday', name: 'Rabu' },
    { key: 'thursday', name: 'Kamis' },
] as const;

type DayKey = (typeof days)[number]['key'];

export type EditContext = {
    classLevel: number;
    dayKey: DayKey;
    periodIndex: number;
};

const createEmptySchedule = (classLevel: number, academicYear: string, type: 'pelajaran' | 'ujian', periods: {startTime: string, endTime: string}[]): Schedule => {
    const emptyDay = periods.map(p => ({ type: 'subject' as const, startTime: p.startTime, endTime: p.endTime, subjectId: '', teacherId: '' }));
    return {
        id: `${classLevel}_${academicYear.replace(/\//g, '-')}_${type}`,
        classLevel,
        academicYear,
        type,
        saturday: [...emptyDay],
        sunday: [...emptyDay],
        monday: [...emptyDay],
        tuesday: [...emptyDay],
        wednesday: [...emptyDay],
        thursday: [...emptyDay],
    };
};

export default function SchedulePage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [scheduleType, setScheduleType] = useState<'pelajaran' | 'ujian'>('pelajaran');
    const [isTimeFormOpen, setIsTimeFormOpen] = useState(false);
    const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
    const [editContext, setEditContext] = useState<EditContext | null>(null);

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
        if (!allSchedulesData || allSchedulesData.length === 0) {
            // Default periods if no schedule exists yet for the current year/type
            return [];
        }

        const firstScheduleWithEntries = allSchedulesData.find(s => s.saturday && s.saturday.length > 0);
        const scheduleEntries = firstScheduleWithEntries?.saturday?.filter(e => e.type === 'subject') || [];
        
        if (scheduleEntries.length > 0) {
            return scheduleEntries.map(p => ({ startTime: p.startTime, endTime: p.endTime })).sort((a,b) => a.startTime.localeCompare(b.startTime));
        }

        return [];
    }, [allSchedulesData]);

    const isLoading = loadingCurriculum || loadingTeachers || loadingAllSchedules;
    const classLevels = [...Array(7).keys()]; // Kelas 0 to 6

    const getCellData = (classLevel: number, dayKey: DayKey, periodIndex: number) => {
        const schedule = schedulesMap.get(classLevel);
        const entry = schedule?.[dayKey]?.filter(e => e.type === 'subject')[periodIndex];
        
        if (!entry || !curriculumData || !teachers) {
            return { entry: null, subject: null, teacher: null };
        }

        const subject = curriculumData.find(s => s.id === entry.subjectId);
        const teacher = teachers.find(t => t.id === entry.teacherId);

        return { entry, subject, teacher };
    };

    const handleCellClick = (classLevel: number, dayKey: DayKey, periodIndex: number) => {
        setEditContext({ classLevel, dayKey, periodIndex });
        setIsEntryFormOpen(true);
    };

    const handleSaveEntry = (data: { subjectId?: string; teacherId?: string }) => {
        if (!firestore || !editContext) return;

        const { classLevel, dayKey, periodIndex } = editContext;
        
        let scheduleToUpdate = schedulesMap.get(classLevel);
        if (!scheduleToUpdate) {
            scheduleToUpdate = createEmptySchedule(classLevel, activeYear, scheduleType, periods);
        } else {
            scheduleToUpdate = JSON.parse(JSON.stringify(scheduleToUpdate)); // Deep copy
        }

        if (!scheduleToUpdate[dayKey] || scheduleToUpdate[dayKey].length === 0) {
            scheduleToUpdate[dayKey] = periods.map(p => ({type: 'subject', startTime: p.startTime, endTime: p.endTime, subjectId: '', teacherId: ''}));
        }
        
        const subjectEntries = scheduleToUpdate[dayKey].filter((e: ScheduleEntry) => e.type === 'subject');
        
        if (subjectEntries.length <= periodIndex) return;

        const entryToUpdate = subjectEntries[periodIndex];

        // Find the original index in the full schedule array which might include breaks
        const originalIndex = scheduleToUpdate[dayKey].findIndex((e: ScheduleEntry) => e.startTime === entryToUpdate.startTime && e.endTime === entryToUpdate.endTime && e.type === 'subject');

        if (originalIndex !== -1) {
            const currentEntry = scheduleToUpdate[dayKey][originalIndex];
            
            const updatedEntry = { ...currentEntry };
            
            if (data.subjectId) {
                updatedEntry.subjectId = data.subjectId;
            } else {
                delete (updatedEntry as Partial<typeof updatedEntry>).subjectId;
            }

            if (data.teacherId) {
                updatedEntry.teacherId = data.teacherId;
            } else {
                 delete (updatedEntry as Partial<typeof updatedEntry>).teacherId;
            }
            
            scheduleToUpdate[dayKey][originalIndex] = updatedEntry;
        }

        upsertSchedule(firestore, scheduleToUpdate);
        toast({ title: "Jadwal Disimpan", description: `Jadwal untuk Kelas ${classLevel} telah diperbarui.` });
    };
    
    const handleClearEntry = () => {
        handleSaveEntry({ subjectId: '', teacherId: '' });
    }

    const handleTimeSave = (newPeriods: { startTime: string; endTime: string }[]) => {
        if (!firestore) return;
    
        const updatedSchedules: Schedule[] = [];
    
        // Update existing schedules
        for (const schedule of schedulesMap.values()) {
            const newSchedule = JSON.parse(JSON.stringify(schedule));
            days.forEach(day => {
                const currentDayEntries = newSchedule[day.key]?.filter((e: ScheduleEntry) => e.type === 'subject') || [];
                const newDayEntries: ScheduleEntry[] = newPeriods.map((period, index) => {
                    const existingEntry = currentDayEntries[index];
                    return {
                        type: 'subject',
                        startTime: period.startTime,
                        endTime: period.endTime,
                        subjectId: existingEntry?.subjectId || '',
                        teacherId: existingEntry?.teacherId || '',
                    };
                });
                newSchedule[day.key] = newDayEntries;
            });
            updatedSchedules.push(newSchedule);
        }
    
        // Create schedules for classes that don't have one yet
        classLevels.forEach(level => {
            if (!schedulesMap.has(level)) {
                updatedSchedules.push(createEmptySchedule(level, activeYear, scheduleType, newPeriods));
            }
        });
        
        updatedSchedules.forEach(schedule => upsertSchedule(firestore, schedule));
    
        toast({ title: "Jam Disimpan", description: "Waktu jadwal telah diperbarui untuk semua kelas." });
    };

    const handleExport = (format: 'excel' | 'pdf') => {
        if (isLoading) return;

        const head = [['Hari', 'Jam', ...classLevels.map(cl => `Kelas ${cl}`)]];
        const body: string[][] = [];

        days.forEach(day => {
             periods.forEach((period, periodIndex) => {
                const row: string[] = [];
                 if(periodIndex === 0) {
                     row.push(day.name);
                 } else {
                     row.push('');
                 }
                row.push(`${period.startTime} - ${period.endTime}`);
               
                classLevels.forEach(classLevel => {
                    const { subject, teacher } = getCellData(classLevel, day.key, periodIndex);
                    row.push(subject ? `${subject.subjectName}\n(${teacher?.name || '...'})` : '');
                });
                body.push(row);
            });
             if (days.length > 1) {
                // Add a visual separator in the data for PDF/Excel if needed, or handle in styling
             }
        });

        if (body.length === 0) {
            toast({ title: "Tidak ada data jadwal untuk diekspor." });
            return;
        }

        const exportFileName = `jadwal_${scheduleType}_${activeYear.replace('/', '-')}`;

        if (format === 'excel') {
            const dataToExport: any[] = [];
            days.forEach(day => {
                 periods.forEach((period, periodIndex) => {
                    const rowData: {[key: string]: string} = { 'Hari': day.name, 'Jam': `${period.startTime} - ${period.endTime}`};
                    classLevels.forEach(classLevel => {
                         const { subject, teacher } = getCellData(classLevel, day.key, periodIndex);
                         rowData[`Kelas ${classLevel}`] = subject ? `${subject.subjectName} (${teacher?.name || '...'})` : '';
                    });
                    dataToExport.push(rowData);
                });
            });

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `Jadwal`);
            XLSX.writeFile(workbook, `${exportFileName}.xlsx`);
        } else if (format === 'pdf') {
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.text(`Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear}`, 14, 16);
            (doc as any).autoTable({
                head: head,
                body: body,
                startY: 20,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
                headStyles: { fillColor: [230, 230, 230], textColor: 20, fontSize: 8, fontStyle: 'bold' },
                 didParseCell: function (data: any) {
                    if (data.row.index > 0 && data.column.index === 0 && data.cell.raw !== '') {
                        data.cell.styles.valign = 'middle';
                        data.cell.styles.halign = 'center';
                    }
                },
                didDrawCell: (data: any) => {
                     if (data.row.index === 0) return; // Skip header
                     if (data.column.index === 0 && data.cell.raw !== "") {
                        // This logic is tricky with autoTable's rendering.
                        // A simpler way is to handle rowSpans pre-generation if the library supports it,
                        // or just leave it as is, which is what this code does.
                     }
                }
            });
            doc.save(`${exportFileName}.pdf`);
        }
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
                th, td { border: 1px solid #ddd; padding: 4px; text-align: left; vertical-align: top; white-space: normal; }
                th { background-color: #f2f2f2; font-weight: bold; }
                td.schedule-cell { height: 40px; }
                .font-semibold { font-weight: 600; }
                .text-primary { color: #15803d; }
                .text-xs { font-size: 8px; }
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

    const initialEntryData = editContext ? getCellData(editContext.classLevel, editContext.dayKey, editContext.periodIndex).entry || {} : {};

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Jadwal</CardTitle>
                    <CardDescription>
                        Lihat dan kelola jadwal pelajaran atau ujian untuk semua kelas. Klik pada sel untuk mengedit.
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
                             <Button size="xs" variant="outline" className="gap-1" onClick={() => setIsTimeFormOpen(true)}>
                                <Edit className="h-3 w-3" />
                                Atur Jam
                            </Button>
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
                           <Table id="schedule-table-main" className="min-w-full border-collapse border border-border">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px] min-w-[100px] border border-border">Hari</TableHead>
                                        <TableHead className="w-[120px] min-w-[120px] border border-border">Jam</TableHead>
                                        {classLevels.map(cl => <TableHead key={cl} className="w-[180px] min-w-[180px] border border-border text-center">Kelas {cl}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                               <TableBody>
                                    {days.map(day => (
                                        periods.map((period, periodIndex) => (
                                            <TableRow key={`${day.key}-${periodIndex}`}>
                                                {periodIndex === 0 && (
                                                    <TableCell rowSpan={periods.length} className="font-semibold align-middle text-center border border-border">
                                                        {day.name}
                                                    </TableCell>
                                                )}
                                                <TableCell className="font-medium align-middle text-center border border-border">
                                                    <div>{period.startTime}</div>
                                                    <div>-</div>
                                                    <div>{period.endTime}</div>
                                                </TableCell>
                                                {classLevels.map(classLevel => {
                                                    const { subject, teacher } = getCellData(classLevel, day.key, periodIndex);
                                                    return (
                                                        <TableCell 
                                                            key={classLevel}
                                                            className="p-0 border border-border align-top"
                                                        >
                                                            <button 
                                                                onClick={() => handleCellClick(classLevel, day.key, periodIndex)}
                                                                className="w-full h-full text-left p-2 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
                                                                aria-label={`Edit jadwal kelas ${classLevel} hari ${day.name} jam ${periodIndex + 1}`}
                                                            >
                                                                <div className="min-h-[40px]">
                                                                    {subject ? (
                                                                        <div>
                                                                            <p className="font-semibold text-primary text-xs whitespace-nowrap">{subject.subjectName}</p>
                                                                            <p className="text-xs text-muted-foreground whitespace-nowrap">{teacher?.name || '...'}</p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="h-10"></div>
                                                                    )}
                                                                </div>
                                                            </button>
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

            <TimeSettingsForm 
                isOpen={isTimeFormOpen}
                setIsOpen={setIsTimeFormOpen}
                initialPeriods={periods}
                onSave={handleTimeSave}
            />

            {editContext && (
                 <ScheduleEntryForm
                    isOpen={isEntryFormOpen}
                    setIsOpen={setIsEntryFormOpen}
                    context={editContext}
                    initialData={initialEntryData as { subjectId?: string; teacherId?: string }}
                    curriculumData={curriculumData || []}
                    teachers={teachers || []}
                    onSave={handleSaveEntry}
                    onClear={handleClearEntry}
                />
            )}
        </>
    );
}
