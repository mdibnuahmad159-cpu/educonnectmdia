
"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, TeacherAttendance, Schedule, ScheduleEntry } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveTeacherAttendanceBatch } from '@/lib/firebase-helpers';
import { useAcademicYear } from '@/context/academic-year-provider';

type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
const STATUS_OPTIONS: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa'];

// Helper to map JS Date day index to our schedule keys
const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    // Friday (5) is intentionally omitted as it is not in the schedule schema
    6: 'saturday',
};

export function TeacherAttendanceCard() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { activeYear } = useAcademicYear();

    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'teacher_attendances'), where('date', '==', selectedDate));
    }, [firestore, selectedDate]);

    const { data: todaysAttendance, loading: loadingAttendance } = useCollection<TeacherAttendance>(attendanceQuery);
    
    const selectedDayKey = useMemo(() => {
        try {
            return dayMapping[parseISO(selectedDate).getDay()];
        } catch (e) {
            return null;
        }
    }, [selectedDate]);

    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(
            collection(firestore, 'schedules'),
            where('academicYear', '==', activeYear),
            where('type', '==', 'pelajaran')
        );
    }, [firestore, activeYear]);
    const { data: schedules, isLoading: loadingSchedules } = useCollection<Schedule>(schedulesQuery);

    const scheduledTeacherIds = useMemo(() => {
        if (!schedules || !selectedDayKey) return new Set<string>();

        const teacherIds = new Set<string>();
        for (const schedule of schedules) {
            const daySchedule = schedule[selectedDayKey as keyof typeof schedule] as ScheduleEntry[];
            if (daySchedule) {
                for (const entry of daySchedule) {
                    if (entry.teacherId) {
                        teacherIds.add(entry.teacherId);
                    }
                }
            }
        }
        return teacherIds;
    }, [schedules, selectedDayKey]);


    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (todaysAttendance) {
            const initialAttendance = todaysAttendance.reduce((acc, record) => {
                acc[record.teacherId] = record.status;
                return acc;
            }, {} as Record<string, AttendanceStatus>);
            setAttendance(initialAttendance);
        } else {
            setAttendance({});
        }
    }, [todaysAttendance]);
    
    const sortedTeachers = useMemo(() => {
        if (!teachers) return [];
        return [...teachers].sort((a,b) => a.name.localeCompare(b.name));
    }, [teachers]);

    const scheduledTeachersOnSelectedDate = useMemo(() => {
        if (!selectedDayKey || !schedules) return []; 
        return sortedTeachers.filter(teacher => scheduledTeacherIds.has(teacher.id));
    }, [sortedTeachers, scheduledTeacherIds, selectedDayKey, schedules]);

    const handleStatusChange = (teacherId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [teacherId]: status }));
    };

    const handleSave = async () => {
        if (!firestore || !scheduledTeachersOnSelectedDate) return;
        setIsSaving(true);

        const attendancePayload: Omit<TeacherAttendance, 'id'>[] = scheduledTeachersOnSelectedDate.map(teacher => ({
            teacherId: teacher.id,
            teacherName: teacher.name,
            date: selectedDate,
            status: attendance[teacher.id] || 'Alpa', // Default to Alpa if not set
        }));
        
        try {
            await saveTeacherAttendanceBatch(firestore, attendancePayload);
            toast({ title: 'Absensi Disimpan', description: `Absensi guru untuk tanggal ${selectedDate} telah berhasil disimpan.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan absensi.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = loadingTeachers || loadingAttendance || loadingSchedules;
    const dateFormatted = useMemo(() => {
        try {
            return format(parseISO(selectedDate), "EEEE, d MMMM yyyy", { locale: id });
        } catch (e) {
            return selectedDate;
        }
    }, [selectedDate]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <CardTitle>Absensi Guru</CardTitle>
                        <CardDescription>{dateFormatted}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
                        <Input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="h-8 text-xs w-full sm:w-[150px]"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {scheduledTeachersOnSelectedDate && scheduledTeachersOnSelectedDate.length > 0 ? scheduledTeachersOnSelectedDate.map(teacher => (
                            <div key={teacher.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={teacher.avatarUrl} alt={teacher.name} />
                                        <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{teacher.name}</span>
                                </div>
                                <Select
                                    value={attendance[teacher.id] || ''}
                                    onValueChange={(value) => handleStatusChange(teacher.id, value as AttendanceStatus)}
                                >
                                    <SelectTrigger className="w-[110px] text-xs">
                                        <SelectValue placeholder="Pilih status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map(status => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                {selectedDayKey ? 'Tidak ada guru yang terjadwal mengajar pada tanggal ini.' : 'Jadwal pelajaran tidak tersedia untuk hari ini.'}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
            {scheduledTeachersOnSelectedDate && scheduledTeachersOnSelectedDate.length > 0 && (
                <CardFooter>
                    <Button onClick={handleSave} disabled={isLoading || isSaving} className="w-full">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Simpan Absensi (${selectedDate})`}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
