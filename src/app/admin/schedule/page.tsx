
"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, Firestore, query, where } from "firebase/firestore";
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
import { Loader2, Clock } from "lucide-react";
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

    const curriculumCollection = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculumData, loading: loadingCurriculum } = useCollection<Curriculum>(curriculumCollection);

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    // Fetch a single schedule if a specific class is selected
    const scheduleId = useMemo(() => {
        if (!selectedClass || !activeYear || selectedClass === 'semua') return null;
        return `${selectedClass}_${activeYear.replace('/', '-')}_${scheduleType}`;
    }, [selectedClass, activeYear, scheduleType]);

    const scheduleRef = useMemoFirebase(() => scheduleId ? doc(firestore, 'schedules', scheduleId) : null, [scheduleId]);
    const { data: scheduleData, isLoading: loadingSchedule } = useDoc<Schedule>(scheduleRef);

    // Fetch all schedules for the current year/type if 'semua' is selected
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
        const updatedEntry: ScheduleEntry = {
            ...updatedDaySchedule[slot.periodIndex],
            subjectId: updatedData.subjectId || undefined,
            teacherId: updatedData.teacherId || undefined,
        };
        updatedDaySchedule[slot.periodIndex] = updatedEntry;


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
                <span className="font-semibold">{subject?.subjectName || '...'}</span>
                <span className="text-muted-foreground">{teacher?.name || '...'}</span>
            </div>
        );
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
                         <Button size="xs" onClick={() => setIsTimeFormOpen(true)} className="gap-1">
                            <Clock className="h-3 w-3"/>
                            Atur Jam
                        </Button>
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
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Kelas</TableHead>
                            <TableHead className="w-[120px]">Jam</TableHead>
                            {days.map(day => <TableHead key={day.key}>{day.name}</TableHead>)}
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

    