"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, Firestore } from "firebase/firestore";
import type { Student } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ChevronsUp, ChevronsDown, ArrowRightLeft, Loader2, FileDown, Printer, FileSpreadsheet, FileText, GraduationCap, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAcademicYear } from "@/context/academic-year-provider";
import { graduateStudents } from "@/lib/firebase-helpers";
import { cn } from "@/lib/utils";

export default function ClassManagementPage() {
  const firestore = useFirestore() as Firestore;
  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const { data: students, loading } = useCollection<Student>(studentsCollection);
  const { toast } = useToast();
  const { activeYear } = useAcademicYear();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isGraduateDialogOpen, setIsGraduateDialogOpen] = useState(false);
  const [targetClass, setTargetClass] = useState<number | null>(null);
  const [filterClass, setFilterClass] = useState<string>("semua");

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    
    let studentsToDisplay = [...students];

    if (filterClass !== "semua") {
      studentsToDisplay = studentsToDisplay.filter(student => {
        if (filterClass === "belum_diatur") {
          return student.kelas === undefined;
        }
        return student.kelas === Number(filterClass);
      });
    }

    return studentsToDisplay.sort((a, b) => {
      const classA = a.kelas ?? -1;
      const classB = b.kelas ?? -1;
      if (classA !== classB) {
        return classA - classB;
      }
      return a.name.localeCompare(b.name);
    });
  }, [students, filterClass]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedStudents(filteredStudents.map((s) => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents((prev) => [...prev, studentId]);
    } else {
      setSelectedStudents((prev) => prev.filter((id) => id !== studentId));
    }
  };

  const performBatchUpdate = async (updateLogic: (student: Student) => { kelas: number } | null) => {
    if (!firestore || selectedStudents.length === 0) return;

    const batch = writeBatch(firestore);
    let updatedCount = 0;
    const allStudents = students || [];

    selectedStudents.forEach((studentId) => {
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
        const update = updateLogic(student);
        if (update) {
          const studentRef = doc(firestore, "students", studentId);
          batch.update(studentRef, update);
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      try {
        await batch.commit();
        toast({ title: "Update Berhasil", description: `${updatedCount} siswa telah diperbarui.` });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Update Gagal", description: error.message });
      }
    } else {
      toast({ variant: "destructive", title: "Tidak Ada Perubahan", description: "Tidak ada siswa yang memenuhi kriteria untuk diubah." });
    }

    setSelectedStudents([]);
  };

  const handlePromote = () => {
    performBatchUpdate((student) => {
      const currentClass = student.kelas ?? -1;
      return currentClass < 6 ? { kelas: currentClass + 1 } : null;
    });
  };

  const handleDemote = () => {
    performBatchUpdate((student) => {
      const currentClass = student.kelas ?? 0;
      return currentClass > 0 ? { kelas: currentClass - 1 } : null;
    });
  };

  const handleMove = () => {
    if (targetClass === null) return;
    performBatchUpdate(() => ({ kelas: targetClass }));
    setIsMoveDialogOpen(false);
    setTargetClass(null);
  };
  
  const handleGraduate = () => {
    if (!selectedStudents.length) return;
    setIsGraduateDialogOpen(true);
  };

  const confirmGraduate = async () => {
    if (!firestore || selectedStudents.length === 0) return;

    try {
        await graduateStudents(firestore, selectedStudents, activeYear);
        toast({ title: "Proses Lulus Berhasil", description: `${selectedStudents.length} siswa telah diluluskan.` });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Proses Lulus Gagal", description: error.message });
    }

    setSelectedStudents([]);
    setIsGraduateDialogOpen(false);
  };

  const handleExportExcel = () => {
      if (!filteredStudents) return;
      const dataToExport = filteredStudents.map((s, index) => ({
          'No.': index + 1,
          'Nama': s.name,
          'NIS': s.nis,
          'Kelas': s.kelas !== undefined ? `Kelas ${s.kelas}` : "Belum diatur",
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Manajemen Kelas');
      XLSX.writeFile(workbook, 'data_manajemen_kelas.xlsx');
  };

  const handleExportPdf = () => {
      if (!filteredStudents) return;
      const doc = new jsPDF();
      
      doc.text('Data Manajemen Kelas', 14, 16);

      const tableColumn = ['No', 'Nama', 'NIS', 'Kelas'];
      const tableRows: (string | number)[][] = [];

      filteredStudents.forEach((student, index) => {
          const studentData = [
              index + 1,
              student.name,
              student.nis,
              student.kelas !== undefined ? `Kelas ${student.kelas}` : "Belum diatur",
          ];
          tableRows.push(studentData);
      });

      (doc as any).autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 20,
      });

      doc.save('data_manajemen_kelas.pdf');
  };

  const handlePrintTable = () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data untuk dicetak." });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ variant: "destructive", title: "Gagal Membuka Jendela Cetak" });
      return;
    }

    const tableRows = filteredStudents.map((student, index) => `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>${student.name}</td>
        <td>${student.nis}</td>
        <td>${student.kelas !== undefined ? `Kelas ${student.kelas}` : 'Belum diatur'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Manajemen Kelas</title>
          <style>
            body { font-family: sans-serif; font-size: 10px; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Data Manajemen Kelas</h1>
          <table>
            <thead><tr><th>No.</th><th>Nama</th><th>NIS</th><th>Kelas</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const isAllSelected = filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length;
  const isIndeterminate = selectedStudents.length > 0 && selectedStudents.length < filteredStudents.length;

  return (
    <div className="space-y-4">
      <Card className="sticky top-[106px] z-20 border-none shadow-lg bg-primary text-primary-foreground">
        <CardHeader className="p-4 flex flex-row flex-wrap items-center gap-2">
            <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-[140px] h-8 text-xs font-normal bg-white/10 border-white/20 text-white focus:ring-white/30">
                    <Users className="h-3.5 w-3.5 mr-2 opacity-70" />
                    <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="semua">Semua Kelas</SelectItem>
                    {[...Array(7).keys()].map(i => (
                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                    ))}
                    <SelectItem value="belum_diatur">Belum diatur</SelectItem>
                </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-2">
                <Button size="xs" variant="secondary" onClick={handlePromote} disabled={selectedStudents.length === 0} className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none">
                <ChevronsUp className="h-3.5 w-3.5" /> Naik
                </Button>
                <Button size="xs" variant="secondary" onClick={handleDemote} disabled={selectedStudents.length === 0} className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none">
                <ChevronsDown className="h-3.5 w-3.5" /> Turun
                </Button>
                <Button size="xs" variant="secondary" onClick={() => setIsMoveDialogOpen(true)} disabled={selectedStudents.length === 0} className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Pindah
                </Button>
                <Button size="xs" variant="secondary" onClick={handleGraduate} disabled={selectedStudents.length === 0} className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none">
                  <GraduationCap className="h-3.5 w-3.5" /> Luluskan
                </Button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none">
                        <FileDown className="h-3.5 w-3.5" /> Ekspor
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExportExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPdf}>
                        <FileText className="mr-2 h-4 w-4 text-red-600" /> PDF
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none" onClick={handlePrintTable}>
                    <Printer className="h-3.5 w-3.5" /> Cetak
                </Button>
            </div>
        </CardHeader>
      </Card>

      <div className="pt-2">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 rounded-t-[20px] border-x border-t">
            <Checkbox
              checked={isAllSelected ? true : (isIndeterminate ? "indeterminate" : false)}
              onCheckedChange={handleSelectAll}
              className="border-primary/50 data-[state=checked]:bg-primary"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pilih Semua ({selectedStudents.length} Santri Terpilih)</span>
          </div>

          <div className="space-y-2 border-x border-b p-2 rounded-b-[20px] bg-card/50">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/40"/>
                    <span className="text-xs font-medium uppercase tracking-widest">Memuat data santri...</span>
                </div>
            ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                    <div 
                        key={student.id} 
                        className={cn(
                            "flex items-center justify-between p-3 rounded-xl bg-card border shadow-sm hover:border-primary/20 transition-all group",
                            selectedStudents.includes(student.id) && "border-primary/40 bg-primary/5"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <Checkbox
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                                className="data-[state=checked]:bg-primary"
                            />
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-primary/5 group-hover:border-primary/20 transition-all">
                                    <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">{student.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-[12px] font-bold leading-tight uppercase text-foreground group-hover:text-primary transition-colors">{student.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 rounded">NIS: {student.nis}</p>
                                        <span className="text-[10px] text-muted-foreground">•</span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                            student.kelas !== undefined ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            {student.kelas !== undefined ? `KELAS ${student.kelas}` : "BELUM DIATUR"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">
                    <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-10" />
                    <p className="text-sm font-medium">Belum ada data santri untuk filter ini.</p>
                </div>
            )}
          </div>
      </div>
      
      <AlertDialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <AlertDialogContent className="rounded-[32px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold uppercase tracking-tight">Pindah Kelas Massal</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Pilih kelas tujuan untuk {selectedStudents.length} santri yang dipilih.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
             <Select onValueChange={(value) => setTargetClass(Number(value))}>
                <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Pilih kelas tujuan" />
                </SelectTrigger>
                <SelectContent>
                    {[...Array(7).keys()].map(i => (
                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full h-10 text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMove} disabled={targetClass === null} className="rounded-full h-10 text-xs">Ya, Pindahkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isGraduateDialogOpen} onOpenChange={setIsGraduateDialogOpen}>
        <AlertDialogContent className="rounded-[32px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold uppercase tracking-tight text-destructive">Proses Kelulusan</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tindakan ini akan memindahkan {selectedStudents.length} santri terpilih ke daftar alumni untuk tahun ajaran {activeYear}. Santri akan dihapus dari daftar aktif.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full h-10 text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGraduate} className="bg-destructive hover:bg-destructive/90 text-white rounded-full h-10 text-xs">Ya, Luluskan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
