"use client";

import { useState, useEffect, useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Student, StudentAttendance } from '@/types';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Coffee, Edit2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveStudentAttendanceBatch } from '@/lib/firebase-helpers';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Belum Diabsen' | 'Libur';
const STATUS_OPTIONS: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Diabsen'];

interface StudentAttendanceCardProps {
    selectedDate: string;
}

export function StudentAttendanceCard({ selectedDate }: StudentAttendanceCardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<string>("0");

    const isFriday = useMemo(() => {
        try { return parseISO(selectedDate).getDay() === 5; } catch (e) { return false; }
    }, [selectedDate]);

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'), where('kelas', '==', Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'student_attendances'), where('date', '==', selectedDate), where('kelas', '==', Number(selectedClass)));
    }, [firestore, selectedDate, selectedClass]);
    const { data: currentAttendance, loading: loadingAttendance } = useCollection<StudentAttendance>(attendanceQuery);

    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [isSaving, setIsSaving] = useState<string | null>(null);

    useEffect(() => {
        const initialAttendance: Record<string, AttendanceStatus> = {};
        if (students) {
            students.forEach(s => { initialAttendance[s.id] = 'Belum Diabsen'; });
        }
        if (currentAttendance) {
            currentAttendance.forEach(record => {
                initialAttendance[record.studentId] = record.status as AttendanceStatus;
            });
        }
        setAttendance(initialAttendance);
    }, [currentAttendance, students]);
    
    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return [...students].sort((a,b) => a.name.localeCompare(b.name));
    }, [students]);

    const isHoliday = useMemo(() => {
        if (!sortedStudents.length || Object.keys(attendance).length === 0) return false;
        return sortedStudents.every(s => attendance[s.id] === 'Libur');
    }, [sortedStudents, attendance]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSaveSingle = async (studentId: string) => {
        if (!firestore || isFriday) return;
        const student = students?.find(s => s.id === studentId);
        if (!student) return;

        setIsSaving(studentId);
        const status = attendance[studentId] || 'Belum Diabsen';
        
        const payload: Omit<StudentAttendance, 'id'>[] = [{
            studentId: student.id,
            studentName: student.name,
            nis: student.nis,
            kelas: Number(selectedClass),
            date: selectedDate,
            status: status as any,
        }];

        try {
            await saveStudentAttendanceBatch(firestore, payload);
            toast({ title: 'Absensi Disimpan', description: `${student.name} ditandai ${status}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
        } finally {
            setIsSaving(null);
        }
    };
    
    const isLoading = loadingStudents || loadingAttendance;

    return (
        <div className="animate-in fade-in duration-300">
            <CardHeader className="pb-3 px-4">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-sm font-bold uppercase tracking-tight text-primary">Daftar Kehadiran Santri</CardTitle>
                            <CardDescription className="text-[10px]">Verifikasi kehadiran harian per kelas.</CardDescription>
                        </div>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-8 text-[10px] font-bold w-[90px] border-primary/20 text-primary rounded-full uppercase">
                                <Users className="h-3 w-3 mr-1" />
                                <SelectValue placeholder="Kelas" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(7).keys()].map(i => <SelectItem key={i} value={String(i)} className="text-xs">Kelas {i}</SelectItem>)}
                            </SelectContent>
                        </Select>
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
                        {sortedStudents && sortedStudents.length > 0 ? sortedStudents.map(student => {
                            const currentStatus = attendance[student.id] || 'Belum Diabsen';
                            return (
                                <div key={student.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border shadow-sm hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={student.avatarUrl} alt={student.name} />
                                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-[11px] font-bold leading-tight uppercase">{student.name}</p>
                                            <p className="text-[9px] text-muted-foreground font-mono">{student.nis}</p>
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
                                                        onSelect={() => handleStatusChange(student.id, opt)}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 rounded-[14px] cursor-pointer focus:bg-muted transition-all text-[11px] font-bold uppercase",
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
                                                                handleSaveSingle(student.id);
                                                            }}
                                                            disabled={isSaving === student.id}
                                                            className="flex items-center justify-center gap-2 p-2 rounded-[14px] cursor-pointer bg-primary text-primary-foreground focus:bg-primary/90 text-[10px] font-bold uppercase"
                                                        >
                                                            {isSaving === student.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
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
                                <p className="text-xs italic">Tidak ada siswa di Kelas {selectedClass}.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </div>
    );
}
