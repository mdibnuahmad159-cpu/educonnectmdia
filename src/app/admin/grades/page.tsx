
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
import { Loader2, Save, Users, BookOpen, User, CheckCircle2, Info } from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useToast } from "@/hooks/use-toast";
import { saveGradesBatch } from "@/lib/firebase-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type GradeType = 'PH' | 'UTS' | 'UAS';

export default function GradesPage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<string>("0");
    const [selectedGradeType, setSelectedGradeType] = useState<GradeType>("PH");
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [localGrades, setLocalGrades] = useState<Record<string, number>>({});

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "students"), where("kelas", "==", Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);

    const curriculumQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "curriculum"), where("classLevel", "==", Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: curriculum, loading: loadingCurriculum } = useCollection<Curriculum>(curriculumQuery);

    const gradesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(
            collection(firestore, "grades"), 
            where("academicYear", "==", activeYear),
            where("type", "==", selectedGradeType)
        );
    }, [firestore, activeYear, selectedGradeType]);
    const { data: existingGrades, loading: loadingGrades } = useCollection<Grade>(gradesQuery);

    useEffect(() => {
        if (existingGrades) {
            const gradeMap: Record<string, number> = {};
            existingGrades.forEach(g => {
                gradeMap[`${g.studentId}_${g.subjectId}`] = g.score;
            });
            setLocalGrades(gradeMap);
        }
    }, [existingGrades]);

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

    const getStudentProgress = (studentId: string) => {
        if (!subjects.length) return 0;
        let count = 0;
        subjects.forEach(s => {
            if (localGrades[`${studentId}_${s.id}`] > 0) count++;
        });
        return Math.round((count / subjects.length) * 100);
    };

    const isLoading = loadingStudents || loadingCurriculum || loadingGrades;

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="p-0 pb-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold font-headline text-primary">Manajemen Nilai</CardTitle>
                            <CardDescription>
                                Pengisian nilai {selectedGradeType} Tahun Ajaran {activeYear}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="w-[110px] h-8 text-xs font-semibold">
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
                                <SelectTrigger className="w-[110px] h-8 text-xs font-semibold">
                                    <BookOpen className="h-3.5 w-3.5 mr-2 opacity-70" />
                                    <SelectValue placeholder="Jenis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PH">PH (Harian)</SelectItem>
                                    <SelectItem value="UTS">UTS (Tengah)</SelectItem>
                                    <SelectItem value="UAS">UAS (Akhir)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleSave} disabled={isLoading || isSaving} size="xs" className="h-8 gap-2 px-4 shadow-sm">
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Simpan Semua
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-12rem)] overflow-hidden">
                {/* Tabel Nama Siswa (Sisi Kiri) */}
                <Card className="w-full md:w-[320px] flex flex-col overflow-hidden shadow-sm border-primary/10">
                    <CardHeader className="p-3 border-b bg-primary/5">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            <Users className="h-3 w-3" /> Tabel Nama Siswa
                        </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                <TableRow className="h-8">
                                    <TableHead className="w-[40px] text-center text-[10px]">No</TableHead>
                                    <TableHead className="text-[10px]">Nama Lengkap</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary/40" />
                                        </TableCell>
                                    </TableRow>
                                ) : sortedStudents.length > 0 ? (
                                    sortedStudents.map((student, index) => {
                                        const progress = getStudentProgress(student.id);
                                        const isSelected = selectedStudentId === student.id;
                                        return (
                                            <TableRow 
                                                key={student.id} 
                                                className={cn(
                                                    "cursor-pointer transition-colors group h-12",
                                                    isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
                                                )}
                                                onClick={() => setSelectedStudentId(student.id)}
                                            >
                                                <TableCell className="text-center font-mono text-[10px] text-muted-foreground">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className={cn(
                                                                "text-xs font-bold truncate max-w-[160px]",
                                                                isSelected ? "text-primary" : "text-foreground"
                                                            )}>
                                                                {student.name}
                                                            </span>
                                                            {progress === 100 ? (
                                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                            ) : progress > 0 ? (
                                                                <span className="text-[9px] text-orange-500 font-mono font-bold">{progress}%</span>
                                                            ) : null}
                                                        </div>
                                                        <Progress value={progress} className="h-1 bg-muted" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center text-[10px] text-muted-foreground">
                                            Tidak ada data siswa.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Card>

                {/* Tabel Input Nilai (Sisi Kanan) */}
                <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-primary/10">
                    <CardHeader className="p-3 border-b bg-muted/20">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <BookOpen className="h-3 w-3" /> Tabel Nilai & Mapel
                            </CardTitle>
                            {selectedStudent && (
                                <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase border border-primary/20">
                                    {selectedStudent.name}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        {!selectedStudentId ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12">
                                <Info className="h-10 w-10 mb-4 opacity-10" />
                                <p className="text-sm font-medium">Silakan pilih siswa dari tabel kiri</p>
                                <p className="text-xs opacity-60">Pilih nama siswa untuk mengaktifkan tabel input nilai.</p>
                            </div>
                        ) : subjects.length > 0 ? (
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                    <TableRow className="h-8">
                                        <TableHead className="w-[50px] text-center text-[10px]">No</TableHead>
                                        <TableHead className="text-[10px]">Mata Pelajaran</TableHead>
                                        <TableHead className="w-[140px] text-center text-[10px]">Input Nilai</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjects.map((subject, index) => {
                                        const key = `${selectedStudentId}_${subject.id}`;
                                        return (
                                            <TableRow key={subject.id} className="hover:bg-muted/30 h-14">
                                                <TableCell className="text-center font-mono text-[10px] text-muted-foreground">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold">{subject.subjectName}</span>
                                                        <span className="text-[9px] text-muted-foreground font-mono uppercase">
                                                            {subject.subjectCode} • {subject.bookName || 'Kitab belum diatur'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Input 
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={localGrades[key] === undefined ? "" : localGrades[key]}
                                                            onChange={(e) => handleGradeChange(selectedStudentId, subject.id, e.target.value)}
                                                            className={cn(
                                                                "h-9 w-20 text-center font-mono font-bold text-sm shadow-inner transition-all focus:ring-2 focus:ring-primary",
                                                                localGrades[key] > 0 ? "border-primary/50 text-primary bg-primary/5" : "border-input"
                                                            )}
                                                            placeholder="0"
                                                        />
                                                        <span className={cn(
                                                            "text-[10px] font-bold w-10 text-center",
                                                            localGrades[key] >= 75 ? "text-green-600" : localGrades[key] > 0 ? "text-orange-500" : "text-muted-foreground/30"
                                                        )}>
                                                            {localGrades[key] >= 75 ? 'LULUS' : localGrades[key] > 0 ? 'REMID' : '-'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12">
                                <BookOpen className="h-10 w-10 mb-4 opacity-10" />
                                <p className="text-sm font-medium">Kurikulum belum diatur</p>
                                <p className="text-xs opacity-60">Atur kurikulum Kelas {selectedClass} terlebih dahulu.</p>
                            </div>
                        )}
                    </ScrollArea>
                    <div className="p-2 border-t bg-muted/10 text-right">
                        <p className="text-[9px] text-muted-foreground italic">
                            * Nilai disimpan sementara di aplikasi. Tekan <strong>Simpan Semua</strong> di atas untuk menyimpan ke database.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
