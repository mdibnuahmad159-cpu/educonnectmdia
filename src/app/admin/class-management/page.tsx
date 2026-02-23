"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import type { Student } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { ChevronsUp, ChevronsDown, ArrowRightLeft, Loader2, FileDown, Printer, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ClassManagementPage() {
  const firestore = useFirestore();
  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const { data: students, loading } = useCollection<Student>(studentsCollection);
  const { toast } = useToast();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
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
      toast({ variant: "destructive", title: "Gagal Membuka Jendela Cetak", description: "Mohon izinkan pop-up untuk situs ini." });
      return;
    }

    const tableRows = filteredStudents.map((student, index) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 8px;">${student.name}</td>
        <td style="padding: 8px;">${student.nis}</td>
        <td style="padding: 8px;">${student.kelas !== undefined ? `Kelas ${student.kelas}` : 'Belum diatur'}</td>
      </tr>
    `).join('');

    const content = `
      <html>
        <head>
          <title>Cetak Data Manajemen Kelas</title>
          <style>
            body { font-family: sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; text-align: left; padding: 8px; }
            th { background-color: #f2f2f2; }
            h1 { font-size: 18px; }
            @media print {
              @page { size: A4; margin: 20mm; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Data Manajemen Kelas</h1>
          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">No.</th>
                <th>Nama</th>
                <th>NIS</th>
                <th>Kelas</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const isAllSelected = filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length;
  const isIndeterminate = selectedStudents.length > 0 && selectedStudents.length < filteredStudents.length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manajemen Kelas</CardTitle>
          <CardDescription>
            Kelola kenaikan, penurunan, dan perpindahan kelas siswa.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-2 mb-4">
              <div className="flex">
                  <Select value={filterClass} onValueChange={setFilterClass}>
                      <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Filter per kelas" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="semua">Semua Kelas</SelectItem>
                          {[...Array(7).keys()].map(i => (
                              <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                          ))}
                          <SelectItem value="belum_diatur">Belum diatur</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                      <Button size="xs" variant="outline" onClick={handlePromote} disabled={selectedStudents.length === 0} className="gap-1">
                      <ChevronsUp /> Naik Kelas
                      </Button>
                      <Button size="xs" variant="outline" onClick={handleDemote} disabled={selectedStudents.length === 0} className="gap-1">
                      <ChevronsDown /> Turun Kelas
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => setIsMoveDialogOpen(true)} disabled={selectedStudents.length === 0} className="gap-1">
                      <ArrowRightLeft /> Pindah Kelas
                      </Button>
                  </div>
                  <div className="flex items-center gap-2">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button size="xs" variant="outline" className="gap-1">
                              <FileDown className="h-4 w-4" />
                              Ekspor
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={handleExportExcel}>
                              <FileSpreadsheet className="mr-2 h-4 w-4" />
                              Ekspor ke Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleExportPdf}>
                              <FileText className="mr-2 h-4 w-4" />
                              Ekspor ke PDF
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <Button size="xs" variant="outline" className="gap-1" onClick={handlePrintTable}>
                          <Printer className="h-4 w-4" />
                          Cetak Data
                      </Button>
                  </div>
              </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={isAllSelected ? true : (isIndeterminate ? "indeterminate" : false)}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[50px]">No.</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Kelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                     <div className="flex justify-center items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span>Memuat data...</span>
                     </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student, index) => (
                  <TableRow key={student.id} data-state={selectedStudents.includes(student.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.nis}</TableCell>
                    <TableCell>{student.kelas !== undefined ? `Kelas ${student.kelas}` : "Belum diatur"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Belum ada data siswa untuk filter ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pindah Kelas</AlertDialogTitle>
            <AlertDialogDescription>
              Pilih kelas tujuan untuk {selectedStudents.length} siswa yang dipilih.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
             <Select onValueChange={(value) => setTargetClass(Number(value))}>
                <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas tujuan" />
                </SelectTrigger>
                <SelectContent>
                    {[...Array(7).keys()].map(i => (
                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMove} disabled={targetClass === null}>Pindahkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
