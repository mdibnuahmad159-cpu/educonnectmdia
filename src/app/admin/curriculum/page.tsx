"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore } from "firebase/firestore";
import type { Curriculum } from "@/types";
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
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, FileDown, Printer, FileSpreadsheet, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addCurriculum, updateCurriculum, deleteCurriculum } from "@/lib/firebase-helpers";
import { CurriculumForm } from "./components/curriculum-form";

export default function CurriculumPage() {
    const firestore = useFirestore() as Firestore;
    const curriculumCollection = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculumData, loading } = useCollection<Curriculum>(curriculumCollection);
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
    const [curriculumToDelete, setCurriculumToDelete] = useState<string | null>(null);

    const sortedData = useMemo(() => {
        if (!curriculumData) return [];
        return [...curriculumData].sort((a, b) => {
            if (a.classLevel !== b.classLevel) {
                return a.classLevel - b.classLevel;
            }
            return a.subjectName.localeCompare(b.subjectName);
        });
    }, [curriculumData]);

    const handleAdd = () => {
        setSelectedCurriculum(null);
        setIsFormOpen(true);
    };

    const handleEdit = (curriculum: Curriculum) => {
        setSelectedCurriculum(curriculum);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        setCurriculumToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!firestore || !curriculumToDelete) return;
        try {
            await deleteCurriculum(firestore, curriculumToDelete);
            toast({ title: "Data Kurikulum Dihapus", description: "Data berhasil dihapus." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: error.message });
        }
        setIsDeleteDialogOpen(false);
        setCurriculumToDelete(null);
    };

    const handleSave = async (data: Omit<Curriculum, 'id'>) => {
        if (!firestore) return;
        try {
            if (selectedCurriculum) {
                await updateCurriculum(firestore, selectedCurriculum.id, data);
                toast({ title: "Kurikulum Diperbarui", description: "Data kurikulum berhasil diperbarui." });
            } else {
                await addCurriculum(firestore, data);
                toast({ title: "Kurikulum Ditambahkan", description: "Data kurikulum baru berhasil ditambahkan." });
            }
            setIsFormOpen(false);
            setSelectedCurriculum(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
        }
    };

    const handleExportExcel = () => {
      if (!sortedData) return;
      const dataToExport = sortedData.map((item, index) => ({
          'No.': index + 1,
          'Kode Mapel': item.subjectCode,
          'Mapel': item.subjectName,
          'Kelas': `Kelas ${item.classLevel}`,
          'Kitab': item.bookName,
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kurikulum');
      XLSX.writeFile(workbook, 'data_kurikulum.xlsx');
    };

    const handleExportPdf = () => {
        if (!sortedData) return;
        const doc = new jsPDF();
        doc.text('Data Kurikulum', 14, 16);
        (doc as any).autoTable({
            head: [['No', 'Kode Mapel', 'Mapel', 'Kelas', 'Kitab']],
            body: sortedData.map((item, index) => [
                index + 1,
                item.subjectCode,
                item.subjectName,
                `Kelas ${item.classLevel}`,
                item.bookName
            ]),
            startY: 20,
        });
        doc.save('data_kurikulum.pdf');
    };

    const handlePrintTable = () => {
        if (!sortedData || sortedData.length === 0) {
            toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data untuk dicetak." });
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: "destructive", title: "Gagal Membuka Jendela Cetak" });
            return;
        }
        
        const tableRows = sortedData.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.subjectCode}</td>
                <td>${item.subjectName}</td>
                <td>Kelas ${item.classLevel}</td>
                <td>${item.bookName}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Data Kurikulum</title>
                    <style>
                        body { font-family: sans-serif; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Data Kurikulum</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>Kode Mapel</th>
                                <th>Mapel</th>
                                <th>Kelas</th>
                                <th>Kitab</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Kurikulum</CardTitle>
                    <CardDescription>
                        Kelola mata pelajaran, kelas, dan kitab yang digunakan dalam kurikulum.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end items-center gap-2 mb-4">
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
                        <Button size="xs" className="gap-1" onClick={handleAdd}>
                            <PlusCircle className="h-4 w-4" />
                            Tambah Data
                        </Button>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">No.</TableHead>
                                <TableHead>Kode Mapel</TableHead>
                                <TableHead>Mapel</TableHead>
                                <TableHead>Kelas</TableHead>
                                <TableHead>Kitab</TableHead>
                                <TableHead className="text-right w-[100px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                            <span>Memuat data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sortedData.length > 0 ? (
                                sortedData.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{item.subjectCode}</TableCell>
                                    <TableCell className="font-medium">{item.subjectName}</TableCell>
                                    <TableCell>Kelas {item.classLevel}</TableCell>
                                    <TableCell>{item.bookName}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Belum ada data kurikulum.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CurriculumForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                curriculum={selectedCurriculum}
                onSave={handleSave}
            />
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data kurikulum secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
