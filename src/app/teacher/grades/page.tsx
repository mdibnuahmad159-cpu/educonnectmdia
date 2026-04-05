"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, Firestore } from "firebase/firestore";
import type { Student, Curriculum, Grade, Schedule, ScheduleEntry } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    Save, 
    BookOpen, 
    Users, 
    ClipboardCheck, 
    AlertCircle, 
    CheckCircle2,
    GraduationCap
} from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useToast } from "@/hooks/use-toast";
import { saveGradesBatch } from "@/lib/firebase-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type GradeType = 'Ganjil' | 'Genap';

export default function TeacherGradesPage() {
    const { user } = useUser();
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [selectedAssignment, setSelectedAssignment] = useState<string>("");
    const [selectedSemester, setSelectedSemester] = useState<GradeType>("Ganjil");
    const [isSaving, setIsSaving] = useState(false);
    const [localGrades, setLocalGrades] = useState<Record<string, number>>({});

    // 1. Fetch all schedules to find teacher assignments
    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(collection(firestore, "schedules"), where("academicYear", "==", activeYear), where("type", "==", "pelajaran"));
    }, [firestore, activeYear]);
    const { data: allSchedules, loading: loadingSchedules } = useCollection<Schedule>(schedulesQuery);

    const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculum, loading: loadingCurriculum } = useCollection<Curriculum>(curriculumQuery);

    // 2. Derive assigned classes and subjects for this teacher
    const assignments = useMemo(() => {
        if (!allSchedules || !user || !curriculum) return [];
        
        const myAssignments = new Map<string, { classLevel: number, subjectId: string, subjectName: string }>();
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'] as const;

        allSchedules.forEach(schedule => {
            days.forEach(day => {
                const entries = schedule[day] || [];
                entries.forEach((entry: ScheduleEntry) => {
                    if (entry.teacherId === user.uid && entry.subjectId) {
                        const subject = curriculum.find(c => c.id === entry.subjectId);
                        if (subject) {
                            const key = `${schedule.classLevel}-${entry.subjectId}`;
                            myAssignments.set(key, {
                                classLevel: schedule.classLevel,
                                subjectId: entry.subjectId,
                                subjectName: subject.subjectName
                            });
                        }
                    }
                });
            });
        });

        return Array.from(myAssignments.values()).sort((a, b) => a.classLevel - b.classLevel || a.subjectName.localeCompare(b.subjectName));
    }, [allSchedules, user, curriculum]);

    const currentAssignment = useMemo(() => {
        if (!selectedAssignment) return null;
        const [classLevel, subjectId] = selectedAssignment.split('-').map((v, i) => i === 0 ? Number(v) : v);
        return assignments.find(a => a.classLevel === classLevel && a.subjectId === subjectId);
    }, [selectedAssignment, assignments]);

    // 3. Fetch students for the selected class
    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || !currentAssignment) return null;
        return query(collection(firestore, "students"), where("kelas", "==", currentAssignment.classLevel));
    }, [firestore, currentAssignment]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);

    // 4. Fetch existing grades for the selected mapel & class
    const gradesQuery = useMemoFirebase(() => {
        if (!firestore || !currentAssignment || !activeYear) return null;
        return query(
            collection(firestore, "grades"), 
            where("subjectId", "==", currentAssignment.subjectId),
            where("academicYear", "==", activeYear),
            where("type", "==", selectedSemester)
        );
    }, [firestore, currentAssignment, activeYear, selectedSemester]);
    const { data: existingGrades, loading: loadingGrades } = useCollection<Grade>(gradesQuery);

    useEffect(() => {
        if (existingGrades && students) {
            const gradeMap: Record<string, number> = {};
            existingGrades.forEach(g => {
                // Only map grades belonging to students in this class
                if (students.some(s => s.id === g.studentId)) {
                    gradeMap[g.studentId] = g.score;
                }
            });
            setLocalGrades(gradeMap);
        } else {
            setLocalGrades({});
        }
    }, [existingGrades, students]);

    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return [...students].sort((a, b) => a.name.localeCompare(b.name));
    }, [students]);

    const handleGradeChange = (studentId: string, value: string) => {
        const score = value === "" ? 0 : Number(value);
        if (isNaN(score) || score < 0 || score > 100) return;
        
        setLocalGrades(prev => ({
            ...prev,
            [studentId]: score
        }));
    };

    const handleSave = async () => {
        if (!firestore || !currentAssignment || !sortedStudents.length) return;
        setIsSaving(true);

        const gradesToSave: Omit<Grade, 'id' | 'updatedAt'>[] = sortedStudents.map(student => ({
            studentId: student.id,
            subjectId: currentAssignment.subjectId,
            academicYear: activeYear,
            type: selectedSemester,
            score: localGrades[student.id] || 0
        }));

        try {
            await saveGradesBatch(firestore, gradesToSave);
            toast({ title: "Nilai Berhasil Disimpan", description: `Data nilai ${currentAssignment.subjectName} Kelas ${currentAssignment.classLevel} telah diperbarui.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menghubungi server." });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = loadingSchedules || loadingCurriculum || loadingGrades || loadingStudents;

    return (
        <div className="space-y-4 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-headline font-bold text-primary flex items-center gap-2">
                        <ClipboardCheck className="h-6 w-6" /> Input Nilai Santri
                    </h1>
                    <p className="text-xs text-muted-foreground">Kelola capaian belajar santri pada mata pelajaran Anda.</p>
                </div>
                <Button 
                    onClick={handleSave} 
                    disabled={isLoading || isSaving || !selectedAssignment} 
                    className="gap-2 h-9"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Simpan Semua Nilai
                </Button>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader className="p-4 pb-2 border-b bg-muted/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <GraduationCap className="h-3 w-3" /> Mata Pelajaran & Kelas
                            </label>
                            <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                                <SelectTrigger className="h-9 text-xs bg-white">
                                    <SelectValue placeholder={assignments.length ? "Pilih Tugas Mengajar" : "Tidak ada tugas mengajar"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignments.map(a => (
                                        <SelectItem key={`${a.classLevel}-${a.subjectId}`} value={`${a.classLevel}-${a.subjectId}`}>
                                            Kelas {a.classLevel} - {a.subjectName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <BookOpen className="h-3 w-3" /> Semester
                            </label>
                            <Select value={selectedSemester} onValueChange={(v) => setSelectedSemester(v as GradeType)}>
                                <SelectTrigger className="h-9 text-xs bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ganjil">Semester Ganjil</SelectItem>
                                    <SelectItem value="Genap">Semester Genap</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {!selectedAssignment ? (
                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground italic text-center px-6">
                            <AlertCircle className="h-12 w-12 mb-3 opacity-10" />
                            <p className="text-sm">Silakan pilih mata pelajaran dan kelas yang ingin diinput nilainya.</p>
                            <p className="text-[10px] mt-1">Daftar muncul berdasarkan jadwal mengajar Anda di Tahun Ajaran {activeYear}.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-[50px] text-center px-4">No</TableHead>
                                        <TableHead>Nama Santri</TableHead>
                                        <TableHead className="w-[120px] text-center">Nilai (0-100)</TableHead>
                                        <TableHead className="w-[100px] text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary/40" />
                                            </TableCell>
                                        </TableRow>
                                    ) : sortedStudents.length > 0 ? (
                                        sortedStudents.map((student, idx) => {
                                            const score = localGrades[student.id] || 0;
                                            const isPassed = score >= 75;
                                            return (
                                                <TableRow key={student.id} className="hover:bg-muted/10 transition-colors">
                                                    <TableCell className="text-center text-[11px] font-mono px-4">{idx + 1}</TableCell>
                                                    <TableCell className="py-3">
                                                        <p className="text-[11px] font-bold uppercase">{student.name}</p>
                                                        <p className="text-[9px] text-muted-foreground font-mono">NIS: {student.nis}</p>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex justify-center">
                                                            <Input 
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                placeholder="0"
                                                                value={localGrades[student.id] === undefined ? "" : localGrades[student.id]}
                                                                onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                                                className={cn(
                                                                    "h-9 w-20 text-center font-mono font-bold text-sm",
                                                                    score > 0 && (isPassed ? "border-green-500 bg-green-50/30 text-green-700" : "border-orange-500 bg-orange-50/30 text-orange-700")
                                                                )}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {score > 0 ? (
                                                            <div className={cn(
                                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                                                isPassed ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                                            )}>
                                                                {isPassed ? (
                                                                    <><CheckCircle2 className="h-2.5 w-2.5" /> Tuntas</>
                                                                ) : (
                                                                    <><Info className="h-2.5 w-2.5" /> Remedi</>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] text-muted-foreground italic">Belum diisi</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs italic">
                                                Tidak ada santri terdaftar di Kelas {currentAssignment.classLevel}.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
                {selectedAssignment && sortedStudents.length > 0 && (
                    <CardFooter className="bg-muted/5 border-t py-3 flex items-center justify-between">
                        <p className="text-[9px] text-muted-foreground italic">
                            * Standar Kriteria Ketuntasan Minimal (KKM) adalah 75. Nilai di bawah itu akan ditandai Remedi.
                        </p>
                        <span className="text-[10px] font-bold text-primary uppercase">Madrasah Diniyah Ibnu Ahmad</span>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
