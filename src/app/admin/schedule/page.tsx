
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
import { Loader2, Clock, FileDown, Printer, FileSpreadsheet, FileText, Upload, Download, FileUp, MoreHorizontal } from "lucide-react";
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
        if (scheduleSource?.saturday && scheduleSource.saturday.length > 0) {
            const newPeriods = scheduleSource.saturday.map((entry, index) => ({
                name: periods[index]?.name || (entry.type === 'subject' ? `Jam ke-${index + 1}` : 'Istirahat'),
                startTime: entry.startTime,
                endTime: entry.endTime,
                type: entry.type,
                isEditable: true
            }));
            if (newPeriods.length > 0) {
                 setPeriods(newPeriods);
            } else {
                 setPeriods(initialPeriods);
            }
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
    
        const updatedDaySchedule = [...(newSchedule[slot.day] || initialScheduleData[slot.day])];
        
        const updatedEntry: Partial<ScheduleEntry> = {
            ...updatedDaySchedule[slot.periodIndex],
        };
    
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
        
        if (selectedClass === 'semua') {
             toast({ variant: "destructive", title: "Fungsi cetak tidak tersedia untuk 'Semua Kelas' dalam tampilan ini." });
             return;
        }
        
        const classLevel = parseInt(selectedClass, 10);
        if (isNaN(classLevel)) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: "destructive", title: "Gagal membuka jendela cetak" });
            return;
        }

        const renderPeriodCard = (period: Period, entry: ScheduleEntry | undefined) => {
            if (period.type === 'break') {
                return `
                    <div style="padding: 12px; text-align: center; border-radius: 8px; background-color: #f1f5f9; font-style: italic; color: #64748b;">
                        ${period.startTime} - ${period.endTime} Istirahat
                    </div>`;
            }
            const subject = curriculumData?.find(s => s.id === entry?.subjectId);
            const teacher = teachers?.find(t => t.id === entry?.teacherId);
            return `
                <div style="padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; background-color: #ffffff;">
                    <div style="font-size: 12px; color: #64748b;">${period.startTime} - ${period.endTime}</div>
                    <div style="font-weight: 600; color: #15803d; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${subject?.subjectName || "..."}</div>
                    <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${teacher?.name || "..."}</div>
                </div>
            `;
        }
        
        const dayCards = days.map(day => `
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; width: 250px; flex-shrink: 0;">
                <h3 style="font-weight: 700; font-size: 18px; text-align: center; margin-bottom: 12px;">${day.name}</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${periods.map((p, i) => renderPeriodCard(p, scheduleData?.[day.key]?.[i])).join('')}
                </div>
            </div>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Jadwal Kelas ${classLevel === 0 ? 'SIFIR' : classLevel}</title>
                    <style>
                        body { font-family: sans-serif; font-size: 14px; background-color: #f8fafc; }
                        @media print {
                            body { background-color: #ffffff; }
                        }
                    </style>
                </head>
                <body>
                    <h1 style="font-size: 24px; font-weight: 700; color: #15803d;">Jadwal Kelas ${classLevel === 0 ? 'SIFIR' : classLevel}</h1>
                    <h2 style="font-size: 16px; font-weight: 600; color: #475569; margin-top: -10px; margin-bottom: 20px;">Tahun Ajaran ${activeYear} - ${scheduleType === 'pelajaran' ? 'Pelajaran' : 'Ujian'}</h2>
                    <div style="display: flex; gap: 16px; overflow-x: auto;">
                        ${dayCards}
                    </div>
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
                             <ScheduleView />
                        </TabsContent>
                        <TabsContent value="ujian" className="mt-0">
                            <ScheduleView />
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

    function ScheduleView() {
        if (isLoading) {
            return (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            );
        }
    
        if (selectedClass === 'semua') {
            return (
                <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
                    <div className="text-center text-muted-foreground">
                        <p>Pilih kelas untuk melihat jadwal dalam format kartu.</p>
                        <p className="text-xs">Fitur ekspor dan impor tetap berfungsi untuk semua kelas.</p>
                    </div>
                </div>
            );
        }
        
        const classLevel = parseInt(selectedClass, 10);
        if (isNaN(classLevel)) return null;
    
        const schedule = scheduleData;
        
        return (
            <div>
                <h2 className="text-xl font-bold mb-4 text-primary">Kelas {classLevel === 0 ? 'SIFIR' : classLevel}</h2>
                <div className="overflow-x-auto pb-4 -mx-4 px-4">
                    <div className="flex space-x-4">
                        {days.map(day => (
                            <div key={day.key} className="bg-card p-3 rounded-xl border w-64 md:w-72 flex-shrink-0">
                                <h3 className="font-bold text-lg text-center mb-3">{day.name}</h3>
                                <div className="space-y-3">
                                    {periods.map((period, periodIndex) => {
                                        const entry = schedule?.[day.key]?.[periodIndex];
    
                                        if (period.type === 'break') {
                                            return (
                                                <div key={periodIndex} className="p-3 text-center rounded-lg bg-muted/50 border border-dashed">
                                                    <div className="text-sm font-medium">{period.startTime} - {period.endTime}</div>
                                                    <div className="text-sm text-muted-foreground">Istirahat</div>
                                                </div>
                                            );
                                        }
    
                                        const subject = curriculumData?.find(s => s.id === entry?.subjectId);
                                        const teacher = teachers?.find(t => t.id === entry?.teacherId);
                                        
                                        return (
                                            <div 
                                                key={periodIndex} 
                                                className="bg-background p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors relative group"
                                                onClick={() => handleEdit(classLevel, day.key, periodIndex)}
                                            >
                                                <div className="text-xs text-muted-foreground">{period.startTime} - {period.endTime}</div>
                                                <div className="font-semibold text-primary mt-1 truncate">{subject?.subjectName || "..."}</div>
                                                <div className="text-xs text-muted-foreground truncate">{teacher?.name || "..."}</div>
                                                <MoreHorizontal className="absolute top-2 right-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                                            </div>
                                        );
                                    })}
                                    {!schedule && (
                                         <div className="text-center text-muted-foreground text-xs pt-4">
                                            Jadwal kosong. Klik untuk mengisi.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}
