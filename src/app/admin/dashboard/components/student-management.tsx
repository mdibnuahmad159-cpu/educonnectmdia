
"use client";

import { useState } from "react";
import { MoreHorizontal, PlusCircle, AlertTriangle } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { addStudent, updateStudent, deleteStudent } from "@/lib/firebase-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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

export function StudentManagement() {
  const firestore = useFirestore() as Firestore;
  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const { data: students, loading, error } = useCollection<Student>(studentsCollection);
  const { user } = useUser();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const { toast } = useToast();

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
        {user?.isAnonymous && (
          <>
            <CardContent>
              <p className="text-sm">
                Untuk mendapatkan akses admin penuh, Anda perlu menambahkan UID Anda ke koleksi `roles_admin` di database Firestore.
              </p>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 rounded-md border bg-muted p-3 text-sm">
                <p className="font-semibold">UID Admin Anda:</p>
                <code className="rounded-sm bg-muted-foreground/20 px-2 py-1 text-xs">{user.uid}</code>
                <p className="text-muted-foreground">
                  Buat dokumen baru di koleksi `roles_admin` dengan ID dokumen sama dengan UID di atas. Isi dokumen bisa kosong.
                </p>
            </CardFooter>
          </>
        )}
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
            <Button size="xs" className="gap-1" onClick={handleAdd}>
              <PlusCircle className="h-4 w-4" />
              Tambah Siswa
            </Button>
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
                  <TableCell>{`${student.firstName} ${student.lastName}`}</TableCell>
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
