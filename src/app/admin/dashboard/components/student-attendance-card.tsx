"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Student, StudentAttendance } from '@/types';
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
import { Loader2, Calendar, Users, AlertTriangle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveStudentAttendanceBatch } from '@/lib/firebase-helpers';

type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
const STATUS_OPTIONS: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa'];

export function StudentAttendanceCard() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedClass, setSelectedClass] = useState<string>("0");

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'), where('kelas', '==', Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'student_attendances'), where('date', '==', selectedDate), where('kelas', '==', Number(selectedClass)));
    }, [firestore, selectedDate, selectedClass]);
    const { data: currentAttendance, loading: loadingAttendance, error: attendanceError } = useCollection<StudentAttendance>(attendanceQuery);

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

    const indexLink = useMemo(() => {
        if (!attendanceError) return null;
        const match = attendanceError.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        return match ? match[0] : null;
    }, [attendanceError]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSave = async () => {
        if (!firestore || !sortedStudents.length) return;
        setIsSaving(true);

        const attendancePayload: Omit<StudentAttendance, 'id'>[] = sortedStudents.map(student => ({
            studentId: student.id,
            studentName: student.name,
            nis: student.nis,
            kelas: Number(selectedClass),
            date: selectedDate,
            status: attendance[student.id] || 'Alpa',
        }));
        
        try {
            await saveStudentAttendanceBatch(firestore, attendancePayload);
            toast({ title: 'Absensi Disimpan', description: `Absensi Kelas ${selectedClass} untuk tanggal ${selectedDate} telah disimpan.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan absensi.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = loadingStudents || loadingAttendance;
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
                        <CardTitle>Absensi Siswa</CardTitle>
                        <CardDescription>{dateFormatted}</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-8 text-xs w-[100px]">
                                <Users className="h-3 w-3 mr-1" />
                                <SelectValue placeholder="Kelas" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(7).keys()].map(i => (
                                    <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="h-8 text-xs w-full sm:w-[130px]"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {attendanceError && (
                    <div className="mb-4 p-3 rounded border border-destructive/20 bg-destructive/5 text-destructive text-[10px]">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="font-bold">Eror Kueri Database</span>
                        </div>
                        {indexLink ? (
                            <>
                                <p className="mb-2 leading-relaxed">Indeks komposit diperlukan untuk kueri ini. Harap buat melalui tombol di bawah.</p>
                                <Button variant="destructive" size="xs" className="h-7 px-2 text-[9px] gap-1" asChild>
                                    <a href={indexLink} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3" /> BUAT INDEKS
                                    </a>
                                </Button>
                            </>
                        ) : (
                            <p>{attendanceError.message}</p>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {sortedStudents && sortedStudents.length > 0 ? sortedStudents.map(student => (
                            <div key={student.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={student.avatarUrl} alt={student.name} />
                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium">{student.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{student.nis}</span>
                                    </div>
                                </div>
                                <Select
                                    value={attendance[student.id] || ''}
                                    onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                                >
                                    <SelectTrigger className="w-[100px] h-7 text-[10px]">
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
                                Tidak ada siswa di Kelas {selectedClass}.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
            {sortedStudents && sortedStudents.length > 0 && (
                <CardFooter>
                    <Button onClick={handleSave} disabled={isLoading || isSaving} className="w-full text-xs h-9">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Simpan Absensi Kelas ${selectedClass}`}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
