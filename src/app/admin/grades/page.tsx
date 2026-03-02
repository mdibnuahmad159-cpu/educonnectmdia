
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
import { Loader2, Save, Users, BookOpen, GraduationCap } from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useToast } from "@/hooks/use-toast";
import { saveGradesBatch } from "@/lib/firebase-helpers";

type GradeType = 'PH' | 'UTS' | 'UAS';

export default function GradesPage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<string>("0");
    const [selectedGradeType, setSelectedGradeType] = useState<GradeType>("PH");
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

    const subjects = useMemo(() => {
        if (!curriculum) return [];
        return [...curriculum].sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    }, [curriculum]);

    const sortedStudents = useMemo(() => {
        if (!students) return [];
        return [...students].sort((a, b) => a.name.localeCompare(b.name));
    }, [students]);

    const handleGradeChange = (studentId: string, subjectId: string, value: string) => {
        const score = value === "" ? 0 : Number(value);
        if (isNaN(score)) return;
        
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
                const score = localGrades[`${student.id}_${subject.id}`] || 0;
                gradesToSave.push({
                    studentId: student.id,
                    subjectId: subject.id,
                    academicYear: activeYear,
                    type: selectedGradeType,
                    score: score
                });
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

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Input Nilai Siswa</CardTitle>
                            <CardDescription>
                                Masukkan nilai akademik berdasarkan kelas dan jenis penilaian.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="w-[120px] h-9">
                                    <Users className="h-4 w-4 mr-2 opacity-70" />
                                    <SelectValue placeholder="Pilih Kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...Array(7).keys()].map(i => (
                                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedGradeType} onValueChange={(v) => setSelectedGradeType(v as GradeType)}>
                                <SelectTrigger className="w-[120px] h-9">
                                    <BookOpen className="h-4 w-4 mr-2 opacity-70" />
                                    <SelectValue placeholder="Jenis Nilai" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PH">PH (Harian)</SelectItem>
                                    <SelectItem value="UTS">UTS (Tengah)</SelectItem>
                                    <SelectItem value="UAS">UAS (Akhir)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleSave} disabled={isLoading || isSaving} className="h-9 gap-2">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Simpan
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-sm">Menyiapkan tabel nilai...</span>
                        </div>
                    ) : sortedStudents.length > 0 && subjects.length > 0 ? (
                        <div className="border rounded-md overflow-hidden bg-card">
                            <div className="overflow-x-auto">
                                <Table className="border-collapse">
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="sticky left-0 z-20 bg-muted/50 border-r min-w-[180px] font-bold">
                                                Nama Siswa
                                            </TableHead>
                                            {subjects.map(subject => (
                                                <TableHead key={subject.id} className="text-center border-r min-w-[100px] text-[10px] font-bold leading-tight py-2">
                                                    <span className="block uppercase text-primary/70 mb-1">{subject.subjectCode}</span>
                                                    {subject.subjectName}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedStudents.map(student => (
                                            <TableRow key={student.id} className="hover:bg-muted/30">
                                                <TableCell className="sticky left-0 z-10 bg-card border-r font-medium text-xs py-3">
                                                    {student.name}
                                                    <span className="block text-[9px] text-muted-foreground font-normal">{student.nis}</span>
                                                </TableCell>
                                                {subjects.map(subject => {
                                                    const key = `${student.id}_${subject.id}`;
                                                    return (
                                                        <TableCell key={subject.id} className="p-1 border-r text-center">
                                                            <Input 
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={localGrades[key] === undefined ? "" : localGrades[key]}
                                                                onChange={(e) => handleGradeChange(student.id, subject.id, e.target.value)}
                                                                className="h-8 w-full text-center text-xs border-none bg-transparent focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                                                                placeholder="0"
                                                            />
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground text-center p-6">
                            <GraduationCap className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">Data Belum Tersedia</p>
                            <p className="text-xs max-w-[250px] mt-1">
                                {!sortedStudents.length ? `Tidak ada siswa terdaftar di Kelas ${selectedClass}.` : `Kurikulum (Mata Pelajaran) untuk Kelas ${selectedClass} belum diatur.`}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
