
"use client";

import { useState, useMemo } from "react";
import { PlusCircle, AlertTriangle } from "lucide-react";
import { useCollection, useAuth, useFirestore, useMemoFirebase, useUser } from "@/firebase";
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
import { TeacherForm } from "./teacher-form";
import { TeacherDetail } from "./teacher-detail"; // New component
import type { Teacher } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Auth } from "firebase/auth";
import { collection, Firestore } from "firebase/firestore";

export function TeacherManagement() {
  const firestore = useFirestore() as Firestore;
  const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
  const { data: teachers, loading, error } = useCollection<Teacher>(teachersCollection);
  const { user } = useUser();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const { toast } = useToast();
  const auth = useAuth() as Auth;

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
        const { id, ...dataToUpdate } = teacherData;
        await updateTeacher(firestore, selectedTeacher.id, dataToUpdate);
        toast({ title: "Guru Diperbarui", description: "Data guru berhasil diperbarui." });
      } else {
        if (!teacherData.password) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Password harus diisi untuk guru baru." });
            return;
        }
        const { id, ...dataToAdd } = teacherData;
        await addTeacher(auth, firestore, dataToAdd);
        toast({ title: "Guru Ditambahkan", description: "Data guru baru berhasil ditambahkan." });
      }
      setIsFormOpen(false);
      setSelectedTeacher(null);
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Data Guru</CardTitle>
              <CardDescription>
                Kelola data guru dan akun mereka.
              </CardDescription>
            </div>
            <Button size="xs" className="gap-1" onClick={handleAdd}>
              <PlusCircle className="h-4 w-4" />
              Tambah Guru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">No.</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>No. WA</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Memuat data...</TableCell></TableRow>
              ) : sortedTeachers.length > 0 ? (
                sortedTeachers.map((teacher, index) => (
                <TableRow key={teacher.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.jabatan || '-'}</TableCell>
                  <TableCell>{teacher.noWa || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="xs" onClick={() => handleDetail(teacher)}>
                        Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))) : (
                <TableRow><TableCell colSpan={5} className="text-center">Belum ada data guru.</TableCell></TableRow>
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
    </>
  );
}
