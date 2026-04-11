
"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Firestore } from 'firebase/firestore';
import type { Student, StudentAttendance, Schedule, ScheduleEntry, Teacher } from '@/types';
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
import { Loader2, Calendar, Users, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveStudentAttendanceBatch } from '@/lib/firebase-helpers';
import { useAcademicYear } from '@/context/academic-year-provider';
import Link from 'next/link';

type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
const STATUS_OPTIONS: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa'];

export default function TeacherStudentAttendancePage() {
    const firestore = useFirestore() as Firestore;
    const { toast } = useToast();
    const { activeYear } = useAcademicYear();

    const [nig, setNig] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setNig(sessionStorage.getItem('teacherNig'));
        setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    }, []);

    // 1. Fetch Teacher Profile to check if they are a Wali Kelas
    const { data: teachers } = useCollection<Teacher>(useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]));
    const currentTeacher = useMemo(() => teachers?.find(t => t.id === nig), [teachers, nig]);

    // 2. Fetch Schedules to find teaching assignments
    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(collection(firestore, "schedules"), where("academicYear", "==", activeYear), where("type", "==", "pelajaran"));
    }, [firestore, activeYear]);
    const { data: allSchedules } = useCollection<Schedule>(schedulesQuery);

    // 3. Determine which classes this teacher can take attendance for
    const assignedClasses = useMemo(() => {
        const classes = new Set<number>();
        
        // Add classes from teaching schedule
        if (allSchedules && nig) {
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'] as const;
            allSchedules.forEach(schedule => {
                days.forEach(day => {
                    const entries = schedule[day] || [];
                    if (entries.some((e: ScheduleEntry) => e.teacherId === nig)) {
                        classes.add(schedule.classLevel);
                    }
                });
            });
        }

        // Add class if they are a Wali Kelas
        if (currentTeacher?.jabatan?.startsWith('Wali Kelas ')) {
            const match = currentTeacher.jabatan.match(/\d+/);
            if (match) classes.add(parseInt(match[0]));
        }

        return Array.from(classes).sort((a, b) => a - b);
    }, [allSchedules, nig, currentTeacher]);

    // Auto-select first class if not selected
    useEffect(() => {
        if (assignedClasses.length > 0 && !selectedClass) {
            setSelectedClass(String(assignedClasses[0]));
        }
    }, [assignedClasses, selectedClass]);

    // 4. Fetch Students for the selected class
    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || !selectedClass) return null;
        return query(collection(firestore, 'students'), where('kelas', '==', Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);
    
    // 5. Fetch existing attendance for this class/date
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !selectedDate || !selectedClass) return null;
        return query(
            collection(firestore, 'student_attendances'), 
            where('date', '==', selectedDate), 
            where('kelas', '==', Number(selectedClass))
        );
    }, [firestore, selectedDate, selectedClass]);
    const { data: currentAttendance, loading: loadingAttendance } = useCollection<StudentAttendance>(attendanceQuery);

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
        if (!firestore || !sortedStudents.length || !selectedClass || !selectedDate) return;
        setIsSaving(true);

        const attendancePayload: Omit<StudentAttendance, 'id'>[] = sortedStudents.map(student => ({
            studentId: student.id,
            studentName: student.name,
            nis: student.nis,
            kelas: Number(selectedClass),
            date: selectedDate,
            status: attendance[student.id] || 'Hadir', // Default to Hadir for convenience
        }));
        
        try {
            await saveStudentAttendanceBatch(firestore, attendancePayload);
            toast({ title: 'Absensi Berhasil Disimpan', description: `Data kehadiran Kelas ${selectedClass} tanggal ${selectedDate} telah diperbarui.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Pastikan koneksi internet stabil.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = loadingStudents || loadingAttendance || !nig;
    const dateFormatted = useMemo(() => {
        if (!selectedDate) return "";
        try {
            return format(parseISO(selectedDate), "EEEE, d MMMM yyyy", { locale: id });
        } catch (e) {
            return selectedDate;
        }
    }, [selectedDate]);

    return (
        <div className="space-y-4 pb-10">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/teacher/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-headline font-bold text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6" /> Absensi Santri
                </h1>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader className="p-4 pb-2 border-b bg-muted/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Users className="h-3 w-3" /> Pilih Kelas
                            </label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="h-9 text-xs bg-white">
                                    <SelectValue placeholder="Pilih Kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignedClasses.length > 0 ? (
                                        assignedClasses.map(cl => (
                                            <SelectItem key={cl} value={String(cl)}>Kelas {cl}</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>Tidak ada kelas terdaftar</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Calendar className="h-3 w-3" /> Tanggal
                            </label>
                            <Input 
                                type="date" 
                                value={selectedDate} 
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="h-9 text-xs bg-white"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {assignedClasses.length === 0 && !isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground italic text-center px-6">
                            <AlertCircle className="h-12 w-12 mb-3 opacity-10" />
                            <p className="text-sm">Anda belum memiliki tugas mengajar atau jabatan Wali Kelas.</p>
                            <p className="text-[10px] mt-1">Harap hubungi Admin jika jadwal belum sinkron.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-[50px] text-center px-4">No</TableHead>
                                        <TableHead>Nama Santri</TableHead>
                                        <TableHead className="w-[140px] text-center">Status Kehadiran</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-32 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary/40" />
                                            </TableCell>
                                        </TableRow>
                                    ) : sortedStudents.length > 0 ? (
                                        sortedStudents.map((student, idx) => (
                                            <TableRow key={student.id} className="hover:bg-muted/10 transition-colors">
                                                <TableCell className="text-center text-[11px] font-mono px-4">{idx + 1}</TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={student.avatarUrl} alt={student.name} />
                                                            <AvatarFallback className="text-[10px]">{student.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-[11px] font-bold uppercase leading-tight">{student.name}</p>
                                                            <p className="text-[9px] text-muted-foreground font-mono">NIS: {student.nis}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Select
                                                        value={attendance[student.id] || 'Hadir'}
                                                        onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                                                    >
                                                        <SelectTrigger className={cn(
                                                            "h-8 text-[10px] font-bold uppercase",
                                                            attendance[student.id] === 'Hadir' || !attendance[student.id] ? "text-green-600 border-green-200 bg-green-50/30" : 
                                                            attendance[student.id] === 'Alpa' ? "text-red-600 border-red-200 bg-red-50/30" : "text-orange-600 border-orange-200 bg-orange-50/30"
                                                        )}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {STATUS_OPTIONS.map(status => (
                                                                <SelectItem key={status} value={status} className="text-xs">
                                                                    {status}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-32 text-center text-muted-foreground text-xs italic">
                                                Tidak ada santri terdaftar di Kelas {selectedClass}.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
                {selectedClass && sortedStudents.length > 0 && (
                    <CardFooter className="bg-muted/5 border-t py-4 flex flex-col gap-3">
                        <div className="w-full flex items-center justify-between">
                            <div className="text-[10px] text-muted-foreground">
                                <p className="font-bold text-primary mb-1 uppercase tracking-tight">{dateFormatted}</p>
                                <p>Pastikan data sudah benar sebelum menyimpan.</p>
                            </div>
                            <Button 
                                onClick={handleSave} 
                                disabled={isLoading || isSaving} 
                                className="gap-2 px-6 shadow-md"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Absensi"}
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
