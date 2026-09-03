"use client";

import { useState, useMemo, useRef } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore } from "firebase/firestore";
import type { Curriculum } from "@/types";
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
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, FileDown, Printer, FileSpreadsheet, FileText, FileUp, Download, Upload, BookOpen, SearchX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addCurriculum, updateCurriculum, deleteCurriculum, addCurriculumBatch } from "@/lib/firebase-helpers";
import { CurriculumForm } from "./components/curriculum-form";
import { cn } from "@/lib/utils";

export default function CurriculumPage() {
    const firestore = useFirestore() as Firestore;
    const curriculumCollection = useMemoFirebase(() => firestore ? collection(firestore, "curriculum") : null, [firestore]);
    const { data: curriculumData, loading } = useCollection<Curriculum>(curriculumCollection);
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
    const [curriculumToDelete, setCurriculumToDelete] = useState<string | null>(null);
    const [filterClass, setFilterClass] = useState<string>("semua");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredData = useMemo(() => {
        if (!curriculumData) return [];
        let data = [...curriculumData];
        if (filterClass !== "semua") {
            data = data.filter(item => item.classLevel === Number(filterClass));
        }
        return data.sort((a, b) => {
            if (a.classLevel !== b.classLevel) {
                return a.classLevel - b.classLevel;
            }
            return a.subjectCode.localeCompare(b.subjectCode);
        });
    }, [curriculumData, filterClass]);

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

    const confirmDelete = () => {
        if (!firestore || !curriculumToDelete) return;
        deleteCurriculum(firestore, curriculumToDelete);
        toast({ title: "Data Kurikulum Dihapus", description: "Data berhasil dihapus." });
        setIsDeleteDialogOpen(false);
        setCurriculumToDelete(null);
    };

    const handleSave = (data: Omit<Curriculum, 'id'>) => {
        if (!firestore) return;
        if (selectedCurriculum) {
            updateCurriculum(firestore, selectedCurriculum.id, data);
            toast({ title: "Kurikulum Diperbarui", description: "Data kurikulum berhasil diperbarui." });
        } else {
            addCurriculum(firestore, data);
            toast({ title: "Kurikulum Ditambahkan", description: "Data kurikulum baru berhasil ditambahkan." });
        }
        setIsFormOpen(false);
        setSelectedCurriculum(null);
    };
    
    const curriculumColumns = {
        subjectCode: 'Kode Mapel',
        subjectName: 'Nama Mapel',
        classLevel: 'Kelas (0-6)',
        bookName: 'Nama Kitab',
    };

    const handleDownloadCurriculumTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([{}], { header: Object.values(curriculumColumns) });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Kurikulum');
        XLSX.writeFile(workbook, 'template_kurikulum.xlsx');
    };

    const handleImportCurriculum = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

                toast({ title: "Mengimpor Data", description: `Mulai memproses ${json.length} data kurikulum...` });

                const itemsToImport: Omit<Curriculum, 'id'>[] = [];
                let errorCount = 0;

                for (const item of json) {
                    const curriculumData: any = {};
                    const columnKeys = Object.keys(curriculumColumns);
                    const columnValues = Object.values(curriculumColumns);
                     for(const key in item) {
                        const columnIndex = columnValues.indexOf(key);
                        if (columnIndex > -1) {
                             const dataKey = columnKeys[columnIndex];
                             curriculumData[dataKey] = item[key] ?? '';
                        }
                    }

                    if (!curriculumData.subjectCode || !curriculumData.subjectName || curriculumData.classLevel === undefined) {
                        errorCount++;
                        console.error("Skipping curriculum item due to missing required fields:", curriculumData);
                        continue;
                    }

                    curriculumData.classLevel = Number(curriculumData.classLevel);
                    itemsToImport.push(curriculumData as Omit<Curriculum, 'id'>);
                }

                if (itemsToImport.length > 0) {
                    await addCurriculumBatch(firestore, itemsToImport);
                    toast({ title: "Impor Selesai", description: `${itemsToImport.length} item berhasil diimpor. ${errorCount} gagal.` });
                } else {
                    toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data valid untuk diimpor." });
                }

            } catch (error) {
                toast({ variant: "destructive", title: "Gagal Memproses File", description: "Terjadi kesalahan saat menyimpan data. Pastikan format Excel benar." });
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
          'Kode Mapel': item.subjectCode,
          'Nama Mapel': item.subjectName,
          'Kelas': `Kelas ${item.classLevel}`,
          'Nama Kitab': item.bookName || '-',
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kurikulum');
      XLSX.writeFile(workbook, 'data_kurikulum.xlsx');
    };

    const handleExportPdf = () => {
        if (!filteredData) return;
        const doc = new jsPDF();
        doc.text('Data Kurikulum', 14, 16);
        (doc as any).autoTable({
            head: [['No', 'Kode Mapel', 'Nama Mapel', 'Kelas', 'Nama Kitab']],
            body: filteredData.map((item, index) => [
                index + 1,
                item.subjectCode,
                item.subjectName,
                `Kelas ${item.classLevel}`,
                item.bookName || '-'
            ]),
            startY: 20,
        });
        doc.save('data_kurikulum.pdf');
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
                <td>${item.subjectCode}</td>
                <td>${item.subjectName}</td>
                <td>Kelas ${item.classLevel}</td>
                <td>${item.bookName || '-'}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Data Kurikulum</title>
                    <style>
                        body { font-family: sans-serif; font-size: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
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
                                <th>Nama Mapel</th>
                                <th>Kelas</th>
                                <th>Nama Kitab</th>
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
                    <Select value={filterClass} onValueChange={setFilterClass}>
                        <SelectTrigger className="w-[140px] h-8 text-xs font-normal bg-white/10 border-white/20 text-white focus:ring-white/30">
                            <SelectValue placeholder="Semua Kelas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">Semua Kelas</SelectItem>
                            {[...Array(7).keys()].map(i => (
                                <SelectItem key={i} value={String(i)}>Kelas {i === 0 ? 'Sifir' : i}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none" onClick={handleDownloadCurriculumTemplate}>
                        <FileUp className="h-3.5 w-3.5" /> Template
                    </Button>
                    <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5" /> Unggah
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx, .xls"
                        onChange={handleImportCurriculum}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none">
                            <FileDown className="h-3.5 w-3.5" /> Ekspor
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleExportExcel}>
                            <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPdf}>
                            <FileText className="mr-2 h-3.5 w-3.5" /> PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none" onClick={handlePrintTable}>
                        <Printer className="h-3.5 w-3.5" /> Cetak
                    </Button>
                    <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none" onClick={handleAdd}>
                        <PlusCircle className="h-3.5 w-3.5" /> Tambah Mapel
                    </Button>
                </CardHeader>
            </Card>

            <div className="pt-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/40"/>
                        <span className="text-xs font-medium uppercase tracking-widest">Memuat kurikulum...</span>
                    </div>
                ) : filteredData && filteredData.length > 0 ? (
                    <div className="space-y-3">
                        {filteredData.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-card border shadow-sm hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold leading-tight uppercase text-foreground group-hover:text-primary transition-colors">
                                            {item.subjectName}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 rounded">KODE: {item.subjectCode}</p>
                                            <span className="text-[10px] text-muted-foreground">•</span>
                                            <p className="text-[10px] text-primary/70 font-medium">Kelas {item.classLevel}</p>
                                            {item.bookName && (
                                                <>
                                                    <span className="text-[10px] text-muted-foreground">•</span>
                                                    <p className="text-[10px] italic text-muted-foreground">Kitab: {item.bookName}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
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
                        <SearchX className="h-10 w-10 mx-auto mb-3 opacity-10" />
                        <p className="text-sm font-medium">Belum ada mata pelajaran terdaftar.</p>
                    </div>
                )}
            </div>

            <CurriculumForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                curriculum={selectedCurriculum}
                onSave={handleSave}
            />
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Mata Pelajaran?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan menghapus mata pelajaran dari kurikulum secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white text-xs">Ya, Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
