"use client";

import { useState } from "react";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useCollection, useAuth, useFirestore } from "@/firebase";
import { addTeacher, updateTeacher, deleteTeacher } from "@/lib/firebase-helpers";
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
import { TeacherForm } from "./teacher-form";
import type { Teacher } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Auth } from "firebase/auth";
import { Firestore } from "firebase/firestore";

export function TeacherManagement() {
  const { data: teachers, loading } = useCollection<Teacher>("teachers");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const { toast } = useToast();
  const auth = useAuth() as Auth;
  const firestore = useFirestore() as Firestore;

  const handleAdd = () => {
    setSelectedTeacher(null);
    setIsFormOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteTeacher(firestore, id);
      toast({ title: "Guru Dihapus", description: "Data guru berhasil dihapus." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: error.message });
    }
  };
  
  const handleSave = async (teacherData: any) => {
    if (!auth || !firestore) return;
    try {
      if (selectedTeacher) {
        const { password, ...teacherToUpdate } = teacherData;
        await updateTeacher(firestore, selectedTeacher.id, teacherToUpdate);
        toast({ title: "Guru Diperbarui", description: "Data guru berhasil diperbarui." });
        // NOTE: Password changes would be handled separately in a real app
      } else {
        if (!teacherData.password) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Password harus diisi untuk guru baru." });
            return;
        }
        await addTeacher(auth, firestore, teacherData);
        toast({ title: "Guru Ditambahkan", description: "Data guru baru berhasil ditambahkan." });
      }
      setIsFormOpen(false);
      setSelectedTeacher(null);
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
              <CardTitle>Data Guru</CardTitle>
              <CardDescription>
                Kelola data guru dan akun mereka.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={handleAdd}>
              <PlusCircle className="h-4 w-4" />
              Tambah Guru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3}>Memuat data...</TableCell></TableRow>
              ) : (teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEdit(teacher)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(teacher.id)}>Hapus</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )))}
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
    </>
  );
}
