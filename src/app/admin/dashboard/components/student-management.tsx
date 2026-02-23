
"use client";

import { useState, useRef } from "react";
import { MoreHorizontal, PlusCircle, AlertTriangle, Download, Upload, FileDown, FileUp, FileSpreadsheet, FileText } from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentForm } from "./student-form";
import type { Student } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { collection, Firestore } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from "date-fns";


export function StudentManagement() {
  const firestore = useFirestore() as Firestore;
  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const { data: students, loading, error } = useCollection<Student>(studentsCollection);
  const { user } = useUser();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    setSelectedStudent(null);
    setIsFormOpen(true);
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
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
      nis: 'NIS (wajib untuk impor)',
      firstName: 'Nama Depan',
      lastName: 'Nama Belakang',
      dateOfBirth: 'Tanggal Lahir (YYYY-MM-DD)',
      gender: 'Jenis Kelamin (Laki-laki/Perempuan)',
      address: 'Alamat',
      enrollmentDate: 'Tanggal Masuk (YYYY-MM-DD)',
      classId: 'ID Kelas',
      password: 'Password (untuk Wali Murid)',
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
                           if ((dataKey === 'dateOfBirth' || dataKey === 'enrollmentDate') && typeof item[key] === 'number') {
                               studentData[dataKey] = new Date(Math.round((item[key] - 25569) * 86400 * 1000)).toISOString();
                           } else {
                               studentData[dataKey] = item[key];
                           }
                      }
                  }

                  if (!studentData.nis || !studentData.firstName || !studentData.lastName) {
                      errorCount++;
                      console.error("Skipping student due to missing required fields:", studentData);
                      continue;
                  }

                  try {
                      await addStudent(firestore, studentData as Omit<Student, 'id'> & { id: string; password?: string });
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
      if (!students) return;
      const dataToExport = students.map(s => ({
          'NIS': s.nis,
          'Nama Lengkap': `${s.firstName} ${s.lastName}`,
          'Kelas': s.classId,
          'Tanggal Lahir': s.dateOfBirth ? format(new Date(s.dateOfBirth), 'yyyy-MM-dd') : '-',
          'Jenis Kelamin': s.gender,
          'Alamat': s.address,
          'Tanggal Masuk': s.enrollmentDate ? format(new Date(s.enrollmentDate), 'yyyy-MM-dd') : '-',
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
      XLSX.writeFile(workbook, 'data_siswa.xlsx');
  };

  const handleExportStudentsPdf = () => {
      if (!students) return;
      const doc = new jsPDF();
      
      doc.text('Data Siswa', 14, 16);

      const tableColumn = ['No', 'NIS', 'Nama Lengkap', 'Kelas'];
      const tableRows: (string | number)[][] = [];

      students.forEach((student, index) => {
          const studentData = [
              index + 1,
              student.nis,
              `${student.firstName} ${student.lastName}`,
              student.classId,
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
                Kelola data siswa dan akun wali murid.
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
                <TableHead>NIS</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Memuat data...</TableCell></TableRow>
              ) : students && students.length > 0 ? (
                students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.nis}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.avatarUrl} alt={`${student.firstName} ${student.lastName}`} />
                        <AvatarFallback>{student.firstName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{`${student.firstName} ${student.lastName}`}</span>
                    </div>
                  </TableCell>
                   <TableCell>{student.classId}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(student)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(student.id)}>Hapus</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
    </>
  );
}
