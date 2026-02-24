
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, Firestore, query, where, writeBatch, getDocs } from "firebase/firestore";
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
import { Loader2, Clock, FileDown, Printer, FileSpreadsheet, FileText, Upload, Download, FileUp } from "lucide-react";
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
import { upsertSchedule } from "@/lib/firebase-helpers";
import { ScheduleEntryForm, TimeSettingsForm, type EditingSlot, type Period } from "./components/schedule-entry-form";

const days = [
    { key: 'saturday', name: 'Sabtu' },
    { key: 'sunday', name: 'Minggu' },
    { key: 'monday', name: 'Senin' },
    { key: 'tuesday', name: 'Selasa' },
    { key: 'wednesday', name: 'Rabu' },
    { key: 'thursday', name: 'Kamis' },
] as const;

const initialPeriods: Period[] = [
    { name: 'Jam ke-1', startTime: '07:00', endTime: '08:30', type: 'subject', isEditable: true },
    { name: 'Jam ke-2', startTime: '09:00', endTime: '10:30', type: 'subject', isEditable: true },
];

const initialScheduleData: Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> = {
    saturday: initialPeriods.map(p => ({ type: p.type, startTime: p.startTime, endTime: p.endTime })),
    sunday: initialPeriods.map(p => ({ type: p.type, startTime: p.startTime, endTime: p.endTime })),
    monday: initialPeriods.map(p => ({ type: p.type, startTime: p.startTime, endTime: p.endTime })),
    tuesday: initialPeriods.map(p => ({ type: p.type, startTime: p.startTime, endTime: p.endTime })),
    wednesday: initialPeriods.map(p => ({ type: p.type, startTime: p.startTime, endTime: p.endTime })),
    thursday: initialPeriods.map(p => ({ type: p.type, startTime: p.startTime, endTime: p.endTime })),
};


export default function SchedulePage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [scheduleType, setScheduleType] = useState<'pelajaran' | 'ujian'>('pelajaran');
    const [selectedClass, setSelectedClass] = useState<string>('semua');
    
    const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
    const [isTimeFormOpen, setIsTimeFormOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
    const [periods, setPeriods] = useState(initialPeriods);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        const firstScheduleWithData = allSchedulesData?.find(s => s.saturday && s.saturday.length > 0);
        if (firstScheduleWithData?.saturday) {
             const subjectPeriods = firstScheduleWithData.saturday.filter(e => e.type === 'subject');
             const newPeriods = subjectPeriods.map((entry, index) => ({
                name: `Jam ke-${index + 1}`,
                startTime: entry.startTime,
                endTime: entry.endTime,
                type: 'subject',
                isEditable: true
            }));
            if (newPeriods.length > 0) {
                 setPeriods(newPeriods);
            }
        } else {
            setPeriods(initialPeriods);
        }
    }, [allSchedulesData]);

    const handleEdit = (classLevel: number, dayKey: typeof days[number]['key'], periodIndex: number) => {
        const scheduleForEdit = schedulesMap.get(classLevel);
        const currentEntry = scheduleForEdit?.[dayKey]?.[periodIndex] || initialScheduleData[dayKey][periodIndex];
        setEditingSlot({ classLevel, day: dayKey, periodIndex, entry: currentEntry });
        setIsEntryFormOpen(true);
    };
    
    const handleSaveEntry = (slot: EditingSlot, updatedData: { subjectId?: string, teacherId?: string }) => {
        if (!firestore || !activeYear) return;
    
        const scheduleIdToUpdate = `${slot.classLevel}_${activeYear.replace('/', '-')}_${scheduleType}`;
        const currentSchedule = schedulesMap.get(slot.classLevel);
    
        const newSchedule: Schedule = currentSchedule ?? {
            id: scheduleIdToUpdate,
            classLevel: slot.classLevel,
            academicYear: activeYear,
            type: scheduleType,
            ...JSON.parse(JSON.stringify(initialScheduleData))
        };
        
        days.forEach(day => {
            if (!newSchedule[day.key] || newSchedule[day.key].length !== periods.length) {
                newSchedule[day.key] = periods.map(p => ({
                    type: p.type,
                    startTime: p.startTime,
                    endTime: p.endTime,
                }));
            }
        });
    
        const updatedDaySchedule = [...(newSchedule[slot.day])];
        const updatedEntry: ScheduleEntry = { ...updatedDaySchedule[slot.periodIndex] };

        if (updatedData.subjectId) {
            updatedEntry.subjectId = updatedData.subjectId;
        } else {
            delete updatedEntry.subjectId;
        }
    
        if (updatedData.teacherId) {
            updatedEntry.teacherId = updatedData.teacherId;
        } else {
            delete updatedEntry.teacherId;
        }
    
        updatedDaySchedule[slot.periodIndex] = updatedEntry;
    
        const finalSchedule = { ...newSchedule, [slot.day]: updatedDaySchedule };
    
        upsertSchedule(firestore, finalSchedule);
        toast({ title: "Jadwal Diperbarui", description: "Perubahan jadwal telah disimpan." });
        setIsEntryFormOpen(false);
        setEditingSlot(null);
    };

    const handleSaveTimes = async (updatedPeriods: Period[]) => {
        setPeriods(updatedPeriods);
    
        if (!activeYear || !firestore) return;

        toast({ title: "Menyimpan Perubahan Jam...", description: "Perubahan ini akan diterapkan ke semua kelas."});

        const batch = writeBatch(firestore);
        const classLevelsToUpdate = [...Array(7).keys()];

        for (const classLevel of classLevelsToUpdate) {
            const scheduleId = `${classLevel}_${activeYear.replace('/', '-')}_${scheduleType}`;
            const scheduleRef = doc(firestore, 'schedules', scheduleId);
            const currentSchedule = schedulesMap.get(classLevel);

            const newScheduleData: Schedule = currentSchedule ?? {
                id: scheduleId,
                classLevel: classLevel,
                academicYear: activeYear,
                type: scheduleType,
                ...JSON.parse(JSON.stringify(initialScheduleData))
            };

            const scheduleToUpdate = { ...newScheduleData };

            days.forEach(day => {
                 const existingSubjectEntries = scheduleToUpdate[day.key]?.filter(e => e.type === 'subject') || [];
                
                 scheduleToUpdate[day.key] = updatedPeriods.map((period, index) => {
                    const existingEntry = existingSubjectEntries[index] || {};
                    return {
                        ...existingEntry,
                        type: 'subject',
                        startTime: period.startTime,
                        endTime: period.endTime,
                    };
                });
            });
            batch.set(scheduleRef, scheduleToUpdate, { merge: true });
        }
        
        await batch.commit();
        toast({ title: "Jam Diperbarui", description: "Waktu jadwal telah disimpan untuk semua kelas." });
    }

    const subjectsForClass = useMemo(() => {
        if (!curriculumData || !editingSlot) return [];
        return curriculumData.filter(c => c.classLevel === editingSlot.classLevel);
    }, [curriculumData, editingSlot]);
    
    const isLoading = loadingCurriculum || loadingTeachers || loadingAllSchedules;

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([{}], { header: ['Kelas (0-6)', 'Hari (Sabtu, Minggu, Senin, Selasa, Rabu, Kamis)', 'Sesi (Jam ke-1/Jam ke-2)', 'Nama Mapel', 'Nama Guru'] });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Jadwal');
        XLSX.writeFile(workbook, 'template_jadwal.xlsx');
    };

    const handleImportSchedules = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !firestore || !teachers || !curriculumData) {
            toast({ variant: 'destructive', title: 'Gagal', description: 'Data guru atau kurikulum belum dimuat.' });
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    toast({ variant: "destructive", title: "File Kosong", description: "File Excel yang Anda unggah tidak berisi data." });
                    return;
                }

                toast({ title: "Mengimpor Jadwal...", description: `Memproses ${json.length} baris data.` });

                const schedulesToUpdate = new Map<string, Schedule>();
                const dayKeyMap = new Map(days.map(d => [d.name.toLowerCase(), d.key]));
                const periodIndexMap = new Map(periods.map((p, i) => [p.name, i]));
                let successCount = 0;
                let errorCount = 0;

                const existingSchedulesQuery = query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', scheduleType));
                const existingSchedulesSnap = await getDocs(existingSchedulesQuery);
                existingSchedulesSnap.forEach(doc => {
                    schedulesToUpdate.set(doc.id, doc.data() as Schedule);
                });

                for (const item of json) {
                    const classLevel = item['Kelas (0-6)'];
                    const dayName = item['Hari (Sabtu, Minggu, Senin, Selasa, Rabu, Kamis)'];
                    const sessionName = item['Sesi (Jam ke-1/Jam ke-2)'];
                    const subjectName = item['Nama Mapel'];
                    const teacherName = item['Nama Guru'];

                    if (classLevel === undefined || !dayName || !sessionName) {
                        errorCount++;
                        continue;
                    }

                    const dayKey = dayKeyMap.get(String(dayName).toLowerCase());
                    const periodIndex = periodIndexMap.get(sessionName);

                    if (!dayKey || periodIndex === undefined || periods[periodIndex].type !== 'subject') {
                        errorCount++;
                        continue;
                    }

                    const subject = subjectName ? curriculumData.find(c => c.subjectName === subjectName && c.classLevel === classLevel) : null;
                    const teacher = teacherName ? teachers.find(t => t.name === teacherName) : null;

                    const scheduleId = `${classLevel}_${activeYear.replace('/', '-')}_${scheduleType}`;
                    let schedule = schedulesToUpdate.get(scheduleId);
                    if (!schedule) {
                        schedule = {
                            id: scheduleId,
                            classLevel: classLevel,
                            academicYear: activeYear,
                            type: scheduleType,
                            ...JSON.parse(JSON.stringify(initialScheduleData))
                        };
                    }

                    const daySchedule = schedule[dayKey];
                    if (daySchedule && daySchedule[periodIndex]) {
                        daySchedule[periodIndex].subjectId = subject?.id || undefined;
                        daySchedule[periodIndex].teacherId = teacher?.id || undefined;
                        successCount++;
                    } else {
                        errorCount++;
                    }
                    
                    schedulesToUpdate.set(scheduleId, schedule);
                }
                
                if (schedulesToUpdate.size > 0) {
                    const batch = writeBatch(firestore);
                    schedulesToUpdate.forEach(schedule => {
                        const scheduleRef = doc(firestore, 'schedules', schedule.id);
                        batch.set(scheduleRef, schedule, { merge: true });
                    });
                    await batch.commit();
                }

                toast({ title: "Impor Selesai", description: `${successCount} slot jadwal berhasil diproses. ${errorCount} gagal.` });

            } catch (error) {
                toast({ variant: "destructive", title: "Gagal Membaca File", description: "Tidak dapat memproses file Excel." });
                console.error(error);
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportExcel = () => {
        if (isLoading) return;
        const dataToExport: any[] = [];
        
        const classLevels = selectedClass === 'semua' ? [...Array(7).keys()] : [parseInt(selectedClass, 10)];
        
        if (isNaN(classLevels[0])) return;

        periods.forEach(period => {
            if(period.type === 'break') return;

            classLevels.forEach(classLevel => {
                const row: {[key: string]: any} = {
                    'Jam': `${period.startTime}-${period.endTime}`,
                    'Kelas': `Kelas ${classLevel}`
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
        });

        if (dataToExport.length === 0) {
            toast({ title: "Tidak ada data jadwal untuk diekspor." });
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal');
        XLSX.writeFile(workbook, `jadwal_${scheduleType}_${activeYear.replace('/', '-')}.xlsx`);
    };

    const handleExportPdf = () => {
        if (isLoading) return;

        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text(`Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear}`, 14, 16);
        
        const classLevels = selectedClass === 'semua' ? [...Array(7).keys()] : [parseInt(selectedClass, 10)];
        if (isNaN(classLevels[0])) return;

        const body: any[] = [];
        
        periods.forEach((period) => {
            if(period.type === 'break') return;

            classLevels.forEach(classLevel => {
                 const rowData: string[] = [`${period.startTime}-${period.endTime}`, `Kelas ${classLevel}`];
                 days.forEach(day => {
                    const schedule = schedulesMap.get(classLevel);
                    const periodIndex = periods.findIndex(p => p.name === period.name);
                    const entry = schedule?.[day.key]?.[periodIndex];
                    const subject = curriculumData?.find(s => s.id === entry?.subjectId);
                    const teacher = teachers?.find(t => t.id === entry?.teacherId);
                    rowData.push(subject ? `${subject.subjectName}\n${teacher?.name || ''}` : '');
                 });
                 body.push(rowData);
            });
        });
        
        if (body.length === 0) {
            toast({ title: "Tidak ada data jadwal untuk diekspor." });
            return;
        }

        (doc as any).autoTable({
            head: [['Jam', 'Kelas', ...days.map(d => d.name)]],
            body: body,
            startY: 20,
        });
        doc.save(`jadwal_${scheduleType}_${activeYear.replace('/', '-')}.pdf`);
    };

    const handlePrintTable = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast({ variant: "destructive", title: "Gagal membuka jendela cetak." });
          return;
        }
    
        const tableHtml = document.getElementById('schedule-table-container')?.innerHTML;
    
        const content = `
          <html>
            <head>
              <title>Cetak Jadwal</title>
              <style>
                body { font-family: sans-serif; font-size: 10px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 4px; text-align: left; vertical-align: top; }
                th { background-color: #f2f2f2; }
                .font-semibold { font-weight: 600; }
                .text-primary { color: #15803d; }
                .text-xs { font-size: 9px; }
                .text-muted-foreground { color: #555; }
                .font-medium { font-weight: 500; }
                .align-top { vertical-align: top; }
                .text-center { text-align: center; }
                .bg-muted\\/50 { background-color: #f9f9f9; }
                .italic { font-style: italic; }
              </style>
            </head>
            <body>
              <h1>Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear}</h1>
              ${tableHtml || '<p>Tidak ada data untuk dicetak.</p>'}
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
                        Kelola jadwal pelajaran dan ujian untuk setiap kelas. Klik pada slot untuk mengedit.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                             <Tabs value={scheduleType} onValueChange={(value) => setScheduleType(value as 'pelajaran' | 'ujian')} className="w-full sm:w-auto">
                                <TabsList className="grid grid-cols-2 w-full sm:w-fit">
                                    <TabsTrigger value="pelajaran">Jadwal Pelajaran</TabsTrigger>
                                    <TabsTrigger value="ujian">Jadwal Ujian</TabsTrigger>
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
                                    <FileUp className="h-3 w-3" />
                                    Impor
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleDownloadTemplate}>
                                    <Download className="mr-2 h-3 w-3" />
                                    Unduh Template
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-3 w-3" />
                                    Unggah Excel
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={handleImportSchedules}
                            />
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
                            <Button size="xs" onClick={() => setIsTimeFormOpen(true)} className="gap-1">
                                <Clock className="h-3 w-3"/>
                                Atur Jam
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
            {editingSlot && (
                <ScheduleEntryForm 
                    isOpen={isEntryFormOpen}
                    setIsOpen={setIsEntryFormOpen}
                    editingSlot={editingSlot}
                    onSave={handleSaveEntry}
                    subjects={subjectsForClass}
                    teachers={teachers || []}
                />
            )}
             <TimeSettingsForm
                isOpen={isTimeFormOpen}
                setIsOpen={setIsTimeFormOpen}
                initialPeriods={periods}
                onSave={handleSaveTimes}
            />
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
            <div id="schedule-table-container" className="overflow-x-auto">
                 <Table className="min-w-full border">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Jam</TableHead>
                            <TableHead className="w-[80px]">Kelas</TableHead>
                            {days.map(day => (
                                <TableHead key={day.key} className="min-w-[150px]">{day.name}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {periods.map((period, periodIndex) => {
                            return classLevelsToRender.map((classLevel, classIndex) => (
                                <TableRow key={`${periodIndex}-${classLevel}`}>
                                    {classIndex === 0 && (
                                         <TableCell rowSpan={classLevelsToRender.length} className="font-medium align-top">
                                            <div className="flex flex-col">
                                                <span>{period.name}</span>
                                                <span className="text-xs text-muted-foreground">{period.startTime} - {period.endTime}</span>
                                            </div>
                                         </TableCell>
                                    )}
                                    <TableCell className="font-semibold">{`Kelas ${classLevel}`}</TableCell>
                                    {days.map(day => {
                                        const schedule = schedulesMap.get(classLevel);
                                        const entry = schedule?.[day.key]?.[periodIndex];
                                        const subject = curriculumData?.find(c => c.id === entry?.subjectId);
                                        const teacher = teachers?.find(t => t.id === entry?.teacherId);

                                        return (
                                            <TableCell 
                                                key={day.key} 
                                                className="cursor-pointer hover:bg-muted transition-colors"
                                                onClick={() => handleEdit(classLevel, day.key, periodIndex)}
                                            >
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
                            ));
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    }
}
