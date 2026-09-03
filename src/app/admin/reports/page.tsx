"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore } from "firebase/firestore";
import type { Student } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon, FileDown, Printer, FileSpreadsheet, FileText, Edit, Search } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { updateStudent } from "@/lib/firebase-helpers";
import { ReportLinkForm } from "./components/report-link-form";

export default function ReportsPage() {
    const firestore = useFirestore() as Firestore;
    const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
    const { data: studentsData, loading } = useCollection<Student>(studentsCollection);
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const filteredData = useMemo(() => {
        if (!studentsData) return [];
        return studentsData.filter(student => 
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.nis.includes(searchTerm)
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [studentsData, searchTerm]);

    const handleEditLink = (student: Student) => {
        setSelectedStudent(student);
        setIsFormOpen(true);
    };

    const handleSaveLink = (studentId: string, url: string) => {
        if (!firestore) return;
        updateStudent(firestore, studentId, { reportUrl: url });
        toast({
            title: "Link Rapor Diperbarui",
            description: "URL rapor siswa telah berhasil disimpan.",
        });
        setIsFormOpen(false);
    };

    const handleExportExcel = () => {
        if (!filteredData) return;
        const dataToExport = filteredData.map((item, index) => ({
            'No.': index + 1,
            'Nama': item.name,
            'NIS': item.nis,
            'Link Rapor': item.reportUrl || 'Belum diatur'
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Rapor Siswa');
        XLSX.writeFile(workbook, 'data_rapor_siswa.xlsx');
    };

    const handleExportPdf = () => {
        if (!filteredData) return;
        const doc = new jsPDF();
        doc.text('Data Rapor Siswa', 14, 16);
        (doc as any).autoTable({
            head: [['No', 'Nama', 'NIS', 'Link Rapor']],
            body: filteredData.map((item, index) => [
                index + 1,
                item.name,
                item.nis,
                item.reportUrl || 'Belum diatur'
            ]),
            startY: 20,
        });
        doc.save('data_rapor_siswa.pdf');
    };
    
    const handlePrintTable = () => {
        if (!filteredData || filteredData.length === 0) {
            toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data untuk dicetak." });
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: "destructive", title: "Gagal Membuka Jendela Cetak" });
            return;
        }
        
        const tableRows = filteredData.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.nis}</td>
                <td>${item.reportUrl || 'Belum diatur'}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Data Rapor Siswa</title>
                    <style>
                        body { font-family: sans-serif; font-size: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Data Rapor Siswa</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>Nama</th>
                                <th>NIS</th>
                                <th>Link Rapor</th>
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
        <div className="space-y-4">
            <Card className="border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="p-4 flex flex-row flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-primary-foreground/50" />
                        <Input 
                            placeholder="Cari nama atau NIS..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none">
                                <FileDown className="h-3.5 w-3.5" />
                                Ekspor
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportExcel}>
                                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                                Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPdf}>
                                <FileText className="mr-2 h-3.5 w-3.5" />
                                PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none" onClick={handlePrintTable}>
                            <Printer className="h-3.5 w-3.5" />
                            Cetak
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <div className="pt-2">
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[50px] px-4 font-bold text-[10px] uppercase">No.</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Nama</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">NIS</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Link Dokumen Rapor</TableHead>
                                    <TableHead className="text-right w-[100px] px-4 font-bold text-[10px] uppercase">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin"/>
                                                <span className="text-xs">Memuat data siswa...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length > 0 ? (
                                    filteredData.map((student, index) => (
                                    <TableRow key={student.id} className="hover:bg-muted/10 transition-colors">
                                        <TableCell className="px-4 text-[11px]">{index + 1}</TableCell>
                                        <TableCell className="font-bold text-[11px] uppercase">{student.name}</TableCell>
                                        <TableCell className="text-[11px] font-mono">{student.nis}</TableCell>
                                        <TableCell>
                                            {student.reportUrl ? (
                                                <a href={student.reportUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-bold text-[10px] uppercase underline flex items-center gap-1.5">
                                                    <LinkIcon className="h-3 w-3" />
                                                    Buka Dokumen
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground text-[10px] italic">Belum tersedia</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right px-4">
                                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/5" onClick={() => handleEditLink(student)}>
                                                <Edit className="h-3 w-3" />
                                                Edit Link
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground italic">
                                            {searchTerm ? `Tidak ada siswa dengan kata kunci "${searchTerm}".` : "Belum ada data siswa terdaftar."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <ReportLinkForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                student={selectedStudent}
                onSave={handleSaveLink}
            />
        </div>
    );
}
