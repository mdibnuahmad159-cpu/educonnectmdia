"use client";

import { useState, useMemo, useRef } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore } from "firebase/firestore";
import type { Alumni } from "@/types";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, FileDown, Printer, FileSpreadsheet, FileText, PlusCircle, Edit, FileUp, Upload, Download, Search, GraduationCap } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addAlumnus, updateAlumnus, deleteAlumnus, addAlumniBatch } from "@/lib/firebase-helpers";
import { AlumniForm } from "./components/alumni-form";

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.87 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

function formatWaLink(phone?: string) {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, "");
    const final = cleaned.startsWith("0") ? "62" + cleaned.slice(1) : cleaned;
    return `https://wa.me/${final}`;
}

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
            <Card className="sticky top-[106px] z-20 border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="p-4 flex flex-row flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-primary-foreground/50" />
                        <Input 
                            placeholder="Cari nama atau NIS..." 
                            className="pl-9 h-9 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={filterYear} onValueChange={setFilterYear}>
                            <SelectTrigger className="w-[140px] h-8 text-xs font-normal bg-white/10 border-white/20 text-white focus:ring-white/30">
                                <SelectValue placeholder="Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="semua">Semua Tahun</SelectItem>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none">
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
                                <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none">
                                <FileDown className="h-3.5 w-3.5" />
                                Ekspor
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportExcel}>
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPdf}>
                                <FileText className="mr-2 h-4 w-4 text-red-600" />
                                PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none" onClick={handlePrintTable}>
                            <Printer className="h-3.5 w-3.5" />
                            Cetak
                        </Button>
                        <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none" onClick={handleAdd}>
                            <PlusCircle className="h-3.5 w-3.5" />
                            Tambah Alumni
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <div className="pt-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/40"/>
                        <span className="text-xs font-medium uppercase tracking-widest">Memuat data alumni...</span>
                    </div>
                ) : filteredData.length > 0 ? (
                    <div className="space-y-3">
                        {filteredData.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-card border shadow-sm hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10 border-2 border-primary/5 group-hover:border-primary/20 transition-all">
                                        <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">{item.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-[12px] font-bold leading-tight uppercase text-foreground group-hover:text-primary transition-colors">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 rounded">
                                                NIS: {item.nis.replace('MDIA', '')}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground">•</span>
                                            <p className="text-[10px] text-primary/70 font-medium italic">Lulus TA {item.tahunLulus}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    {item.noWa && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-green-600 hover:bg-green-50" 
                                            asChild
                                        >
                                            <a href={formatWaLink(item.noWa)!} target="_blank" rel="noopener noreferrer">
                                                <WhatsAppIcon />
                                            </a>
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(item)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">
                        <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-10" />
                        <p className="text-sm font-medium">Belum ada data alumni untuk filter ini.</p>
                    </div>
                )}
            </div>

            <AlumniForm 
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                alumnus={selectedAlumnus}
                onSave={handleSave}
            />
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[28px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm font-bold uppercase tracking-tight">Hapus Alumni?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                        Tindakan ini akan menghapus data alumni secara permanen dari sistem.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full h-9 text-xs">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white rounded-full h-9 text-xs">Ya, Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
