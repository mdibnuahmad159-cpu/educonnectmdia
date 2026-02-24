
"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, Firestore } from "firebase/firestore";
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
import { Loader2 } from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { upsertSchedule } from "@/lib/firebase-helpers";
import { ScheduleEntryForm, type EditingSlot } from "./components/schedule-entry-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const days = [
    { key: 'saturday', name: 'Sabtu' },
    { key: 'sunday', name: 'Ahad' },
    { key: 'monday', name: 'Senin' },
    { key: 'tuesday', name: 'Selasa' },
    { key: 'wednesday', name: 'Rabu' },
    { key: 'thursday', name: 'Kamis' },
] as const;

const initialPeriods = [
    { name: 'Jam ke-1', startTime: '07:00', endTime: '08:30', type: 'subject' as const },
    { name: 'Istirahat', startTime: '08:30', endTime: '09:00', type: 'break' as const },
    { name: 'Jam ke-2', startTime: '09:00', endTime: '10:30', type: 'subject' as const },
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
    const [selectedClass, setSelectedClass] = useState<string>('0');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
    const [periods, setPeriods] = useState(initialPeriods);

    const curriculumCollection = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculumData, loading: loadingCurriculum } = useCollection<Curriculum>(curriculumCollection);

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const scheduleId = useMemo(() => {
        if (!selectedClass || !activeYear) return null;
        return `${selectedClass}_${activeYear.replace('/', '-')}_${scheduleType}`;
    }, [selectedClass, activeYear, scheduleType]);

    const scheduleRef = useMemoFirebase(() => scheduleId ? doc(firestore, 'schedules', scheduleId) : null, [scheduleId]);
    const { data: scheduleData, isLoading: loadingSchedule } = useDoc<Schedule>(scheduleRef);

    useEffect(() => {
        if (scheduleData) {
            // Take times from the first day as the source of truth
            const newPeriods = periods.map((p, index) => ({
                ...p,
                startTime: scheduleData.saturday[index].startTime,
                endTime: scheduleData.saturday[index].endTime,
            }));
            setPeriods(newPeriods);
        } else {
            // Reset to default if no schedule data
            setPeriods(initialPeriods);
        }
    }, [scheduleData]);


    const handleEdit = (dayKey: typeof days[number]['key'], periodIndex: number) => {
        const currentEntry = scheduleData?.[dayKey]?.[periodIndex] || initialScheduleData[dayKey][periodIndex];
        setEditingSlot({ day: dayKey, periodIndex, entry: currentEntry });
        setIsFormOpen(true);
    };

    const handleSave = (slot: EditingSlot, updatedData: { subjectId?: string, teacherId?: string }) => {
        if (!scheduleId || !selectedClass || !activeYear) return;

        const newSchedule: Schedule = scheduleData ?? {
            id: scheduleId,
            classLevel: parseInt(selectedClass, 10),
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
        setIsFormOpen(false);
        setEditingSlot(null);
    };

    const handlePeriodTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
        const newPeriods = [...periods];
        newPeriods[index] = { ...newPeriods[index], [field]: value };
        setPeriods(newPeriods);
    };

    const handleSaveTimes = () => {
        if (!scheduleId || !selectedClass || !activeYear || !firestore) return;

        const newSchedule: Schedule = scheduleData ? { ...scheduleData } : {
            id: scheduleId,
            classLevel: parseInt(selectedClass, 10),
            academicYear: activeYear,
            type: scheduleType,
            ...initialScheduleData
        };

        const scheduleToUpdate = { ...newSchedule };

        days.forEach(day => {
            scheduleToUpdate[day.key] = scheduleToUpdate[day.key].map((entry, index) => ({
                ...entry,
                startTime: periods[index].startTime,
                endTime: periods[index].endTime,
            }));
        });

        upsertSchedule(firestore, scheduleToUpdate);
        toast({ title: "Jam Diperbarui", description: "Waktu jadwal telah disimpan untuk kelas ini." });
    }

    const subjectsForClass = useMemo(() => {
        if (!curriculumData) return [];
        return curriculumData.filter(c => c.classLevel === parseInt(selectedClass, 10));
    }, [curriculumData, selectedClass]);
    
    const isLoading = loadingCurriculum || loadingTeachers || loadingSchedule;

    const renderCellContent = (day: typeof days[number]['key'], periodIndex: number) => {
        const entry = scheduleData?.[day]?.[periodIndex];
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
                    <Tabs value={scheduleType} onValueChange={(value) => setScheduleType(value as 'pelajaran' | 'ujian')}>
                        <div className="flex justify-between items-center mb-4">
                            <TabsList className="grid grid-cols-2 w-fit">
                                <TabsTrigger value="pelajaran">Jadwal Pelajaran</TabsTrigger>
                                <TabsTrigger value="ujian">Jadwal Ujian</TabsTrigger>
                            </TabsList>
                             <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Pilih kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...Array(7).keys()].map(i => (
                                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 items-end mb-4 p-3 border rounded-lg">
                            {periods.map((period, index) => (
                                <div key={index} className="flex-grow">
                                    <Label className="text-xs font-medium">{period.name}</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input 
                                            value={period.startTime} 
                                            onChange={(e) => handlePeriodTimeChange(index, 'startTime', e.target.value)} 
                                            className="w-full"
                                            placeholder="Mulai"
                                            disabled={period.type === 'break'}
                                        />
                                        <Input 
                                            value={period.endTime} 
                                            onChange={(e) => handlePeriodTimeChange(index, 'endTime', e.target.value)} 
                                            className="w-full"
                                            placeholder="Selesai"
                                            disabled={period.type === 'break'}
                                        />
                                    </div>
                                </div>
                            ))}
                            <Button size="xs" onClick={handleSaveTimes}>Simpan Jam</Button>
                        </div>
                        <TabsContent value="pelajaran" className="space-y-4">
                             <ScheduleTable />
                        </TabsContent>
                        <TabsContent value="ujian" className="space-y-4">
                            <ScheduleTable />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
            {editingSlot && (
                <ScheduleEntryForm 
                    isOpen={isFormOpen}
                    setIsOpen={setIsFormOpen}
                    editingSlot={editingSlot}
                    onSave={handleSave}
                    subjects={subjectsForClass}
                    teachers={teachers || []}
                />
            )}
        </>
    );

    function ScheduleTable() {
        return (
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Jam</TableHead>
                            {days.map(day => <TableHead key={day.key}>{day.name}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                        <span>Memuat data jadwal...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            periods.map((period, periodIndex) => (
                                <TableRow key={period.index}>
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
                                            onClick={() => period.type !== 'break' && handleEdit(day.key, periodIndex)}
                                        >
                                            {renderCellContent(day.key, periodIndex)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    }
}
