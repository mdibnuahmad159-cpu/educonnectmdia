
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore, query, where, orderBy } from "firebase/firestore";
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
import { Loader2, FileDown, Printer, FileSpreadsheet, FileText, Edit, Info } from "lucide-react";
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
import { cn } from "@/lib/utils";


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
    const emptyDay = periods.map(p => ({ type: 'subject' as const, startTime: p.startTime, endTime: p.endTime }));
    const id = `${classLevel}_${academicYear.replace(/\//g, '-')}_${type}`;
    return {
        id,
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
    
    // We fetch ALL schedules of this type to handle persistence across years
    const allSchedulesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'schedules'), where('type', '==', scheduleType));
    }, [firestore, scheduleType]);
    const { data: allSchedulesData, isLoading: loadingAllSchedules } = useCollection<Schedule>(allSchedulesQuery);

    // Determine the data to actually display
    const schedulesByYear = useMemo(() => {
        const map = new Map<string, Schedule[]>();
        if (allSchedulesData) {
            allSchedulesData.forEach(s => {
                const yearList = map.get(s.academicYear) || [];
                yearList.push(s);
                map.set(s.academicYear, yearList);
            });
        }
        return map;
    }, [allSchedulesData]);

    const displayYear = useMemo(() => {
        if (schedulesByYear.has(activeYear)) return activeYear;
        
        // Find latest year with data
        const sortedYears = Array.from(schedulesByYear.keys()).sort((a, b) => b.localeCompare(a));
        return sortedYears[0] || activeYear;
    }, [schedulesByYear, activeYear]);

    const schedulesMap = useMemo(() => {
        const map = new Map<number, Schedule>();
        const yearData = schedulesByYear.get(displayYear) || [];
        yearData.forEach(s => map.set(s.classLevel, s));
        return map;
    }, [schedulesByYear, displayYear]);

    const periods = useMemo(() => {
        const yearData = schedulesByYear.get(displayYear) || [];
        const firstScheduleWithEntries = yearData.find(s => s.saturday && s.saturday.length > 0);
        
        if (firstScheduleWithEntries) {
            const scheduleEntries = firstScheduleWithEntries.saturday.filter(e => e.type === 'subject');
            if (scheduleEntries.length > 0) {
                return scheduleEntries.map(p => ({ startTime: p.startTime, endTime: p.endTime })).sort((a,b) => a.startTime.localeCompare(b.startTime));
            }
        }

        // Global fallback if no data for displayYear exists either (should only happen on very first app run)
        return [
            { startTime: "07:00", endTime: "08:30" },
            { startTime: "08:30", endTime: "10:00" },
            { startTime: "10:30", endTime: "12:00" },
        ];
    }, [schedulesByYear, displayYear]);

    const isLoading = loadingCurriculum || loadingTeachers || loadingAllSchedules;
    const classLevels = [...Array(7).keys()]; // Kelas 0 to 6

    const getCellData = (classLevel: number, dayKey: DayKey, periodIndex: number) => {
        const schedule = schedulesMap.get(classLevel);
        if (!schedule) return { entry: null, subject: null, teacher: null };
        
        const daySchedule = schedule[dayKey];
        const subjectEntries = daySchedule?.filter(e => e.type === 'subject') || [];
        const entry = subjectEntries[periodIndex];
        
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
        
        // IMPORTANT: We always save to the ACTIVE YEAR, even if we are viewing inherited data
        let scheduleToUpdate = schedulesByYear.get(activeYear)?.find(s => s.classLevel === classLevel);
        
        if (!scheduleToUpdate) {
            // If no data for active year, we take the inherited data as a base template
            const inherited = schedulesMap.get(classLevel);
            if (inherited) {
                scheduleToUpdate = {
                    ...JSON.parse(JSON.stringify(inherited)),
                    id: `${classLevel}_${activeYear.replace(/\//g, '-')}_${scheduleType}`,
                    academicYear: activeYear
                };
            } else {
                scheduleToUpdate = createEmptySchedule(classLevel, activeYear, scheduleType, periods);
            }
        } else {
            scheduleToUpdate = JSON.parse(JSON.stringify(scheduleToUpdate));
        }

        if (!scheduleToUpdate[dayKey] || scheduleToUpdate[dayKey].length === 0) {
            scheduleToUpdate[dayKey] = periods.map(p => ({type: 'subject', startTime: p.startTime, endTime: p.endTime}));
        }
        
        const subjectEntries = scheduleToUpdate[dayKey].filter((e: ScheduleEntry) => e.type === 'subject');
        if (subjectEntries.length <= periodIndex) return;

        const entryToUpdate = subjectEntries[periodIndex];
        const originalIndex = scheduleToUpdate[dayKey].findIndex((e: ScheduleEntry) => e.startTime === entryToUpdate.startTime && e.endTime === entryToUpdate.endTime && e.type === 'subject');

        if (originalIndex !== -1) {
            const currentEntry = scheduleToUpdate[dayKey][originalIndex];
            const updatedEntry = { ...currentEntry };
            
            if ('subjectId' in data) {
                if (data.subjectId && data.subjectId !== 'clear') {
                    updatedEntry.subjectId = data.subjectId;
                } else {
                    delete (updatedEntry as Partial<typeof updatedEntry>).subjectId;
                }
            }
            if ('teacherId' in data) {
                if (data.teacherId && data.teacherId !== 'clear') {
                    updatedEntry.teacherId = data.teacherId;
                } else {
                    delete (updatedEntry as Partial<typeof updatedEntry>).teacherId;
                }
            }
            scheduleToUpdate[dayKey][originalIndex] = updatedEntry;
        }

        upsertSchedule(firestore, scheduleToUpdate);
        toast({ title: "Jadwal Disimpan", description: `Jadwal Kelas ${classLevel} TA ${activeYear} diperbarui.` });
    };
    
    const handleClearEntry = () => {
        handleSaveEntry({ subjectId: 'clear', teacherId: 'clear' });
    }

    const handleTimeSave = (newPeriods: { startTime: string; endTime: string }[]) => {
        if (!firestore) return;
        
        // When setting time, we apply it to the ACTIVE YEAR
        // If the active year is currently empty, we initialize it using the inherited data
        classLevels.forEach(level => {
            let scheduleToUpdate = schedulesByYear.get(activeYear)?.find(s => s.classLevel === level);
            
            if (!scheduleToUpdate) {
                const inherited = schedulesMap.get(level);
                if (inherited) {
                    scheduleToUpdate = {
                        ...JSON.parse(JSON.stringify(inherited)),
                        id: `${level}_${activeYear.replace(/\//g, '-')}_${scheduleType}`,
                        academicYear: activeYear
                    };
                } else {
                    scheduleToUpdate = createEmptySchedule(level, activeYear, scheduleType, newPeriods);
                }
            } else {
                scheduleToUpdate = JSON.parse(JSON.stringify(scheduleToUpdate));
            }

            // Update all days with new time slots
            days.forEach(day => {
                const currentDayEntries = scheduleToUpdate[day.key]?.filter((e: ScheduleEntry) => e.type === 'subject') || [];
                scheduleToUpdate[day.key] = newPeriods.map((period, index) => {
                    const existingEntry = currentDayEntries[index];
                    return {
                        type: 'subject',
                        startTime: period.startTime,
                        endTime: period.endTime,
                        subjectId: existingEntry?.subjectId || '',
                        teacherId: existingEntry?.teacherId || '',
                    };
                });
            });

            upsertSchedule(firestore, scheduleToUpdate);
        });
    
        toast({ title: "Jam Disimpan", description: `Waktu jadwal Tahun Ajaran ${activeYear} telah diperbarui.` });
    };

    const handleExport = (format: 'excel' | 'pdf') => {
        if (isLoading) return;
        const head = [['Hari', 'Jam', ...classLevels.map(cl => `Kelas ${cl}`)]];
        const body: string[][] = [];
        days.forEach(day => {
             periods.forEach((period, periodIndex) => {
                const row: string[] = [];
                if(periodIndex === 0) row.push(day.name);
                else row.push('');
                row.push(`${period.startTime} - ${period.endTime}`);
                classLevels.forEach(classLevel => {
                    const { subject, teacher } = getCellData(classLevel, day.key, periodIndex);
                    row.push(subject ? `${subject.subjectName}\n(${teacher?.name || '...'})` : '');
                });
                body.push(row);
            });
        });

        if (body.length === 0) return;
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
        } else {
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.text(`Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear}`, 14, 16);
            (doc as any).autoTable({
                head: head,
                body: body,
                startY: 20,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
                headStyles: { fillColor: [230, 230, 230], textColor: 20, fontSize: 8, fontStyle: 'bold' }
            });
            doc.save(`${exportFileName}.pdf`);
        }
    };
    
    const handlePrintTable = () => {
        if (isLoading) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const tableHeader = `<thead><tr><th>Hari</th><th>Jam</th>${classLevels.map(cl => `<th>Kelas ${cl}</th>`).join('')}</tr></thead>`;
        const bodyRows: string[] = [];
        days.forEach(day => {
            periods.forEach((period, periodIndex) => {
                let rowHtml = '<tr>';
                if (periodIndex === 0) rowHtml += `<td rowspan="${periods.length}" style="vertical-align: middle; text-align: center;">${day.name}</td>`;
                rowHtml += `<td style="text-align: center; vertical-align: middle;">${period.startTime} - ${period.endTime}</td>`;
                classLevels.forEach(classLevel => {
                    const { subject, teacher } = getCellData(classLevel, day.key, periodIndex);
                    rowHtml += `<td>${subject ? `${subject.subjectName}<br/>(${teacher?.name || '...'})` : ''}</td>`;
                });
                rowHtml += '</tr>';
                bodyRows.push(rowHtml);
            });
        });
        printWindow.document.write(`
          <html>
            <head><title>Cetak Jadwal</title><style>body { font-family: sans-serif; font-size: 8px; } @page { size: A4 landscape; margin: 15mm; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 4px; text-align: left; vertical-align: top; } th { background-color: #f0f0f0; font-weight: bold; }</style></head>
            <body><h1>Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - TA ${activeYear}</h1><table>${tableHeader}<tbody>${bodyRows.join('')}</tbody></table></body>
          </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
    };

    const initialEntryData = editContext ? getCellData(editContext.classLevel, editContext.dayKey, editContext.periodIndex).entry || {} : {};

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Jadwal</CardTitle>
                    <CardDescription>
                        Kelola jadwal pelajaran/ujian. Jadwal akan tetap ada meskipun tahun ajaran berganti sampai Admin mengubahnya.
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

                    {displayYear !== activeYear && !isLoading && (
                        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 flex items-center gap-3">
                            <Info className="h-5 w-5 shrink-0" />
                            <div className="text-xs">
                                <p className="font-bold">Menampilkan Jadwal Warisan (Tahun {displayYear})</p>
                                <p>Jadwal untuk tahun {activeYear} belum ada. Anda dapat mengedit salah satu sel untuk menyalin jadwal ini ke tahun ajaran baru.</p>
                            </div>
                        </div>
                    )}

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
                                                    <TableCell rowSpan={periods.length} className="font-semibold align-middle text-center border border-border bg-muted/5">
                                                        {day.name}
                                                    </TableCell>
                                                )}
                                                <TableCell className="font-medium align-middle text-center border border-border">
                                                    <div className="text-[10px]">{period.startTime}</div>
                                                    <div className="text-[9px] opacity-30">-</div>
                                                    <div className="text-[10px]">{period.endTime}</div>
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
                                                                className={cn(
                                                                    "w-full h-full text-left p-2 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring rounded-sm transition-colors",
                                                                    displayYear !== activeYear && "bg-blue-50/20"
                                                                )}
                                                            >
                                                                <div className="min-h-[40px]">
                                                                    {subject ? (
                                                                        <div>
                                                                            <p className="font-semibold text-primary text-[10px] leading-tight mb-0.5">{subject.subjectName}</p>
                                                                            <p className="text-[9px] text-muted-foreground truncate">{teacher?.name || '...'}</p>
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
