"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useCollection, useFirestore } from "@/firebase";
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
import { Firestore } from "firebase/firestore";

export function StudentManagement({ isActive }: { isActive: boolean }) {
  const { data: students, loading } = useCollection<Student>("students");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const firestore = useFirestore() as Firestore;
  const { toast } = useToast();

  useEffect(() => {
    if (!isActive) {
      setIsFormOpen(false);
    }
  }, [isActive]);

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
  
  const handleSave = async (student: Student & { password?: string}) => {
    if (!firestore) return;
    try {
        if (selectedStudent) {
            await updateStudent(firestore, student.id, student);
            toast({ title: "Siswa Diperbarui", description: "Data siswa berhasil diperbarui." });
        } else {
            await addStudent(firestore, student);
            toast({ title: "Siswa Ditambahkan", description: "Data siswa baru berhasil ditambahkan." });
        }
        setIsFormOpen(false);
        setSelectedStudent(null);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
    }
  };


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
            <Button size="sm" className="gap-1" onClick={handleAdd}>
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
                <TableRow><TableCell colSpan={4}>Memuat data...</TableCell></TableRow>
              ) : (students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.id}</TableCell>
                  <TableCell>{student.name}</TableCell>
                   <TableCell>{student.class}</TableCell>
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
              )))}
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
