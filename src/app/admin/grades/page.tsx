
"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, Firestore } from "firebase/firestore";
import type { Student, Curriculum, Grade } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Save, Users, BookOpen, User, CheckCircle2 } from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useToast } from "@/hooks/use-toast";
import { saveGradesBatch } from "@/lib/firebase-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type GradeType = 'PH' | 'UTS' | 'UAS';

export default function GradesPage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<string>("0");
    const [selectedGradeType, setSelectedGradeType] = useState<GradeType>("PH");
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // State lokal untuk menampung input nilai sebelum disimpan
    const [localGrades, setLocalGrades] = useState<Record<string, number>>({});

    // Fetch data siswa berdasarkan kelas
    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "students"), where("kelas", "==", Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);

    // Fetch kurikulum untuk mendapatkan daftar mata pelajaran per kelas
    const curriculumQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "curriculum"), where("classLevel", "==", Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: curriculum, loading: loadingCurriculum } = useCollection<Curriculum>(curriculumQuery);

    // Fetch data nilai yang sudah ada
    const gradesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(
            collection(firestore, "grades"), 
            where("academicYear", "==", activeYear),
            where("type", "==", selectedGradeType)
        );
    }, [firestore, activeYear, selectedGradeType]);
    const { data: existingGrades, loading: loadingGrades } = useCollection<Grade>(gradesQuery);

    // Sinkronisasi data dari Firestore ke state lokal saat data dimuat
    useEffect(() => {
        if (existingGrades) {
            const gradeMap: Record<string, number> = {};
            existingGrades.forEach(g => {
                gradeMap[`${g.studentId}_${g.subjectId}`] = g.score;
            });
            setLocalGrades(gradeMap);
        }
    }, [existingGrades]);

    // Reset student selection when class changes
    useEffect(() => {
        setSelectedStudentId(null);
    }, [selectedClass]);

    const subjects = useMemo(() => {
        if (!curriculum) return [];
        return [...curriculum].sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    }, [curriculum]);

    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return [...students].sort((a, b) => a.name.localeCompare(b.name));
    }, [students]);

    const selectedStudent = useMemo(() => {
        return sortedStudents.find(s => s.id === selectedStudentId);
    }, [sortedStudents, selectedStudentId]);

    const handleGradeChange = (studentId: string, subjectId: string, value: string) => {
        const score = value === "" ? 0 : Number(value);
        if (isNaN(score) || score < 0 || score > 100) return;
        
        setLocalGrades(prev => ({
            ...prev,
            [`${studentId}_${subjectId}`]: score
        }));
    };

    const handleSave = async () => {
        if (!firestore || !sortedStudents.length || !subjects.length) return;
        setIsSaving(true);

        const gradesToSave: Omit<Grade, 'id' | 'updatedAt'>[] = [];

        // Save grades for all students in the class that have data in localGrades
        sortedStudents.forEach(student => {
            subjects.forEach(subject => {
                const key = `${student.id}_${subject.id}`;
                if (localGrades[key] !== undefined) {
                    gradesToSave.push({
                        studentId: student.id,
                        subjectId: subject.id,
                        academicYear: activeYear,
                        type: selectedGradeType,
                        score: localGrades[key]
                    });
                }
            });
        });

        try {
            await saveGradesBatch(firestore, gradesToSave);
            toast({ title: "Nilai Berhasil Disimpan", description: `Data nilai ${selectedGradeType} Kelas ${selectedClass} telah diperbarui.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan data nilai." });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = loadingStudents || loadingCurriculum || loadingGrades;

    // Menghitung berapa banyak nilai yang sudah terisi untuk setiap siswa
    const getStudentProgress = (studentId: string) => {
        if (!subjects.length) return 0;
        let count = 0;
        subjects.forEach(s => {
            if (localGrades[`${studentId}_${s.id}`] > 0) count++;
        });
        return Math.round((count / subjects.length) * 100);
    };

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="p-0 pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-xl">Input Nilai Siswa</CardTitle>
                            <CardDescription>
                                Pilih siswa untuk mengisi nilai pada setiap mata pelajaran.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="w-[110px] h-8 text-xs">
                                    <Users className="h-3.5 w-3.5 mr-2 opacity-70" />
                                    <SelectValue placeholder="Kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...Array(7).keys()].map(i => (
                                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedGradeType} onValueChange={(v) => setSelectedGradeType(v as GradeType)}>
                                <SelectTrigger className="w-[110px] h-8 text-xs">
                                    <BookOpen className="h-3.5 w-3.5 mr-2 opacity-70" />
                                    <SelectValue placeholder="Jenis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PH">PH (Harian)</SelectItem>
                                    <SelectItem value="UTS">UTS (Tengah)</SelectItem>
                                    <SelectItem value="UAS">UAS (Akhir)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleSave} disabled={isLoading || isSaving} size="xs" className="h-8 gap-2 px-4">
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Simpan Semua
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-12rem)]">
                {/* Kolom Kiri: Daftar Siswa */}
                <Card className="md:col-span-4 flex flex-col overflow-hidden">
                    <CardHeader className="p-3 border-b bg-muted/20">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <User className="h-3.5 w-3.5" /> Daftar Siswa
                        </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <div className="p-1">
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                                </div>
                            ) : sortedStudents.length > 0 ? (
                                sortedStudents.map((student) => {
                                    const progress = getStudentProgress(student.id);
                                    return (
                                        <button
                                            key={student.id}
                                            onClick={() => setSelectedStudentId(student.id)}
                                            className={cn(
                                                "w-full text-left p-3 rounded-md transition-all mb-1 group flex items-center justify-between",
                                                selectedStudentId === student.id 
                                                    ? "bg-primary text-primary-foreground shadow-md" 
                                                    : "hover:bg-muted"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">{student.name}</span>
                                                <span className={cn(
                                                    "text-[10px]",
                                                    selectedStudentId === student.id ? "text-primary-foreground/80" : "text-muted-foreground"
                                                )}>{student.nis}</span>
                                            </div>
                                            {progress === 100 && (
                                                <CheckCircle2 className={cn(
                                                    "h-4 w-4",
                                                    selectedStudentId === student.id ? "text-primary-foreground" : "text-green-500"
                                                )} />
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="text-center text-xs text-muted-foreground p-8">Tidak ada siswa di kelas ini.</p>
                            )}
                        </div>
                    </ScrollArea>
                </Card>

                {/* Kolom Kanan: Tabel Nilai */}
                <Card className="md:col-span-8 flex flex-col overflow-hidden">
                    <CardHeader className="p-3 border-b bg-muted/20">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {selectedStudent ? `Input Nilai: ${selectedStudent.name}` : "Pilih Siswa"}
                        </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <CardContent className="p-0">
                            {!selectedStudentId ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center p-6">
                                    <User className="h-12 w-12 mb-3 opacity-10" />
                                    <p className="text-sm">Silakan pilih siswa di sebelah kiri<br/>untuk mulai mengisi nilai.</p>
                                </div>
                            ) : subjects.length > 0 ? (
                                <Table>
                                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[50px] text-center">No.</TableHead>
                                            <TableHead>Mata Pelajaran</TableHead>
                                            <TableHead className="w-[120px] text-center">Nilai (0-100)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subjects.map((subject, index) => {
                                            const key = `${selectedStudentId}_${subject.id}`;
                                            return (
                                                <TableRow key={subject.id} className="hover:bg-muted/30 h-12">
                                                    <TableCell className="text-center text-muted-foreground text-[10px]">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">{subject.subjectName}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase">{subject.subjectCode}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={localGrades[key] === undefined ? "" : localGrades[key]}
                                                            onChange={(e) => handleGradeChange(selectedStudentId, subject.id, e.target.value)}
                                                            className="h-8 w-20 mx-auto text-center text-sm font-bold focus:ring-primary"
                                                            placeholder="0"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center p-6">
                                    <BookOpen className="h-12 w-12 mb-3 opacity-10" />
                                    <p className="text-sm">Kurikulum belum diatur untuk kelas ini.</p>
                                </div>
                            )}
                        </CardContent>
                    </ScrollArea>
                    {selectedStudentId && subjects.length > 0 && (
                        <div className="p-3 border-t bg-muted/10 flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground">
                                Perubahan disimpan sementara di memori hingga Anda menekan "Simpan Semua".
                            </span>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
