"use client";

import { useState, useEffect, useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, TeacherAttendance, Schedule, ScheduleEntry } from '@/types';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Edit2, Save, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveTeacherAttendanceBatch } from '@/lib/firebase-helpers';
import { useAcademicYear } from '@/context/academic-year-provider';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Belum Diabsen' | 'Libur';
const STATUS_OPTIONS: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Diabsen'];

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

interface TeacherAttendanceCardProps {
    selectedDate: string;
}

export function TeacherAttendanceCard({ selectedDate }: TeacherAttendanceCardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { activeYear } = useAcademicYear();

    const [isSaving, setIsSaving] = useState<string | null>(null);

    const isFriday = useMemo(() => {
        try { return parseISO(selectedDate).getDay() === 5; } catch (e) { return false; }
    }, [selectedDate]);

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'teacher_attendances'), where('date', '==', selectedDate));
    }, [firestore, selectedDate]);
    const { data: todaysAttendance, loading: loadingAttendance } = useCollection<TeacherAttendance>(attendanceQuery);
    
    const selectedDayKey = useMemo(() => {
        try { return dayMapping[parseISO(selectedDate).getDay()]; } catch (e) { return null; }
    }, [selectedDate]);

    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', 'pelajaran'));
    }, [firestore, activeYear]);
    const { data: schedules } = useCollection<Schedule>(schedulesQuery);

    const scheduledTeacherIds = useMemo(() => {
        if (!schedules || !selectedDayKey) return new Set<string>();
        const teacherIds = new Set<string>();
        for (const schedule of schedules) {
            const daySchedule = schedule[selectedDayKey as keyof typeof schedule] as ScheduleEntry[];
            daySchedule?.forEach(entry => { if (entry.teacherId) teacherIds.add(entry.teacherId); });
        }
        return teacherIds;
    }, [schedules, selectedDayKey]);

    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

    useEffect(() => {
        if (todaysAttendance) {
            const initialAttendance = todaysAttendance.reduce((acc, record) => {
                acc[record.teacherId] = record.status as AttendanceStatus;
                return acc;
            }, {} as Record<string, AttendanceStatus>);
            setAttendance(initialAttendance);
        } else {
            setAttendance({});
        }
    }, [todaysAttendance]);
    
    const scheduledTeachersOnSelectedDate = useMemo(() => {
        if (!selectedDayKey || !schedules || !teachers) return []; 
        return teachers.filter(teacher => scheduledTeacherIds.has(teacher.id)).sort((a,b) => a.name.localeCompare(b.name));
    }, [teachers, scheduledTeacherIds, selectedDayKey, schedules]);

    const isHoliday = useMemo(() => {
        if (!scheduledTeachersOnSelectedDate.length) return false;
        return scheduledTeachersOnSelectedDate.every(t => attendance[t.id] === 'Libur');
    }, [scheduledTeachersOnSelectedDate, attendance]);

    const handleStatusChange = (teacherId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [teacherId]: status }));
    };

    const handleSaveSingle = async (teacherId: string) => {
        if (!firestore) return;
        const teacher = teachers?.find(t => t.id === teacherId);
        if (!teacher) return;

        setIsSaving(teacherId);
        const status = attendance[teacherId] || 'Belum Diabsen';
        
        const attendancePayload: Omit<TeacherAttendance, 'id'>[] = [{
            teacherId: teacher.id,
            teacherName: teacher.name,
            date: selectedDate,
            status: status as any,
        }];

        try {
            await saveTeacherAttendanceBatch(firestore, attendancePayload);
            toast({ title: 'Absensi Diperbarui', description: `${teacher.name} berhasil ditandai ${status}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
        } finally {
            setIsSaving(null);
        }
    };
    
    const isLoading = loadingTeachers || loadingAttendance;

    return (
        <div className="animate-in fade-in duration-300">
            <CardHeader className="pb-3 px-4">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                          <CardTitle className="text-sm font-bold uppercase tracking-tight text-primary">Status Mengajar Guru</CardTitle>
                          <CardDescription className="text-[10px]">Pantau kehadiran guru yang terjadwal hari ini.</CardDescription>
                      </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-6">
                {isFriday || isHoliday ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-blue-50/50 rounded-xl border border-dashed border-blue-200 text-blue-700 animate-in zoom-in-95 duration-300">
                        <Coffee className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-xs font-bold uppercase tracking-widest">
                            {isFriday ? "Hari Libur (Jum'at)" : "Hari Libur Sekolah"}
                        </p>
                        <p className="text-[10px] mt-1 opacity-70">
                            {isFriday ? "Kegiatan belajar mengajar ditiadakan." : "Ditetapkan secara manual oleh Admin."}
                        </p>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {scheduledTeachersOnSelectedDate.length > 0 ? scheduledTeachersOnSelectedDate.map(teacher => {
                            const currentStatus = attendance[teacher.id] || 'Belum Diabsen';
                            return (
                                <div key={teacher.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border shadow-sm hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={teacher.avatarUrl} alt={teacher.name} />
                                            <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-[11px] font-bold leading-tight uppercase">{teacher.name}</p>
                                            <p className="text-[9px] text-muted-foreground font-mono">{teacher.nig}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter",
                                            currentStatus === 'Hadir' ? "bg-green-100 text-green-700" :
                                            currentStatus === 'Sakit' ? "bg-yellow-100 text-yellow-700" :
                                            currentStatus === 'Izin' ? "bg-blue-100 text-blue-700" :
                                            currentStatus === 'Alpa' ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground/60"
                                        )}>
                                            {currentStatus}
                                        </div>

                                        <DropdownMenu modal={false}>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                                                    <Edit2 className="h-3.5 w-3.5 text-primary" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44 rounded-[20px] p-1.5 shadow-2xl border-none bg-card z-50">
                                                <div className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                                    Ubah Status
                                                </div>
                                                {STATUS_OPTIONS.map((opt) => (
                                                    <DropdownMenuItem 
                                                        key={opt}
                                                        onSelect={() => handleStatusChange(teacher.id, opt)}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 rounded-[14px] cursor-pointer focus:bg-muted text-[11px] font-bold uppercase",
                                                            currentStatus === opt ? "text-primary" : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {opt}
                                                        {currentStatus === opt && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
                                                    </DropdownMenuItem>
                                                ))}
                                                
                                                {currentStatus && currentStatus !== 'Hadir' && currentStatus !== 'Belum Diabsen' && (
                                                    <>
                                                        <DropdownMenuSeparator className="my-1.5 bg-muted/50" />
                                                        <DropdownMenuItem 
                                                            onSelect={(e) => {
                                                                e.preventDefault();
                                                                handleSaveSingle(teacher.id);
                                                            }}
                                                            disabled={isSaving === teacher.id}
                                                            className="flex items-center justify-center gap-2 p-2 rounded-[14px] cursor-pointer bg-primary text-primary-foreground focus:bg-primary/90 text-[10px] font-bold uppercase"
                                                        >
                                                            {isSaving === teacher.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                            Simpan
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl opacity-50">
                                <p className="text-xs italic">Tidak ada jadwal mengajar pada hari ini.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </div>
    );
}
