
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
import { Loader2, Save, Users, BookOpen, User, CheckCircle2, Info, ArrowLeft, BarChart3, TrendingUp } from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useToast } from "@/hooks/use-toast";
import { saveGradesBatch } from "@/lib/firebase-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type GradeType = 'Ganjil' | 'Genap';

export default function GradesPage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<string>("0");
    const [selectedGradeType, setSelectedGradeType] = useState<GradeType>("Ganjil");
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
    }, [selectedClass, selectedGradeType]);

    const subjects = useMemo(() => {
        if (!curriculum) return [];
        return [...curriculum].sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    }, [curriculum]);

    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return [...students].sort((a, b) => a.name.localeCompare(b.name));
    }, [students]);

    // Calculate stats and ranking reactively
    const studentsWithStats = useMemo(() => {
        if (!sortedStudents.length) return [];

        const stats = sortedStudents.map(student => {
            let total = 0;
            subjects.forEach(subject => {
                const score = localGrades[`${student.id}_${subject.id}`] || 0;
                total += score;
            });
            const average = subjects.length > 0 ? total / subjects.length : 0;
            return {
                ...student,
                total,
                average,
            };
        });

        // Sort by total score to determine rank
        const ranked = [...stats].sort((a, b) => b.total - a.total);
        
        return stats.map(student => {
            const rank = ranked.findIndex(s => s.id === student.id) + 1;
            return { ...student, rank };
        });
    }, [sortedStudents, subjects, localGrades]);

    const selectedStudent = useMemo(() => {
        return studentsWithStats.find(s => s.id === selectedStudentId);
    }, [studentsWithStats, selectedStudentId]);

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
            toast({ title: "Nilai Berhasil Disimpan", description: `Data nilai Semester ${selectedGradeType} Kelas ${selectedClass} telah diperbarui.` });
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
        <div className="space-y-4 max-w-full overflow-hidden font-body">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="p-0 pb-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <CardTitle className="text-lg font-headline text-primary font-normal">Input Nilai</CardTitle>
                            <CardDescription className="text-[10px]">
                                Semester {selectedGradeType} TA {activeYear}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="flex-1 sm:w-[100px] h-8 text-xs font-normal">
                                    <Users className="h-3 w-3 mr-1.5 opacity-70" />
                                    <SelectValue placeholder="Kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...Array(7).keys()].map(i => (
                                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedGradeType} onValueChange={(v) => setSelectedGradeType(v as GradeType)}>
                                <SelectTrigger className="flex-1 sm:w-[100px] h-8 text-xs font-normal">
                                    <BookOpen className="h-3 w-3 mr-1.5 opacity-70" />
                                    <SelectValue placeholder="Semester" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ganjil">Ganjil</SelectItem>
                                    <SelectItem value="Genap">Genap</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button 
                                onClick={handleSave} 
                                disabled={isLoading || isSaving} 
                                size="xs" 
                                className="w-full sm:w-auto h-8 gap-1.5 px-3 shadow-sm bg-primary hover:bg-primary/90 font-normal"
                            >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                Simpan
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-13rem)] sm:h-[calc(100vh-11rem)]">
                <Card className={cn(
                    "w-full md:w-[350px] flex flex-col overflow-hidden shadow-sm border-primary/10 transition-all duration-300",
                    selectedStudentId ? "hidden md:flex" : "flex"
                )}>
                    <CardHeader className="p-3 border-b bg-primary/5 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-2 font-normal">
                            <Users className="h-3 w-3" /> Daftar Siswa
                        </CardTitle>
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {studentsWithStats.length} SISWA
                        </span>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <Table>
                            <TableHeader className="bg-muted/20">
                                <TableRow className="h-8 hover:bg-transparent">
                                    <TableHead className="w-[30px] text-center text-[9px] p-0 font-normal">RK</TableHead>
                                    <TableHead className="text-[9px] p-2 font-normal">Nama</TableHead>
                                    <TableHead className="w-[45px] text-center text-[9px] p-0 font-normal">Total</TableHead>
                                    <TableHead className="w-[40px] text-center text-[9px] p-0 font-normal">Rata</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary/40" />
                                        </TableCell>
                                    </TableRow>
                                ) : studentsWithStats.length > 0 ? (
                                    studentsWithStats.map((student) => {
                                        const progress = getStudentProgress(student.id);
                                        const isSelected = selectedStudentId === student.id;
                                        return (
                                            <TableRow 
                                                key={student.id} 
                                                className={cn(
                                                    "cursor-pointer transition-colors group h-14",
                                                    isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
                                                )}
                                                onClick={() => setSelectedStudentId(student.id)}
                                            >
                                                <TableCell className="text-center font-mono text-[10px] p-0">
                                                    <span className={cn(
                                                        "w-5 h-5 rounded-full inline-flex items-center justify-center",
                                                        student.rank === 1 ? "bg-yellow-100 text-yellow-700" : 
                                                        student.rank === 2 ? "bg-slate-100 text-slate-600" :
                                                        student.rank === 3 ? "bg-orange-100 text-orange-700" : "text-muted-foreground"
                                                    )}>
                                                        {student.rank}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2 pr-2">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className={cn(
                                                                "text-[11px] truncate max-w-[120px]",
                                                                isSelected ? "text-primary" : "text-foreground"
                                                            )}>
                                                                {student.name}
                                                            </span>
                                                            {progress === 100 && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                                        </div>
                                                        <Progress value={progress} className="h-0.5 bg-muted" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-[10px] p-0 text-muted-foreground">
                                                    {student.total}
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-[10px] p-0 text-primary/70">
                                                    {student.average.toFixed(1)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-[10px] text-muted-foreground italic">
                                            Belum ada siswa di kelas ini.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Card>

                <Card className={cn(
                    "flex-1 flex flex-col overflow-hidden shadow-sm border-primary/10 transition-all duration-300",
                    !selectedStudentId ? "hidden md:flex" : "flex"
                )}>
                    <CardHeader className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="md:hidden h-7 w-7" 
                                onClick={() => setSelectedStudentId(null)}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-normal">
                                <BookOpen className="h-3 w-3" /> Input Nilai Semester {selectedGradeType}
                            </CardTitle>
                        </div>
                        {selectedStudent && (
                            <div className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] uppercase shadow-sm truncate max-w-[150px] sm:max-w-none font-normal">
                                {selectedStudent.name}
                            </div>
                        )}
                    </CardHeader>
                    
                    <ScrollArea className="flex-1">
                        {!selectedStudentId ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12 text-center">
                                <User className="h-12 w-12 mb-4 opacity-5" />
                                <p className="text-sm opacity-40">Pilih Siswa Terlebih Dahulu</p>
                                <p className="text-[10px] opacity-30 mt-1 font-normal">Pilih salah satu nama siswa di panel kiri untuk mulai menginput nilai.</p>
                            </div>
                        ) : subjects.length > 0 ? (
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm">
                                    <TableRow className="h-9">
                                        <TableHead className="w-[40px] text-center text-[10px] p-0 font-normal">No</TableHead>
                                        <TableHead className="text-[10px] p-2 font-normal">Mata Pelajaran</TableHead>
                                        <TableHead className="w-[100px] sm:w-[140px] text-center text-[10px] p-2 font-normal">Nilai</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjects.map((subject, index) => {
                                        const key = `${selectedStudentId}_${subject.id}`;
                                        const val = localGrades[key];
                                        return (
                                            <TableRow key={subject.id} className="hover:bg-muted/30 h-16 sm:h-14">
                                                <TableCell className="text-center font-mono text-[10px] text-muted-foreground p-0">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs leading-tight font-normal">{subject.subjectName}</span>
                                                        <span className="text-[9px] text-muted-foreground font-mono uppercase mt-0.5">
                                                            {subject.subjectCode} • {subject.bookName || 'No Kitab'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Input 
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={val === undefined ? "" : val}
                                                            onChange={(e) => handleGradeChange(selectedStudentId, subject.id, e.target.value)}
                                                            className={cn(
                                                                "h-10 sm:h-9 w-16 sm:w-20 text-center font-mono text-sm shadow-inner transition-all",
                                                                val > 0 ? "border-primary/50 text-primary bg-primary/5" : "border-input"
                                                            )}
                                                            placeholder="0"
                                                        />
                                                        <div className={cn(
                                                            "hidden sm:flex items-center justify-center w-8 h-8 rounded-full border text-[8px]",
                                                            val >= 75 ? "bg-green-50 text-green-600 border-green-200" : val > 0 ? "bg-orange-50 text-orange-500 border-orange-200" : "text-muted-foreground/20 border-muted/20"
                                                        )}>
                                                            {val >= 75 ? 'PASS' : val > 0 ? 'REM' : '-'}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12 text-center">
                                <BookOpen className="h-12 w-12 mb-4 opacity-5" />
                                <p className="text-sm opacity-40">Kurikulum Belum Ada</p>
                                <p className="text-[10px] opacity-30 mt-1 font-normal">Harap atur kurikulum untuk Kelas {selectedClass} di menu Kurikulum.</p>
                            </div>
                        )}
                    </ScrollArea>
                    
                    {selectedStudent && (
                        <div className="p-3 border-t bg-primary/5 grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center justify-center border-r border-primary/10">
                                <span className="text-[8px] text-muted-foreground uppercase tracking-tighter">Total Nilai</span>
                                <span className="text-sm font-mono text-primary">{selectedStudent.total}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center border-r border-primary/10">
                                <span className="text-[8px] text-muted-foreground uppercase tracking-tighter">Rata-rata</span>
                                <span className="text-sm font-mono text-primary">{selectedStudent.average.toFixed(1)}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-[8px] text-muted-foreground uppercase tracking-tighter">Ranking</span>
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                    <span className="text-sm font-mono text-primary">{selectedStudent.rank}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-3 border-t bg-muted/5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-[9px] text-muted-foreground">≥ 75 Lulus</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground italic flex items-center gap-1 font-normal">
                            <Info className="h-3 w-3" /> Tekan tombol Simpan untuk mempermanenkan
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
