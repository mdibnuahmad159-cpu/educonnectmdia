
"use client";

import { useState, useMemo, useRef } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore } from "firebase/firestore";
import type { Alumni } from "@/types";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, FileDown, Printer, FileSpreadsheet, FileText, PlusCircle, Edit, FileUp, Upload, Download, Search } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addAlumnus, updateAlumnus, deleteAlumnus, addAlumniBatch } from "@/lib/firebase-helpers";
import { AlumniForm } from "./components/alumni-form";

export default function AlumniPage() {
    const firestore = useFirestore() as Firestore;
    const alumniCollection = useMemoFirebase(() => firestore ? collection(firestore, "alumni") : null, [firestore]);
    const { data: alumniData, loading } = useCollection<Alumni>(alumniCollection);
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedAlumnus, setSelectedAlumnus] = useState<Alumni | null>(null);
    const [alumnusToDelete, setAlumnusToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterYear, setFilterYear] = useState<string>("semua");
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const availableYears = useMemo(() => {
        if (!alumniData) return [];
        const years = new Set(alumniData.map(a => a.tahunLulus));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [alumniData]);

    const filteredData = useMemo(() => {
        if (!alumniData) return [];
        return alumniData.filter(alumnus => {
            const matchesSearch = alumnus.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                alumnus.nis.includes(searchTerm);
            
            const matchesYear = filterYear === 'semua' || alumnus.tahunLulus === filterYear;

            return matchesSearch && matchesYear;
        }).sort((a, b) => {
            if (a.tahunLulus !== b.tahunLulus) {
                return b.tahunLulus.localeCompare(a.tahunLulus);
            }
            return a.name.localeCompare(b.name);
        });
    }, [alumniData, searchTerm, filterYear]);

    const handleAdd = () => {
        setSelectedAlumnus(null);
        setIsFormOpen(true);
    };

    const handleEdit = (alumnus: Alumni) => {
        setSelectedAlumnus(alumnus);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        setAlumnusToDelete(id);
        setIsDeleteDialogOpen(true);
    };
    
    const handleSave = (data: Omit<Alumni, 'id'>) => {
        if (!firestore) return;
        if (selectedAlumnus) {
            updateAlumnus(firestore, selectedAlumnus.id, data);
            toast({ title: "Data Alumni Diperbarui", description: "Data alumni berhasil diperbarui." });
        } else {
            addAlumnus(firestore, data);
            toast({ title: "Alumni Ditambahkan", description: "Data alumni baru berhasil ditambahkan." });
        }
        setIsFormOpen(false);
        setSelectedAlumnus(null);
    };

    const confirmDelete = () => {
        if (!firestore || !alumnusToDelete) return;
        deleteAlumnus(firestore, alumnusToDelete);
        toast({ title: "Data Alumni Dihapus", description: "Data berhasil dihapus." });
        setIsDeleteDialogOpen(false);
        setAlumnusToDelete(null);
    };

    const alumniColumns = {
        nis: 'NIS (Opsional)',
        name: 'Nama',
        tahunLulus: 'Tahun Lulus',
        address: 'Alamat',
        noWa: 'No. WA',
    };

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([{}], { header: Object.values(alumniColumns) });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Alumni');
        XLSX.writeFile(workbook, 'template_alumni.xlsx');
    };

    const handleImportAlumni = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !firestore) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
             try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (json.length === 0) {
                    toast({ variant: "destructive", title: "File Kosong", description: "File Excel yang Anda unggah tidak berisi data." });
                    return;
                }

                toast({ title: "Mengimpor Data", description: `Mulai memproses ${json.length} data alumni...` });

                const alumniToImport: Omit<Alumni, 'id'>[] = [];
                let errorCount = 0;

                for (const item of json) {
                    const alumniData: any = {};
                    const columnKeys = Object.keys(alumniColumns);
                    const columnValues = Object.values(alumniColumns);
                     for(const key in item) {
                        const columnIndex = columnValues.indexOf(key);
                        if (columnIndex > -1) {
                             const dataKey = columnKeys[columnIndex];
                             alumniData[dataKey] = item[key] ?? '';
                        }
                    }

                    // Only name and year are absolutely required for import logic
                    if (!alumniData.name || !alumniData.tahunLulus) {
                        errorCount++;
                        console.error("Skipping alumni item due to missing required fields:", alumniData);
                        continue;
                    }
                    
                    if (alumniData.nis) {
                        alumniData.nis = String(alumniData.nis);
                    } else {
                        alumniData.nis = "";
                    }
                    
                    alumniToImport.push(alumniData as Omit<Alumni, 'id'>);
                }

                if (alumniToImport.length > 0) {
                    await addAlumniBatch(firestore, alumniToImport);
                    toast({ title: "Impor Selesai", description: `${alumniToImport.length} item berhasil diimpor. ${errorCount} gagal.` });
                } else {
                    toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data valid untuk diimpor." });
                }

            } catch (error) {
                toast({ variant: "destructive", title: "Gagal Memproses File", description: "Terjadi kesalahan saat mengimpor data. Pastikan format Excel benar." });
                console.error(error);
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportExcel = () => {
        if (!filteredData) return;
        const dataToExport = filteredData.map((item, index) => ({
            'No.': index + 1,
            'Nama': item.name,
            'NIS': item.nis,
            'Tahun Lulus': item.tahunLulus,
            'Alamat': item.address || '-',
            'No. WA': item.noWa || '-',
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumni');
        XLSX.writeFile(workbook, 'data_alumni.xlsx');
    };

    const handleExportPdf = () => {
        if (!filteredData) return;
        const doc = new jsPDF();
        doc.text('Data Alumni', 14, 16);
        (doc as any).autoTable({
            head: [['No', 'Nama', 'NIS', 'Tahun Lulus', 'Alamat', 'No. WA']],
            body: filteredData.map((item, index) => [
                index + 1,
                item.name,
                item.nis,
                item.tahunLulus,
                item.address || '-',
                item.noWa || '-',
            ]),
            startY: 20,
        });
        doc.save('data_alumni.pdf');
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
                <td>${item.tahunLulus}</td>
                <td>${item.address || '-'}</td>
                <td>${item.noWa || '-'}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Data Alumni</title>
                    <style>
                        body { font-family: sans-serif; font-size: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Data Alumni</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>Nama</th>
                                <th>NIS</th>
                                <th>Tahun Lulus</th>
                                <th>Alamat</th>
                                <th>No. WA</th>
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
                <CardHeader className="pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-bold font-headline">Alumni</CardTitle>
                            <CardDescription className="text-primary-foreground/70 text-xs">
                                Kelola dan lihat data siswa yang telah lulus. NIS bersifat opsional.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="xs" variant="outline" className="gap-1.5 border-white/20 hover:bg-white/10 text-white h-8">
                                    <FileUp className="h-3.5 w-3.5" />
                                    Impor
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleDownloadTemplate}>
                                    <Download className="mr-2 h-3.5 w-3.5" />
                                    Unduh Template
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-3.5 w-3.5" />
                                    Unggah Excel
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={handleImportAlumni}
                            />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="xs" variant="outline" className="gap-1.5 border-white/20 hover:bg-white/10 text-white h-8">
                                    <FileDown className="h-3.5 w-3.5" />
                                    Ekspor
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleExportExcel}>
                                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                                    Ekspor ke Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportPdf}>
                                    <FileText className="mr-2 h-3.5 w-3.5" />
                                    Ekspor ke PDF
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button size="xs" variant="outline" className="gap-1.5 border-white/20 hover:bg-white/10 text-white h-8" onClick={handlePrintTable}>
                                <Printer className="h-3.5 w-3.5" />
                                Cetak
                            </Button>
                             <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90" onClick={handleAdd}>
                                <PlusCircle className="h-3.5 w-3.5" />
                                Tambah Alumni
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 w-full sm:max-w-xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-primary-foreground/50" />
                            <Input 
                                placeholder="Cari nama atau NIS..." 
                                className="pl-9 h-9 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                            <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs font-normal bg-white/10 border-white/20 text-white focus:ring-white/30">
                                <SelectValue placeholder="Filter per tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="semua">Semua Tahun</SelectItem>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
            </Card>

            <CardContent className="px-0 pt-2">
                <div className="overflow-x-auto border rounded-xl bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-[40px] px-4 font-bold text-[10px] uppercase">No.</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Nama</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">NIS</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Tahun Lulus</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Alamat</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">No. WA</TableHead>
                                <TableHead className="text-right w-[80px] font-bold text-[10px] uppercase px-4">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                            <span>Memuat data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length > 0 ? (
                                filteredData.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                                    <TableCell className="px-4 text-[11px]">{index + 1}</TableCell>
                                    <TableCell className="font-bold text-[11px] uppercase">{item.name}</TableCell>
                                    <TableCell className="text-[11px] font-mono">
                                        <span className={item.nis.startsWith('AL') ? "text-muted-foreground italic text-[10px]" : ""}>
                                            {item.nis}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-[11px]">{item.tahunLulus}</TableCell>
                                    <TableCell className="text-[11px] truncate max-w-[150px]">{item.address || '-'}</TableCell>
                                    <TableCell className="text-[11px]">{item.noWa || '-'}</TableCell>
                                    <TableCell className="text-right px-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleEdit(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground italic">
                                        Belum ada data alumni untuk filter ini.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <AlumniForm 
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                alumnus={selectedAlumnus}
                onSave={handleSave}
            />
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data alumni secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

