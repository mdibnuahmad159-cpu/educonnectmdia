"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Student, StudentAttendance } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveStudentAttendanceBatch } from '@/lib/firebase-helpers';
import { DatePickerHorizontal } from './date-picker-horizontal';

type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
const STATUS_OPTIONS: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa'];

export function StudentAttendanceCard() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentAttendance) {
            const initialAttendance = currentAttendance.reduce((acc, record) => {
                acc[record.studentId] = record.status;
                return acc;
            }, {} as Record<string, AttendanceStatus>);
            setAttendance(initialAttendance);
        } else {
            setAttendance({});
        }
    }, [currentAttendance]);
    
    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return [...students].sort((a,b) => a.name.localeCompare(b.name));
    }, [students]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSave = async () => {
        if (!firestore || !sortedStudents.length || isFriday) return;
        setIsSaving(true);
        const payload: Omit<StudentAttendance, 'id'>[] = sortedStudents.map(student => ({
            studentId: student.id,
            studentName: student.name,
            nis: student.nis,
            kelas: Number(selectedClass),
            date: selectedDate,
            status: attendance[student.id] || 'Alpa',
        }));
        try {
            await saveStudentAttendanceBatch(firestore, payload);
            toast({ title: 'Absensi Disimpan', description: `Data berhasil disimpan.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = loadingStudents || loadingAttendance;

    return (
        <Card className="shadow-none border-none">
            <CardHeader className="pb-3 px-4">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg font-headline">Absensi Siswa</CardTitle>
                            <CardDescription>Pilih kelas dan kelola kehadiran santri harian.</CardDescription>
                        </div>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-8 text-xs w-[100px] border-primary/20 text-primary">
                                <Users className="h-3 w-3 mr-1" />
                                <SelectValue placeholder="Kelas" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(7).keys()].map(i => <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DatePickerHorizontal 
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                    />
                </div>
            </CardHeader>
            <CardContent className="px-4">
                {isFriday ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-blue-50/50 rounded-xl border border-dashed border-blue-200 text-blue-700">
                        <Coffee className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-xs font-bold uppercase">Hari Libur (Jum'at)</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedStudents && sortedStudents.length > 0 ? sortedStudents.map(student => (
                            <div key={student.id} className="flex items-center justify-between p-2 rounded-xl bg-card border shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={student.avatarUrl} alt={student.name} />
                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-xs font-bold leading-tight">{student.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{student.nis}</p>
                                    </div>
                                </div>
                                <Select
                                    value={attendance[student.id] || ''}
                                    onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                                >
                                    <SelectTrigger className="w-[100px] h-8 text-[10px] bg-muted/30">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )) : (
                            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl opacity-50">
                                <p className="text-xs italic">Tidak ada siswa di Kelas {selectedClass}.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            {!isFriday && sortedStudents && sortedStudents.length > 0 && (
                <CardFooter className="px-4 pb-4 pt-0 mt-4">
                    <Button onClick={handleSave} disabled={isLoading || isSaving} className="w-full h-11 font-bold shadow-lg">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Simpan Absensi Kelas ${selectedClass}`}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}