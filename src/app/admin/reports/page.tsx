"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore } from "firebase/firestore";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon, FileDown, Printer, FileSpreadsheet, FileText, Edit } from "lucide-react";
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

    const handleSaveLink = async (studentId: string, url: string) => {
        if (!firestore) return;
        try {
            await updateStudent(firestore, studentId, { reportUrl: url });
            toast({
                title: "Link Rapor Diperbarui",
                description: "URL rapor siswa telah berhasil disimpan.",
            });
            setIsFormOpen(false);
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Gagal Menyimpan",
                description: error.message,
            });
        }
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
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Rapor Siswa</CardTitle>
                    <CardDescription>
                        Lihat dan kelola tautan rapor untuk setiap siswa.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
                        <Input
                            placeholder="Cari berdasarkan nama atau NIS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:max-w-xs"
                        />
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="xs" variant="outline" className="gap-1">
                                    <FileDown className="h-3 w-3" />
                                    Ekspor
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleExportExcel}>
                                    <FileSpreadsheet className="mr-2 h-3 w-3" />
                                    Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportPdf}>
                                    <FileText className="mr-2 h-3 w-3" />
                                    PDF
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button size="xs" variant="outline" className="gap-1" onClick={handlePrintTable}>
                                <Printer className="h-3 w-3" />
                                Cetak
                            </Button>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">No.</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>NIS</TableHead>
                                <TableHead>Link Rapor</TableHead>
                                <TableHead className="text-right w-[80px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                            <span>Memuat data siswa...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length > 0 ? (
                                filteredData.map((student, index) => (
                                <TableRow key={student.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>{student.nis}</TableCell>
                                    <TableCell>
                                        {student.reportUrl ? (
                                            <a href={student.reportUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center gap-1">
                                                <LinkIcon className="h-3 w-3" />
                                                Buka Link
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground">Belum diatur</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="xs" onClick={() => handleEditLink(student)}>
                                            <Edit className="mr-1 h-3 w-3" />
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        {searchTerm ? `Tidak ada siswa dengan nama atau NIS "${searchTerm}".` : "Belum ada data siswa."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ReportLinkForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                student={selectedStudent}
                onSave={handleSaveLink}
            />
        </>
    );
}
