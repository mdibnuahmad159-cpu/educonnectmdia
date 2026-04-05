
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, orderBy } from "firebase/firestore";
import type { Student, Grade, ReportSummary, Curriculum } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    ArrowLeft, 
    FileText, 
    Award, 
    ExternalLink, 
    CheckCircle2, 
    Trophy,
    TrendingUp
} from "lucide-react";
import Link from "next/link";
import { useAcademicYear } from "@/context/academic-year-provider";
import { cn } from "@/lib/utils";

export default function ParentReportsPage() {
    const [nis, setNis] = useState<string | null>(null);
    const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const firestore = useFirestore();
    const { activeYear } = useAcademicYear();

    useEffect(() => {
        setNis(sessionStorage.getItem('studentNis'));
    }, []);

    const studentRef = useMemoFirebase(() => nis && firestore ? doc(firestore, "students", nis) : null, [firestore, nis]);
    const { data: student } = useDoc<Student>(studentRef);

    const gradesQuery = useMemoFirebase(() => {
        if (!firestore || !nis || !activeYear) return null;
        return query(
            collection(firestore, "grades"), 
            where("studentId", "==", nis),
            where("academicYear", "==", activeYear),
            where("type", "==", selectedSemester)
        );
    }, [firestore, nis, activeYear, selectedSemester]);
    const { data: grades, loading: loadingGrades } = useCollection<Grade>(gradesQuery);

    const summaryQuery = useMemoFirebase(() => {
        if (!firestore || !nis || !activeYear) return null;
        return query(
            collection(firestore, "report_summaries"),
            where("studentId", "==", nis),
            where("academicYear", "==", activeYear),
            where("semester", "==", selectedSemester)
        );
    }, [firestore, nis, activeYear, selectedSemester]);
    const { data: summaryData } = useCollection<ReportSummary>(summaryQuery);

    const curriculumQuery = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculum } = useCollection<Curriculum>(curriculumQuery);

    const summary = summaryData?.[0];

    const processedGrades = useMemo(() => {
        if (!grades || !curriculum) return [];
        return grades.map(g => {
            const subject = curriculum.find(c => c.id === g.subjectId);
            return { ...g, subjectName: subject?.subjectName || 'Mapel' };
        }).sort((a,b) => a.subjectName.localeCompare(b.subjectName));
    }, [grades, curriculum]);

    const stats = useMemo(() => {
        if (!processedGrades.length) return { total: 0, avg: 0 };
        const total = processedGrades.reduce((acc, g) => acc + g.score, 0);
        const avg = total / processedGrades.length;
        return { total, avg: avg.toFixed(1) };
    }, [processedGrades]);

    if (!nis || loadingGrades) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href="/parent/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <h1 className="text-xl font-headline font-bold text-primary">Rapor Santri</h1>
                </div>
                <div className="flex bg-muted rounded-lg p-1">
                    <button 
                        onClick={() => setSelectedSemester('Ganjil')}
                        className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", selectedSemester === 'Ganjil' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                    >Ganjil</button>
                    <button 
                        onClick={() => setSelectedSemester('Genap')}
                        className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", selectedSemester === 'Genap' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                    >Genap</button>
                </div>
            </div>

            {student?.reportUrl && (
                <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase opacity-80">Rapor Digital PDF</p>
                            <p className="text-sm font-bold">Unduh Dokumen Resmi</p>
                        </div>
                        <Button size="sm" variant="secondary" className="gap-2 h-8 text-[10px] font-bold" asChild>
                            <a href={student.reportUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" /> BUKA
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            )}

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
                            <p className="text-[11px] font-bold leading-tight">{summary?.status || 'Lanjut'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Award className="h-3.5 w-3.5" /> Daftar Nilai Semester
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {processedGrades.length > 0 ? (
                            processedGrades.map((g) => (
                                <div key={g.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-bold text-primary uppercase">{g.subjectName}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Kognitif</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "text-lg font-bold",
                                            g.score >= 75 ? "text-green-600" : "text-orange-600"
                                        )}>{g.score}</p>
                                        <p className="text-[8px] uppercase font-bold opacity-40">{g.score >= 75 ? 'Tuntas' : 'Remedi'}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-16 text-center text-muted-foreground italic text-[10px]">
                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-10" />
                                Nilai untuk semester ini belum diterbitkan.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {summary && (
                <Card className="border-none shadow-sm bg-muted/20">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Catatan & Kehadiran</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-3 gap-2 text-center mb-4">
                            <div className="p-2 bg-white rounded border">
                                <p className="text-[8px] text-muted-foreground uppercase">Sakit</p>
                                <p className="text-sm font-bold">{summary.sakit || 0}</p>
                            </div>
                            <div className="p-2 bg-white rounded border">
                                <p className="text-[8px] text-muted-foreground uppercase">Izin</p>
                                <p className="text-sm font-bold">{summary.izin || 0}</p>
                            </div>
                            <div className="p-2 bg-white rounded border">
                                <p className="text-[8px] text-muted-foreground uppercase">Alpa</p>
                                <p className="text-sm font-bold">{summary.alpa || 0}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Kelakuan</span>
                                <span className="font-bold">{summary.kelakuan || 'Baik'}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Kerajinan</span>
                                <span className="font-bold">{summary.kerajinan || 'Baik'}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Kerapian</span>
                                <span className="font-bold">{summary.kerapian || 'Baik'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
