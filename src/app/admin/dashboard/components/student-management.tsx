
"use client";

import { useState, useRef, useMemo } from "react";
import { PlusCircle, AlertTriangle, Download, Upload, FileDown, FileUp, FileSpreadsheet, FileText, Printer, Loader2, UserCircle, Search } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { addStudent, updateStudent, deleteStudent, addStudentsBatch } from "@/lib/firebase-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const sortedStudents = useMemo(() => {
    if (!students) return [];
    return [...students]
        .filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.nis.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchTerm]);

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

  const handleDelete = (id: string) => {
    if (!firestore) return;
    deleteStudent(firestore, id);
    toast({ title: "Siswa Dihapus", description: "Data siswa berhasil dihapus." });
    setIsDetailOpen(false);
  };
  
  const handleSave = (studentData: any) => {
    if (!firestore) return;
    
    if (selectedStudent) {
        updateStudent(firestore, selectedStudent.id, studentData);
        toast({ title: "Siswa Diperbarui", description: "Data siswa berhasil diperbarui." });
    } else {
        addStudent(firestore, studentData);
        toast({ title: "Siswa Ditambahkan", description: "Data siswa baru berhasil ditambahkan." });
    }
    setIsFormOpen(false);
    setSelectedStudent(null);
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
              const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

              if (json.length === 0) {
                  toast({ variant: "destructive", title: "File Kosong", description: "File Excel yang Anda unggah tidak berisi data." });
                  return;
              }

              toast({ title: "Mengimpor Data", description: `Mulai memproses ${json.length} data siswa...` });

              const studentsToImport: Omit<Student, 'id'>[] = [];
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
                               studentData[dataKey] = item[key] ?? '';
                           }
                      }
                  }

                  if (!studentData.nis || !studentData.name) {
                      errorCount++;
                      console.error("Skipping student due to missing required fields:", studentData);
                      continue;
                  }
                  
                  studentData.nis = String(studentData.nis);
                  studentsToImport.push(studentData as Omit<Student, 'id'>);
              }

              if (studentsToImport.length > 0) {
                  await addStudentsBatch(firestore, studentsToImport);
                  toast({ title: "Impor Selesai", description: `${studentsToImport.length} siswa berhasil diimpor. ${errorCount} gagal.` });
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

  const handlePrintTable = () => {
    if (!sortedStudents || sortedStudents.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data siswa untuk dicetak." });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ variant: "destructive", title: "Gagal Membuka Jendela Cetak", description: "Mohon izinkan pop-up untuk situs ini." });
      return;
    }

    const tableRows = sortedStudents.map((student, index) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 8px;">${student.name}</td>
        <td style="padding: 8px;">${student.nis}</td>
        <td style="padding: 8px;">${student.gender}</td>
        <td style="padding: 8px;">${student.address}</td>
      </tr>
    `).join('');

    const content = `
      <html>
        <head>
          <title>Cetak Data Siswa</title>
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
          <h1>Data Seluruh Siswa</h1>
          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">No.</th>
                <th>Nama</th>
                <th>NIS</th>
                <th>Jenis Kelamin</th>
                <th>Alamat</th>
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
          <CardTitle className="flex items-center gap-2 text-primary">
            <AlertTriangle className="text-destructive" />
            Akses Terbatas
          </CardTitle>
          <CardDescription>
            Anda memerlukan izin Administrator untuk melihat data siswa.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-headline text-primary">Data Siswa</CardTitle>
              <CardDescription className="text-xs">
                Kelola data santri Madrasah. NIS digunakan untuk login wali murid.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="xs" variant="outline" className="gap-1.5 border-primary/20 h-8">
                    <FileUp className="h-3.5 w-3.5" />
                    Impor
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadStudentTemplate}>
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
                onChange={handleImportStudents}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="xs" variant="outline" className="gap-1.5 border-primary/20 h-8">
                    <FileDown className="h-3.5 w-3.5" />
                    Ekspor
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportStudentsExcel}>
                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                    Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportStudentsPdf}>
                    <FileText className="mr-2 h-3.5 w-3.5" />
                    PDF
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="xs" variant="outline" className="gap-1.5 border-primary/20 h-8" onClick={handlePrintTable}>
                <Printer className="h-3.5 w-3.5" />
                Cetak
              </Button>
              <Button size="xs" className="gap-1.5 h-8 font-bold shadow-md" onClick={handleAdd}>
                <PlusCircle className="h-3.5 w-3.5" />
                Tambah Siswa
              </Button>
            </div>
          </div>
          
          <div className="relative mt-4 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Cari nama atau NIS santri..." 
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/40"/>
                    <span className="text-xs font-medium uppercase tracking-widest">Memuat data santri...</span>
                </div>
            ) : sortedStudents && sortedStudents.length > 0 ? (
                <div className="space-y-3">
                    {sortedStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-3 rounded-xl bg-card border shadow-sm hover:border-primary/20 transition-all group">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border-2 border-primary/5 group-hover:border-primary/20 transition-all">
                                    <AvatarImage src={student.avatarUrl || undefined} alt={student.name} className="object-cover" />
                                    <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">{student.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-[12px] font-bold leading-tight uppercase text-foreground group-hover:text-primary transition-colors">{student.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 rounded">NIS: {student.nis.replace('MDIA', '')}</p>
                                        <span className="text-[10px] text-muted-foreground">•</span>
                                        <p className="text-[10px] text-primary/70 font-medium">Kelas {student.kelas ?? '-'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-2 border-primary/10 hover:bg-primary/5 text-[11px] font-bold uppercase tracking-tight"
                                onClick={() => handleDetail(student)}
                            >
                                <UserCircle className="h-3.5 w-3.5" />
                                Detail
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">
                    <UserCircle className="h-10 w-10 mx-auto mb-3 opacity-10" />
                    <p className="text-sm font-medium">Belum ada data santri yang sesuai.</p>
                </div>
            )}
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
