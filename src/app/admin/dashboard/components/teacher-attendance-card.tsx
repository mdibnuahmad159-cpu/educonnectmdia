
"use client";

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, TeacherAttendance, Schedule, ScheduleEntry } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
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

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'teacher_attendances'), where('date', '==', todayStr));
    }, [firestore, todayStr]);

    const { data: todaysAttendance, loading: loadingAttendance } = useCollection<TeacherAttendance>(attendanceQuery);
    
    const todayKey = dayMapping[new Date().getDay()];

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
        if (!schedules || !todayKey) return new Set<string>();

        const teacherIds = new Set<string>();
        for (const schedule of schedules) {
            const daySchedule = schedule[todayKey as keyof typeof schedule] as ScheduleEntry[];
            if (daySchedule) {
                for (const entry of daySchedule) {
                    if (entry.teacherId) {
                        teacherIds.add(entry.teacherId);
                    }
                }
            }
        }
        return teacherIds;
    }, [schedules, todayKey]);


    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (todaysAttendance) {
            const initialAttendance = todaysAttendance.reduce((acc, record) => {
                acc[record.teacherId] = record.status;
                return acc;
            }, {} as Record<string, AttendanceStatus>);
            setAttendance(initialAttendance);
        }
    }, [todaysAttendance]);
    
    const sortedTeachers = useMemo(() => {
        if (!teachers) return [];
        return [...teachers].sort((a,b) => a.name.localeCompare(b.name));
    }, [teachers]);

    const scheduledTeachersToday = useMemo(() => {
        // If it's Friday or schedules haven't loaded, return empty.
        if (!todayKey || !schedules) return []; 
        return sortedTeachers.filter(teacher => scheduledTeacherIds.has(teacher.id));
    }, [sortedTeachers, scheduledTeacherIds, todayKey, schedules]);

    const handleStatusChange = (teacherId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [teacherId]: status }));
    };

    const handleSave = async () => {
        if (!firestore || !scheduledTeachersToday) return;
        setIsSaving(true);

        const attendancePayload: Omit<TeacherAttendance, 'id'>[] = scheduledTeachersToday.map(teacher => ({
            teacherId: teacher.id,
            teacherName: teacher.name,
            date: todayStr,
            status: attendance[teacher.id] || 'Alpa', // Default to Alpa if not set
        }));
        
        try {
            await saveTeacherAttendanceBatch(firestore, attendancePayload);
            toast({ title: 'Absensi Disimpan', description: 'Absensi guru untuk hari ini telah berhasil disimpan.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan absensi.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = loadingTeachers || loadingAttendance || loadingSchedules;
    const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy", { locale: id });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Absensi Guru</CardTitle>
                <CardDescription>{todayFormatted}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {scheduledTeachersToday && scheduledTeachersToday.length > 0 ? scheduledTeachersToday.map(teacher => (
                            <div key={teacher.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={teacher.avatarUrl} alt={teacher.name} />
                                        <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{teacher.name}</span>
                                </div>
                                <RadioGroup
                                    value={attendance[teacher.id] || ''}
                                    onValueChange={(value) => handleStatusChange(teacher.id, value as AttendanceStatus)}
                                    className="flex items-center gap-2 sm:gap-3"
                                >
                                    {STATUS_OPTIONS.map(status => (
                                        <div key={status} className="flex items-center space-x-1.5">
                                            <RadioGroupItem value={status} id={`${teacher.id}-${status}`} />
                                            <Label htmlFor={`${teacher.id}-${status}`} className="text-xs">{status}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                {todayKey ? 'Tidak ada guru yang terjadwal mengajar hari ini.' : 'Jadwal pelajaran tidak tersedia untuk hari ini.'}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
            {scheduledTeachersToday && scheduledTeachersToday.length > 0 && (
                <CardFooter>
                    <Button onClick={handleSave} disabled={isLoading || isSaving} className="w-full">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Absensi Hari Ini'}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
