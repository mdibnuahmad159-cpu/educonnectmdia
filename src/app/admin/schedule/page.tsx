
"use client";

import { useState, useMemo } from "react";
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
import { Loader2, Edit } from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { upsertSchedule } from "@/lib/firebase-helpers";
import { ScheduleEntryForm, type EditingSlot } from "./components/schedule-entry-form";

const days = [
    { key: 'saturday', name: 'Sabtu' },
    { key: 'sunday', name: 'Ahad' },
    { key: 'monday', name: 'Senin' },
    { key: 'tuesday', name: 'Selasa' },
    { key: 'wednesday', name: 'Rabu' },
    { key: 'thursday', name: 'Kamis' },
] as const;

const periods = [
    { name: 'Jam ke-1', index: 0 },
    { name: 'Istirahat', index: 1 },
    { name: 'Jam ke-2', index: 2 },
];

const initialScheduleData: Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> = {
    saturday: [
        { type: 'subject', startTime: '07:00', endTime: '08:30' },
        { type: 'break', startTime: '08:30', endTime: '09:00' },
        { type: 'subject', startTime: '09:00', endTime: '10:30' },
    ],
    sunday: [
        { type: 'subject', startTime: '07:00', endTime: '08:30' },
        { type: 'break', startTime: '08:30', endTime: '09:00' },
        { type: 'subject', startTime: '09:00', endTime: '10:30' },
    ],
    monday: [
        { type: 'subject', startTime: '07:00', endTime: '08:30' },
        { type: 'break', startTime: '08:30', endTime: '09:00' },
        { type: 'subject', startTime: '09:00', endTime: '10:30' },
    ],
    tuesday: [
        { type: 'subject', startTime: '07:00', endTime: '08:30' },
        { type: 'break', startTime: '08:30', endTime: '09:00' },
        { type: 'subject', startTime: '09:00', endTime: '10:30' },
    ],
    wednesday: [
        { type: 'subject', startTime: '07:00', endTime: '08:30' },
        { type: 'break', startTime: '08:30', endTime: '09:00' },
        { type: 'subject', startTime: '09:00', endTime: '10:30' },
    ],
    thursday: [
        { type: 'subject', startTime: '07:00', endTime: '08:30' },
        { type: 'break', startTime: '08:30', endTime: '09:00' },
        { type: 'subject', startTime: '09:00', endTime: '10:30' },
    ],
};


export default function SchedulePage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [scheduleType, setScheduleType] = useState<'pelajaran' | 'ujian'>('pelajaran');
    const [selectedClass, setSelectedClass] = useState<string>('0');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);

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

    const handleEdit = (dayKey: typeof days[number]['key'], periodIndex: number) => {
        const currentEntry = scheduleData?.[dayKey]?.[periodIndex] || initialScheduleData[dayKey][periodIndex];
        setEditingSlot({ day: dayKey, periodIndex, entry: currentEntry });
        setIsFormOpen(true);
    };

    const handleSave = (slot: EditingSlot, updatedEntry: ScheduleEntry) => {
        if (!scheduleId || !selectedClass || !activeYear) return;

        const newSchedule: Schedule = scheduleData ?? {
            id: scheduleId,
            classLevel: parseInt(selectedClass, 10),
            academicYear: activeYear,
            type: scheduleType,
            ...initialScheduleData
        };

        const updatedDaySchedule = [...newSchedule[slot.day]];
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
                <span className="text-xs text-muted-foreground">{entry.startTime} - {entry.endTime}</span>
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
                            periods.map(period => (
                                <TableRow key={period.index}>
                                    <TableCell className="font-medium align-top">{period.name}</TableCell>
                                    {days.map(day => (
                                        <TableCell 
                                            key={day.key} 
                                            className="align-top cursor-pointer hover:bg-muted/50"
                                            onClick={() => period.index !== 1 && handleEdit(day.key, period.index)}
                                        >
                                            {renderCellContent(day.key, period.index)}
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
