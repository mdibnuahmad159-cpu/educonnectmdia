
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
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
    TabsContent,
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
    { key: 'sunday', name: 'Ahad' },
    { key: 'monday', name: 'Senin' },
    { key: 'tuesday', name: 'Selasa' },
    { key: 'wednesday', name: 'Rabu' },
    { key: 'thursday', name: 'Kamis' },
] as const;

const initialPeriods: Period[] = [
    { name: 'Jam ke-1', startTime: '07:00', endTime: '08:30', type: 'subject', isEditable: true },
    { name: 'Istirahat', startTime: '08:30', endTime: '09:00', type: 'break', isEditable: true },
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
    
    const scheduleId = useMemo(() => {
        if (!selectedClass || !activeYear || selectedClass === 'semua') return null;
        return `${selectedClass}_${activeYear.replace('/', '-')}_${scheduleType}`;
    }, [selectedClass, activeYear, scheduleType]);

    const scheduleRef = useMemoFirebase(() => scheduleId ? doc(firestore, 'schedules', scheduleId) : null, [scheduleId]);
    const { data: scheduleData, isLoading: loadingSchedule } = useDoc<Schedule>(scheduleRef);

    const allSchedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear || selectedClass !== 'semua') return null;
        return query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', scheduleType));
    }, [firestore, activeYear, scheduleType, selectedClass]);
    const { data: allSchedulesData, isLoading: loadingAllSchedules } = useCollection<Schedule>(allSchedulesQuery);

    useEffect(() => {
        const scheduleSource = selectedClass === 'semua' ? allSchedulesData?.[0] : scheduleData;
        if (scheduleSource?.saturday && scheduleSource.saturday.length === periods.length) {
            const newPeriods = periods.map((p, index) => ({
                ...p,
                startTime: scheduleSource.saturday[index].startTime,
                endTime: scheduleSource.saturday[index].endTime,
            }));
            setPeriods(newPeriods);
        } else if (selectedClass !== 'semua') {
            setPeriods(initialPeriods);
        }
    }, [scheduleData, allSchedulesData, selectedClass]);


    const handleEdit = (classLevel: number, dayKey: typeof days[number]['key'], periodIndex: number) => {
        let scheduleForEdit;
        if (selectedClass === 'semua') {
            scheduleForEdit = allSchedulesData?.find(s => s.classLevel === classLevel);
        } else {
            scheduleForEdit = scheduleData;
        }
        const currentEntry = scheduleForEdit?.[dayKey]?.[periodIndex] || initialScheduleData[dayKey][periodIndex];
        setEditingSlot({ classLevel, day: dayKey, periodIndex, entry: currentEntry });
        setIsEntryFormOpen(true);
    };

    const handleSaveEntry = (slot: EditingSlot, updatedData: { subjectId?: string, teacherId?: string }) => {
        if (!firestore || !activeYear) return;
    
        const scheduleIdToUpdate = `${slot.classLevel}_${activeYear.replace('/', '-')}_${scheduleType}`;
        
        let currentSchedule;
        if (String(slot.classLevel) === selectedClass) {
            currentSchedule = scheduleData;
        } else {
            currentSchedule = allSchedulesData?.find(s => s.classLevel === slot.classLevel);
        }
    
        const newSchedule: Schedule = currentSchedule ?? {
            id: scheduleIdToUpdate,
            classLevel: slot.classLevel,
            academicYear: activeYear,
            type: scheduleType,
            ...initialScheduleData
        };
    
        const updatedDaySchedule = [...newSchedule[slot.day]];
        
        const updatedEntry: Partial<ScheduleEntry> = {
            ...updatedDaySchedule[slot.periodIndex],
            subjectId: updatedData.subjectId,
            teacherId: updatedData.teacherId,
        };
    
        if (!updatedEntry.subjectId) {
            delete updatedEntry.subjectId;
        }
    
        if (!updatedEntry.teacherId) {
            delete updatedEntry.teacherId;
        }
    
        updatedDaySchedule[slot.periodIndex] = updatedEntry as ScheduleEntry;
    
        const finalSchedule = {
            ...newSchedule,
            [slot.day]: updatedDaySchedule,
        };
    
        upsertSchedule(firestore, finalSchedule);
        toast({ title: "Jadwal Diperbarui", description: "Perubahan jadwal telah disimpan." });
        setIsEntryFormOpen(false);
        setEditingSlot(null);
    };

    const handleSaveTimes = (updatedPeriods: Period[]) => {
        setPeriods(updatedPeriods);

        if (!scheduleId || !selectedClass || !activeYear || !firestore || selectedClass === 'semua') {
            toast({ variant: "destructive", title: "Pilih Kelas Spesifik", description: "Anda harus memilih kelas spesifik untuk dapat menyimpan pengaturan jam." });
            return;
        }

        const newSchedule: Schedule = scheduleData ? { ...scheduleData } : {
            id: scheduleId,
            classLevel: parseInt(selectedClass, 10),
            academicYear: activeYear,
            type: scheduleType,
            ...initialScheduleData
        };

        const scheduleToUpdate = { ...newSchedule };

        days.forEach(day => {
            const daySchedule = scheduleToUpdate[day.key]?.length ? scheduleToUpdate[day.key] : initialPeriods.map(p => ({...p}));
            
            scheduleToUpdate[day.key] = daySchedule.map((entry, index) => ({
                ...entry,
                startTime: updatedPeriods[index].startTime,
                endTime: updatedPeriods[index].endTime,
            }));
        });

        upsertSchedule(firestore, scheduleToUpdate);
        toast({ title: "Jam Diperbarui", description: "Waktu jadwal telah disimpan untuk kelas ini." });
    }

    const subjectsForClass = useMemo(() => {
        if (!curriculumData) return [];
        const classLevel = editingSlot ? editingSlot.classLevel : parseInt(selectedClass, 10);
        if (isNaN(classLevel)) return [];
        return curriculumData.filter(c => c.classLevel === classLevel);
    }, [curriculumData, selectedClass, editingSlot]);
    
    const isLoading = loadingCurriculum || loadingTeachers || (selectedClass !== 'semua' ? loadingSchedule : loadingAllSchedules);

    const renderCellContent = (schedule: Schedule | undefined, day: typeof days[number]['key'], periodIndex: number) => {
        const entry = schedule?.[day]?.[periodIndex];
        if (!entry || entry.type === 'break') {
            return periodIndex === 1 ? <span className="text-muted-foreground italic">Istirahat</span> : '-';
        }

        const subject = curriculumData?.find(s => s.id === entry.subjectId);
        const teacher = teachers?.find(t => t.id === entry.teacherId);
        
        return (
            <div className="flex flex-col text-left">
                <span className="font-semibold whitespace-nowrap">{subject?.subjectName || '...'}</span>
                <span className="text-muted-foreground whitespace-nowrap">{teacher?.name || '...'}</span>
            </div>
        );
    };

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([{}], { header: ['Kelas (0-6)', 'Hari (sabtu, ahad, senin, selasa, rabu, kamis)', 'Sesi (Jam ke-1/Jam ke-2)', 'Nama Mapel', 'Nama Guru'] });
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
                    const dayName = item['Hari (sabtu, ahad, senin, selasa, rabu, kamis)'];
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
        const schedulesToProcess = selectedClass === 'semua' ? allSchedulesData || [] : (scheduleData ? [scheduleData] : []);

        if (schedulesToProcess.length === 0 && selectedClass !== 'semua') {
            toast({ title: "Tidak ada data untuk diekspor." });
            return;
        }
        
        const classLevels = selectedClass === 'semua' ? [...Array(7).keys()] : [parseInt(selectedClass, 10)];
        const schedulesByClass = new Map(schedulesToProcess.map(s => [s.classLevel, s]));

        classLevels.forEach(classLevel => {
            days.forEach(day => {
                periods.forEach((period, periodIndex) => {
                    if (period.type !== 'subject') return;

                    const entry = schedulesByClass.get(classLevel)?.[day.key]?.[periodIndex];
                    const subject = curriculumData?.find(s => s.id === entry?.subjectId);
                    const teacher = teachers?.find(t => t.id === entry?.teacherId);

                    dataToExport.push({
                        'Kelas': classLevel,
                        'Hari': day.name,
                        'Jam': `${period.startTime} - ${period.endTime}`,
                        'Sesi': period.name,
                        'Mata Pelajaran': subject?.subjectName || '',
                        'Guru': teacher?.name || '',
                    });
                });
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

        const schedulesToProcess = selectedClass === 'semua' ? allSchedulesData || [] : (scheduleData ? [scheduleData] : []);
        if (schedulesToProcess.length === 0 && selectedClass !== 'semua') {
            toast({ title: "Tidak ada data untuk diekspor." });
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text(`Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear}`, 14, 16);

        const classLevels = selectedClass === 'semua' ? [...Array(7).keys()] : [parseInt(selectedClass, 10)];
        const schedulesByClass = new Map(schedulesToProcess.map(s => [s.classLevel, s]));

        const body: any[] = [];
        classLevels.forEach(classLevel => {
            periods.forEach((period, periodIndex) => {
                if (period.type !== 'subject') return;
                
                days.forEach(day => {
                    const entry = schedulesByClass.get(classLevel)?.[day.key]?.[periodIndex];
                    const subject = curriculumData?.find(s => s.id === entry?.subjectId);
                    const teacher = teachers?.find(t => t.id === entry?.teacherId);

                    if (subject || teacher) { // Only add rows with data
                        body.push([
                            `Kelas ${classLevel}`,
                            day.name,
                            period.name,
                            `${period.startTime} - ${period.endTime}`,
                            subject?.subjectName || '-',
                            teacher?.name || '-'
                        ]);
                    }
                });
            });
        });
        
        if (body.length === 0) {
            toast({ title: "Tidak ada data jadwal untuk diekspor." });
            return;
        }

        (doc as any).autoTable({
            head: [['Kelas', 'Hari', 'Sesi', 'Jam', 'Mata Pelajaran', 'Guru']],
            body: body,
            startY: 20,
        });
        doc.save(`jadwal_${scheduleType}_${activeYear.replace('/', '-')}.pdf`);
    };

    const handlePrintTable = () => {
        if (isLoading) {
            toast({ variant: "destructive", title: "Data masih dimuat" });
            return;
        }
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: "destructive", title: "Gagal membuka jendela cetak" });
            return;
        }

        const schedulesByClass = new Map<number, Schedule>();
        if (allSchedulesData) {
            allSchedulesData.forEach(schedule => schedulesByClass.set(schedule.classLevel, schedule));
        }
        
        const classLevels = selectedClass === 'semua' ? [...Array(7).keys()] : [parseInt(selectedClass, 10)];

        const renderCellContentForPrint = (schedule: Schedule | undefined, day: typeof days[number]['key'], periodIndex: number) => {
            const entry = schedule?.[day]?.[periodIndex];
            if (!entry || entry.type === 'break') {
                return periodIndex === 1 ? `<span style="color: #64748b; font-style: italic;">Istirahat</span>` : '-';
            }
            const subject = curriculumData?.find(s => s.id === entry.subjectId);
            const teacher = teachers?.find(t => t.id === entry.teacherId);
            return `
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600;">${subject?.subjectName || '...'}</span>
                    <span style="color: #64748b;">${teacher?.name || '...'}</span>
                </div>
            `;
        };
        
        let tableRowsHtml = '';

        const processClass = (level: number) => {
            const schedule = level === -1 ? scheduleData : schedulesByClass.get(level);
            
            periods.forEach((period, periodIndex) => {
                tableRowsHtml += '<tr>';
                tableRowsHtml += `<td style="font-weight: 500;">${level === -1 ? `Kelas ${selectedClass}` : `Kelas ${level}`}</td>`;
                tableRowsHtml += `
                    <td style="font-weight: 500;">
                        <div style="display: flex; flex-direction: column;">
                            <span>${period.name}</span>
                            <span style="font-size: 0.75rem; color: #64748b;">${period.startTime} - ${period.endTime}</span>
                        </div>
                    </td>
                `;
                days.forEach(day => {
                    tableRowsHtml += `<td>${renderCellContentForPrint(schedule, day.key, periodIndex)}</td>`;
                });
                tableRowsHtml += '</tr>';
            });
        };

        if (selectedClass === 'semua') {
            classLevels.forEach(processClass);
        } else {
            processClass(-1); // Use -1 as a flag for single selected class
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Jadwal</title>
                    <style>
                        body { font-family: sans-serif; font-size: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 4px; text-align: left; vertical-align: top; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Jadwal ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'} - Tahun Ajaran ${activeYear}</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>Kelas</th>
                                <th>Jam</th>
                                ${days.map(day => `<th>${day.name}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
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
                    <Tabs value={scheduleType}>
                        <TabsContent value="pelajaran" className="mt-0">
                             <ScheduleTable />
                        </TabsContent>
                        <TabsContent value="ujian" className="mt-0">
                            <ScheduleTable />
                        </TabsContent>
                    </Tabs>
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
        const schedulesByClass = useMemo(() => {
            const map = new Map<number, Schedule>();
            if (allSchedulesData) {
                for (const schedule of allSchedulesData) {
                    map.set(schedule.classLevel, schedule);
                }
            }
            return map;
        }, [allSchedulesData]);
    
        const classLevels = [...Array(7).keys()];

        return (
            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Kelas</TableHead>
                            <TableHead className="w-[120px]">Jam</TableHead>
                            {days.map(day => <TableHead key={day.key} className="min-w-[140px]">{day.name}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-48 text-center">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                        <span>Memuat data jadwal...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : selectedClass === 'semua' ? (
                            classLevels.flatMap(classLevel => (
                                periods.map((period, periodIndex) => (
                                    <TableRow key={`${classLevel}-${periodIndex}`}>
                                        {periodIndex === 0 && (
                                            <TableCell rowSpan={periods.length} className="font-medium align-top pt-2.5">
                                               {`Kelas ${classLevel}`}
                                            </TableCell>
                                        )}
                                        <TableCell className="font-medium align-top">
                                            <div className="flex flex-col">
                                                <span>{period.name}</span>
                                                <span className="text-xs text-muted-foreground">{period.startTime} - {period.endTime}</span>
                                            </div>
                                        </TableCell>
                                        {days.map(day => (
                                            <TableCell 
                                                key={day.key} 
                                                className="align-top cursor-pointer hover:bg-muted/50"
                                                onClick={() => {
                                                    if (period.type === 'break') return;
                                                    handleEdit(classLevel, day.key, periodIndex);
                                                }}
                                            >
                                                {renderCellContent(schedulesByClass.get(classLevel), day.key, periodIndex)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ))
                        ) : (
                            periods.map((period, periodIndex) => (
                                <TableRow key={periodIndex}>
                                    <TableCell className="font-medium align-top pt-2.5">
                                        {`Kelas ${selectedClass}`}
                                    </TableCell>
                                    <TableCell className="font-medium align-top">
                                        <div className="flex flex-col">
                                            <span>{period.name}</span>
                                            <span className="text-xs text-muted-foreground">{period.startTime} - {period.endTime}</span>
                                        </div>
                                    </TableCell>
                                    {days.map(day => (
                                        <TableCell 
                                            key={day.key} 
                                            className="align-top cursor-pointer hover:bg-muted/50"
                                            onClick={() => {
                                                if (period.type === 'break') return;
                                                handleEdit(parseInt(selectedClass, 10), day.key, periodIndex);
                                            }}
                                        >
                                            {scheduleData ? renderCellContent(scheduleData, day.key, periodIndex) : (period.type === 'break' ? <span className="text-muted-foreground italic">Istirahat</span> : '-')}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                        {!isLoading && selectedClass !== 'semua' && !scheduleData && (
                            <TableRow>
                                <td colSpan={8}>
                                    <div className="h-24 flex items-center justify-center text-center text-muted-foreground">
                                        Belum ada jadwal untuk kelas ini. <br/> Klik pada slot untuk mulai mengisi.
                                    </div>
                                </td>
                            </TableRow>
                        )}
                         {!isLoading && selectedClass === 'semua' && allSchedulesData?.length === 0 && (
                            <TableRow>
                                <td colSpan={8}>
                                    <div className="h-24 flex items-center justify-center text-center text-muted-foreground">
                                        Belum ada jadwal untuk tahun ajaran dan tipe ini.
                                    </div>
                                </td>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    }
}
