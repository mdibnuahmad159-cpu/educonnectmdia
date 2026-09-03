"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { Student, Grade, ReportSummary, Curriculum } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    FileText, 
    Award, 
    ExternalLink, 
    Trophy,
    TrendingUp,
    Calendar,
    Users
} from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ParentReportsPage() {
    const [nis, setNis] = useState<string | null>(null);
    const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const firestore = useFirestore();
    const { activeYear, availableYears } = useAcademicYear();
    const [displayYear, setDisplayYear] = useState<string>("");

    useEffect(() => {
        setNis(sessionStorage.getItem('studentNis'));
        if (activeYear) {
            setDisplayYear(activeYear);
        }
    }, [activeYear]);

    const studentRef = useMemoFirebase(() => nis && firestore ? doc(firestore, "students", nis) : null, [firestore, nis]);
    const { data: student } = useDoc<Student>(studentRef);

    const gradesQuery = useMemoFirebase(() => {
        if (!firestore || !nis || !displayYear) return null;
        return query(
            collection(firestore, "grades"), 
            where("studentId", "==", nis),
            where("academicYear", "==", displayYear),
            where("type", "==", selectedSemester)
        );
    }, [firestore, nis, displayYear, selectedSemester]);
    const { data: grades, loading: loadingGrades } = useCollection<Grade>(gradesQuery);

    const summaryQuery = useMemoFirebase(() => {
        if (!firestore || !nis || !displayYear) return null;
        return query(
            collection(firestore, "report_summaries"),
            where("studentId", "==", nis),
            where("academicYear", "==", displayYear),
            where("semester", "==", selectedSemester)
        );
    }, [firestore, nis, displayYear, selectedSemester]);
    const { data: summaryData } = useCollection<ReportSummary>(summaryQuery);

    const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculum } = useCollection<Curriculum>(curriculumQuery);

    const summary = summaryData?.[0];

    const processedGrades = useMemo(() => {
        if (!grades || !curriculum) return [];
        return grades.map(g => {
            const subject = curriculum.find(c => c.id === g.subjectId);
            return { 
                ...g, 
                subjectName: subject?.subjectName || 'Mata Pelajaran',
                classLevel: subject?.classLevel 
            };
        }).sort((a,b) => a.subjectName.localeCompare(b.subjectName));
    }, [grades, curriculum]);

    // Derived class level for the selected academic year
    const classAtYear = useMemo(() => {
        if (processedGrades.length > 0) {
            // Find the class level from the first valid subject grade
            const gradeWithClass = processedGrades.find(g => g.classLevel !== undefined);
            if (gradeWithClass) return gradeWithClass.classLevel;
        }
        // Fallback if no grades but looking at current year
        if (displayYear === activeYear) return student?.kelas;
        return null;
    }, [processedGrades, student, displayYear, activeYear]);

    const stats = useMemo(() => {
        if (!processedGrades.length) return { total: 0, avg: 0 };
        const total = processedGrades.reduce((acc, g) => acc + g.score, 0);
        const avg = total / processedGrades.length;
        return { total, avg: avg.toFixed(1) };
    }, [processedGrades]);

    if (!nis || loadingGrades || !displayYear) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={displayYear} onValueChange={setDisplayYear}>
                        <SelectTrigger className="h-9 text-[10px] font-bold uppercase tracking-wider bg-muted border-none w-full sm:w-[140px] rounded-xl focus:ring-0">
                            <Calendar className="h-3 w-3 mr-2 opacity-50" />
                            <SelectValue placeholder="Tahun Ajaran" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year} className="text-[10px] font-bold uppercase">{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex bg-muted rounded-xl p-1 w-full sm:w-auto">
                    <button 
                        onClick={() => setSelectedSemester('Ganjil')}
                        className={cn(
                            "flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider", 
                            selectedSemester === 'Ganjil' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                        )}
                    >Ganjil</button>
                    <button 
                        onClick={() => setSelectedSemester('Genap')}
                        className={cn(
                            "flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider", 
                            selectedSemester === 'Genap' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                        )}
                    >Genap</button>
                </div>
            </div>

            {/* Class Info & Rapor PDF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="border-none shadow-sm bg-primary/5 flex items-center p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Kelas Pada TA Ini</p>
                            <p className="text-sm font-bold text-primary">
                                {classAtYear !== null ? `KELAS ${classAtYear}` : 'TIDAK TERDETEKSI'}
                            </p>
                        </div>
                    </div>
                </Card>

                {student?.reportUrl && (
                    <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-bold uppercase opacity-80">Berkas Digital</p>
                                <p className="text-xs font-bold">Rapor PDF Resmi</p>
                            </div>
                            <Button size="sm" variant="secondary" className="gap-2 h-8 text-[10px] font-bold rounded-full" asChild>
                                <a href={student.reportUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3" /> BUKA
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="border-none shadow-sm bg-card">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp className="h-4 w-4" /></div>
                        <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Rerata Nilai</p>
                            <p className="text-lg font-bold text-green-700">{stats.avg}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Trophy className="h-4 w-4" /></div>
                        <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Status</p>
                            <p className="text-[11px] font-bold leading-tight uppercase">{summary?.status || 'Lanjut'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Grades List */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Award className="h-3.5 w-3.5" /> Daftar Nilai Semester
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {processedGrades.length > 0 ? (
                            processedGrades.map((g) => {
                                const isPassed = g.score >= 60;
                                return (
                                    <div key={g.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                                        <div className="space-y-0.5">
                                            <p className="text-[11px] font-bold text-primary uppercase">{g.subjectName}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase">Kognitif</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "text-lg font-bold",
                                                isPassed ? "text-green-600" : "text-destructive"
                                            )}>{g.score}</p>
                                            <p className={cn(
                                                "text-[8px] uppercase font-bold opacity-70",
                                                isPassed ? "text-green-700" : "text-destructive"
                                            )}>
                                                {isPassed ? 'Tuntas' : 'Remedi'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-16 text-center text-muted-foreground italic text-[10px] flex flex-col items-center">
                                <FileText className="h-8 w-8 mb-2 opacity-10" />
                                <p>Nilai semester ini belum diterbitkan</p>
                                <p className="opacity-60">Tahun Ajaran {displayYear}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Summary & Attendance Details */}
            {summary && (
                <Card className="border-none shadow-sm bg-muted/20 rounded-[28px] overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Catatan & Kehadiran</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-3 gap-2 text-center mb-4">
                            <div className="p-2 bg-white rounded-xl border shadow-sm">
                                <p className="text-[8px] text-muted-foreground uppercase font-bold">Sakit</p>
                                <p className="text-sm font-bold text-primary">{summary.sakit || 0}</p>
                            </div>
                            <div className="p-2 bg-white rounded-xl border shadow-sm">
                                <p className="text-[8px] text-muted-foreground uppercase font-bold">Izin</p>
                                <p className="text-sm font-bold text-primary">{summary.izin || 0}</p>
                            </div>
                            <div className="p-2 bg-white rounded-xl border shadow-sm">
                                <p className="text-[8px] text-muted-foreground uppercase font-bold">Alpa</p>
                                <p className="text-sm font-bold text-destructive">{summary.alpa || 0}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center py-2 border-b border-muted/50 text-[10px]">
                                <span className="text-muted-foreground uppercase font-medium">Kelakuan</span>
                                <span className="font-bold text-primary uppercase">{summary.kelakuan || 'Baik'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-muted/50 text-[10px]">
                                <span className="text-muted-foreground uppercase font-medium">Kerajinan</span>
                                <span className="font-bold text-primary uppercase">{summary.kerajinan || 'Baik'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 text-[10px]">
                                <span className="text-muted-foreground uppercase font-medium">Kerapian</span>
                                <span className="font-bold text-primary uppercase">{summary.kerapian || 'Baik'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            <div className="p-4 bg-muted/10 border-t border-dashed rounded-xl">
                <p className="text-[9px] text-muted-foreground leading-relaxed italic text-center">
                    * Kriteria Ketuntasan Minimal (KKM) Madrasah adalah 60. <br/>
                    Nilai di bawah 60 akan ditandai dengan warna merah (Remedi).
                </p>
            </div>
        </div>
    );
}
