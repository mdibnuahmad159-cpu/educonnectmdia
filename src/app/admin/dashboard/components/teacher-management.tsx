"use client";

import { useState, useMemo, useRef } from "react";
import { PlusCircle, AlertTriangle, Download, Upload, FileDown, FileUp, FileSpreadsheet, FileText, Printer, Loader2 } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { addTeacher, updateTeacher, deleteTeacher, addTeachersBatch } from "@/lib/firebase-helpers";
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
import { TeacherForm } from "./teacher-form";
import { TeacherDetail } from "./teacher-detail"; 
import type { Teacher } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { collection, Firestore } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


export function TeacherManagement() {
  const firestore = useFirestore() as Firestore;
  const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
  const { data: teachers, loading, error } = useCollection<Teacher>(teachersCollection);
  const { user } = useUser();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);

  const jabatanOrder = useMemo(() => [
    'Pengasuh',
    'Pengawas',
    'Kepala Madrasah',
    'Wakil Kepala Madrasah',
    'Sekretaris',
    'Bendahara',
    ...Array.from({ length: 7 }, (_, i) => `Wali Kelas ${6 - i}`), // Wali Kelas 6, 5, ... 0
    'Guru',
  ], []);

  const sortedTeachers = useMemo(() => {
    if (!teachers) return [];
    return [...teachers].sort((a, b) => {
      const indexA = jabatanOrder.indexOf(a.jabatan || '');
      const indexB = jabatanOrder.indexOf(b.jabatan || '');
      const finalIndexA = indexA === -1 ? Infinity : indexA;
      const finalIndexB = indexB === -1 ? Infinity : indexB;
      
      if (finalIndexA === finalIndexB) {
        return a.name.localeCompare(b.name);
      }

      return finalIndexA - finalIndexB;
    });
  }, [teachers, jabatanOrder]);

  const handleAdd = () => {
    setSelectedTeacher(null);
    setIsFormOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleDetail = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDetailOpen(true);
  };

  const handleDelete = (id: string) => {
    setTeacherToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!firestore || !teacherToDelete) return;
    deleteTeacher(firestore, teacherToDelete);
    toast({ title: "Guru Dihapus", description: "Data guru berhasil dihapus dari daftar." });
    setIsDeleteDialogOpen(false);
    setTeacherToDelete(null);
  };
  
  const handleSave = async (teacherData: any) => {
    if (!firestore) return;

    if (selectedTeacher) {
      try {
        const { id, ...dataToUpdate } = teacherData;
        await updateTeacher(firestore, selectedTeacher.id, dataToUpdate);
        toast({ title: "Guru Diperbarui", description: "Data guru berhasil diperbarui." });
        setIsFormOpen(false);
        setSelectedTeacher(null);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Memperbarui", description: error.message });
      }
    } else {
      try {
        const { id, ...dataToAdd } = teacherData;
        await addTeacher(firestore, dataToAdd);
        toast({ title: "Guru Ditambahkan", description: "Data guru baru berhasil ditambahkan." });
        setIsFormOpen(false);
        setSelectedTeacher(null);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
      }
    }
  };

    const teacherColumns = {
        name: 'Nama Lengkap',
        email: 'Email',
        jabatan: 'Jabatan',
        noWa: 'No. WA',
        nik: 'NIK',
        pendidikan: 'Pendidikan',
        ponpes: 'Latar Belakang Ponpes',
        alamat: 'Alamat',
    };

    const handleDownloadTeacherTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([{}], { header: Object.values(teacherColumns) });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Guru');
        XLSX.writeFile(workbook, 'template_guru.xlsx');
    };

    const handleImportTeachers = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

                toast({ title: "Mengimpor Data", description: `Mulai mengimpor ${json.length} data guru...` });

                const teachersToImport: Omit<Teacher, 'id'>[] = [];
                let errorCount = 0;

                for (const item of json) {
                    const teacherData: any = {};
                    const columnKeys = Object.keys(teacherColumns);
                    const columnValues = Object.values(teacherColumns);
                    for(const key in item) {
                        const columnIndex = columnValues.indexOf(key);
                        if (columnIndex > -1) {
                            teacherData[columnKeys[columnIndex]] = item[key] ?? '';
                        }
                    }

                    if (!teacherData.name) {
                        errorCount++;
                        continue;
                    }

                    teachersToImport.push(teacherData as Omit<Teacher, 'id'>);
                }

                if (teachersToImport.length > 0) {
                    await addTeachersBatch(firestore, teachersToImport);
                    toast({ title: "Impor Selesai", description: `${teachersToImport.length} guru berhasil diimpor. ${errorCount} gagal.` });
                } else {
                    toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data valid untuk diimpor." });
                }

            } catch (error) {
                toast({ variant: "destructive", title: "Gagal Memproses File", description: "Terjadi kesalahan saat memproses file Excel." });
                console.error(error);
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };


    const handleExportTeachersExcel = () => {
        if (!sortedTeachers) return;
        const dataToExport = sortedTeachers.map(t => ({
            'Nama Lengkap': t.name,
            'Jabatan': t.jabatan || '-',
            'Email': t.email || '-',
            'No. WA': t.noWa || '-',
            'NIK': t.nik || '-',
            'Pendidikan': t.pendidikan || '-',
            'Latar Belakang Ponpes': t.ponpes || '-',
            'Alamat': t.alamat || '-',
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Guru');
        XLSX.writeFile(workbook, 'data_guru.xlsx');
    };

    const handleExportTeachersPdf = () => {
        if (!sortedTeachers) return;
        const doc = new jsPDF();
        
        doc.text('Data Guru', 14, 16);

        const tableColumn = ['No', 'Nama Lengkap', 'Jabatan', 'Email', 'No. WA'];
        const tableRows: (string | number)[][] = [];

        sortedTeachers.forEach((teacher, index) => {
            const teacherData = [
                index + 1,
                teacher.name,
                teacher.jabatan || '-',
                teacher.email || '-',
                teacher.noWa || '-',
            ];
            tableRows.push(teacherData);
        });

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });

        doc.save('data_guru.pdf');
    };

  const handlePrintTable = () => {
    if (!sortedTeachers || sortedTeachers.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data guru untuk dicetak." });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ variant: "destructive", title: "Gagal Membuka Jendela Cetak", description: "Mohon izinkan pop-up untuk situs ini." });
      return;
    }

    const tableRows = sortedTeachers.map((teacher, index) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 8px;">${teacher.name}</td>
        <td style="padding: 8px;">${teacher.jabatan || '-'}</td>
        <td style="padding: 8px;">${teacher.noWa || '-'}</td>
        <td style="padding: 8px;">${teacher.email || '-'}</td>
      </tr>
    `).join('');

    const content = `
      <html>
        <head>
          <title>Cetak Data Guru</title>
          <style>
            body { font-family: sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; text-align: left; }
            th { background-color: #f2f2f2; padding: 8px; }
            h1 { font-size: 18px; }
            @media print {
              @page { size: A4 landscape; margin: 20mm; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Data Seluruh Guru</h1>
          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">No.</th>
                <th>Nama</th>
                <th>Jabatan</th>
                <th>No. WA</th>
                <th>Email</th>
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

  if (error && error.message.includes("Missing or insufficient permissions")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" />
            Akses Ditolak
          </CardTitle>
          <CardDescription>
            Anda tidak memiliki izin untuk melihat data guru.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Data Guru</CardTitle>
          <CardDescription>
            Kelola data guru Madrasah.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end gap-2 mb-4">
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button size="xs" variant="outline" className="gap-1">
                  <FileUp className="h-4 w-4" />
                  Impor
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadTeacherTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Unduh Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Unggah Excel
                  </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
              <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleImportTeachers}
              />

              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button size="xs" variant="outline" className="gap-1">
                  <FileDown className="h-4 w-4" />
                  Ekspor
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportTeachersExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Ekspor ke Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportTeachersPdf}>
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
              Tambah Guru
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">No.</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin"/>
                      <span>Memuat data guru...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedTeachers.length > 0 ? (
                sortedTeachers.map((teacher, index) => (
                <TableRow key={teacher.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={teacher.avatarUrl || undefined} alt={teacher.name} />
                          <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{teacher.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{teacher.jabatan || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="xs" onClick={() => handleDetail(teacher)}>
                        Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Belum ada data guru.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TeacherForm 
        isOpen={isFormOpen} 
        setIsOpen={setIsFormOpen} 
        teacher={selectedTeacher}
        onSave={handleSave}
      />
      
      <TeacherDetail
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        teacher={selectedTeacher}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Guru?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus data guru dari daftar aplikasi secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white">Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
