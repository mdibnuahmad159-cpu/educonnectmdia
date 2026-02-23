
"use client";

import { useState, useRef, useMemo } from "react";
import { PlusCircle, AlertTriangle, Download, Upload, FileDown, FileUp, FileSpreadsheet, FileText } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { addStudent, updateStudent, deleteStudent } from "@/lib/firebase-helpers";
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
import { StudentForm } from "./student-form";
import { StudentDetail } from "./student-detail";
import type { Student } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { collection, Firestore } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


export function StudentManagement() {
  const firestore = useFirestore() as Firestore;
  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const { data: students, loading, error } = useCollection<Student>(studentsCollection);
  const { user } = useUser();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const sortedStudents = useMemo(() => {
    if (!students) return [];
    return [...students].sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const handleAdd = () => {
    setSelectedStudent(null);
    setIsFormOpen(true);
  };

  const handleDetail = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailOpen(true);
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
        await deleteStudent(firestore, id);
        toast({ title: "Siswa Dihapus", description: "Data siswa berhasil dihapus." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Menghapus", description: error.message });
    }
  };
  
  const handleSave = async (studentData: any) => {
    if (!firestore) return;
    try {
        if (selectedStudent) {
            await updateStudent(firestore, selectedStudent.id, studentData);
            toast({ title: "Siswa Diperbarui", description: "Data siswa berhasil diperbarui." });
        } else {
            await addStudent(firestore, studentData);
            toast({ title: "Siswa Ditambahkan", description: "Data siswa baru berhasil ditambahkan." });
        }
        setIsFormOpen(false);
        setSelectedStudent(null);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
    }
  };

  const studentColumns = {
      nis: 'NIS (wajib)',
      name: 'Nama Lengkap',
      nik: 'NIK',
      gender: 'Jenis Kelamin (Laki-laki/Perempuan)',
      tempatLahir: 'Tempat Lahir',
      dateOfBirth: 'Tanggal Lahir (DD-MM-YYYY)',
      namaAyah: 'Nama Ayah',
      namaIbu: 'Nama Ibu',
      address: 'Alamat',
  };

  const handleDownloadStudentTemplate = () => {
      const worksheet = XLSX.utils.json_to_sheet([{}], { header: Object.values(studentColumns) });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');
      XLSX.writeFile(workbook, 'template_siswa.xlsx');
  };

  const handleImportStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !firestore) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
           try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const json: any[] = XLSX.utils.sheet_to_json(worksheet);

              if (json.length === 0) {
                  toast({ variant: "destructive", title: "File Kosong", description: "File Excel yang Anda unggah tidak berisi data." });
                  return;
              }

              toast({ title: "Mengimpor Data", description: `Mulai mengimpor ${json.length} data siswa...` });

              let successCount = 0;
              let errorCount = 0;

              for (const item of json) {
                  const studentData: any = {};
                  const columnKeys = Object.keys(studentColumns);
                  const columnValues = Object.values(studentColumns);
                   for(const key in item) {
                      const columnIndex = columnValues.indexOf(key);
                      if (columnIndex > -1) {
                           const dataKey = columnKeys[columnIndex];
                           if (dataKey === 'dateOfBirth' && typeof item[key] === 'number') {
                               const date = new Date(Math.round((item[key] - 25569) * 86400 * 1000));
                               const day = String(date.getDate()).padStart(2, '0');
                               const month = String(date.getMonth() + 1).padStart(2, '0');
                               const year = date.getFullYear();
                               studentData[dataKey] = `${day}-${month}-${year}`;
                           } else {
                               studentData[dataKey] = item[key];
                           }
                      }
                  }

                  if (!studentData.nis || !studentData.name) {
                      errorCount++;
                      console.error("Skipping student due to missing required fields:", studentData);
                      continue;
                  }

                  try {
                      await addStudent(firestore, studentData as Omit<Student, 'id'>);
                      successCount++;
                  } catch (error) {
                      errorCount++;
                      console.error(`Gagal mengimpor siswa ${studentData.nis}:`, error);
                  }
              }

               toast({ title: "Impor Selesai", description: `${successCount} siswa berhasil diimpor. ${errorCount} gagal.` });

          } catch (error) {
              toast({ variant: "destructive", title: "Gagal Membaca File", description: "Tidak dapat memproses file Excel." });
              console.error(error);
          } finally {
              if (event.target) {
                  event.target.value = '';
              }
          }
      };
      reader.readAsArrayBuffer(file);
  };

  const handleExportStudentsExcel = () => {
      if (!sortedStudents) return;
      const dataToExport = sortedStudents.map(s => ({
          'NIS': s.nis,
          'Nama Lengkap': s.name,
          'NIK': s.nik || '-',
          'Jenis Kelamin': s.gender,
          'Tempat Lahir': s.tempatLahir || '-',
          'Tanggal Lahir': s.dateOfBirth || '-',
          'Nama Ayah': s.namaAyah || '-',
          'Nama Ibu': s.namaIbu || '-',
          'Alamat': s.address,
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
      XLSX.writeFile(workbook, 'data_siswa.xlsx');
  };

  const handleExportStudentsPdf = () => {
      if (!sortedStudents) return;
      const doc = new jsPDF();
      
      doc.text('Data Siswa', 14, 16);

      const tableColumn = ['No', 'NIS', 'Nama Lengkap', 'Jenis Kelamin'];
      const tableRows: (string | number)[][] = [];

      sortedStudents.forEach((student, index) => {
          const studentData = [
              index + 1,
              student.nis,
              student.name,
              student.gender,
          ];
          tableRows.push(studentData);
      });

      (doc as any).autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 20,
      });

      doc.save('data_siswa.pdf');
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
            Anda tidak memiliki izin untuk melihat data siswa.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Data Siswa</CardTitle>
              <CardDescription>
                Kelola data siswa.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="xs" variant="outline" className="gap-1">
                        <FileUp className="h-4 w-4" />
                        Impor
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleDownloadStudentTemplate}>
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
                    onChange={handleImportStudents}
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="xs" variant="outline" className="gap-1">
                        <FileDown className="h-4 w-4" />
                        Ekspor
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExportStudentsExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Ekspor ke Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportStudentsPdf}>
                        <FileText className="mr-2 h-4 w-4" />
                        Ekspor ke PDF
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button size="xs" className="gap-1" onClick={handleAdd}>
                <PlusCircle className="h-4 w-4" />
                Tambah Siswa
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">No.</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Memuat data...</TableCell></TableRow>
              ) : sortedStudents && sortedStudents.length > 0 ? (
                sortedStudents.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.avatarUrl} alt={student.name} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{student.name}</span>
                    </div>
                  </TableCell>
                   <TableCell>{student.nis}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="xs" onClick={() => handleDetail(student)}>
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Belum ada data siswa.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <StudentForm 
        isOpen={isFormOpen} 
        setIsOpen={setIsFormOpen} 
        student={selectedStudent}
        onSave={handleSave}
      />
      <StudentDetail
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        student={selectedStudent}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </>
  );
}
