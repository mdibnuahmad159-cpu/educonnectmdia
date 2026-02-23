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
import { Loader2, Link as LinkIcon, FileDown, Printer, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ReportsPage() {
    const firestore = useFirestore() as Firestore;
    const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
    const { data: studentsData, loading } = useCollection<Student>(studentsCollection);
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState("");

    const filteredData = useMemo(() => {
        if (!studentsData) return [];
        return studentsData.filter(student => 
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.nis.includes(searchTerm)
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [studentsData, searchTerm]);

    const handleViewReport = (studentId: string) => {
        toast({
            title: "Fitur Dalam Pengembangan",
            description: `Tampilan rapor untuk siswa ID: ${studentId} akan segera tersedia.`,
        });
    };

    const handleExportExcel = () => {
        if (!filteredData) return;
        const dataToExport = filteredData.map((item, index) => ({
            'No.': index + 1,
            'Nama': item.name,
            'NIS': item.nis,
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
            head: [['No', 'Nama', 'NIS']],
            body: filteredData.map((item, index) => [
                index + 1,
                item.name,
                item.nis,
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
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Data Rapor Siswa</title>
                    <style>
                        body { font-family: sans-serif; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
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
                        className="w-full sm:max-w-xs h-8 text-xs"
                    />
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">No.</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>NIS</TableHead>
                            <TableHead className="text-right w-[120px]">Link Rapor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
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
                                <TableCell className="text-right">
                                    <Button variant="outline" size="xs" onClick={() => handleViewReport(student.id)}>
                                        <LinkIcon className="mr-1 h-3 w-3" />
                                        Lihat Rapor
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    {searchTerm ? `Tidak ada siswa dengan nama atau NIS "${searchTerm}".` : "Belum ada data siswa."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}