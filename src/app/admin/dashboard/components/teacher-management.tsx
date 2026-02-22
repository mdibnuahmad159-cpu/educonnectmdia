"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, PlusCircle } from "lucide-react";
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

const mockTeachers: Teacher[] = [
  { id: '1', name: 'Budi Santoso', email: 'budi.s@sekolah.id' },
  { id: '2', name: 'Citra Lestari', email: 'citra.l@sekolah.id' },
  { id: '3', name: 'Dewi Anggraini', email: 'dewi.a@sekolah.id' },
];

export function TeacherManagement({ isActive }: { isActive: boolean }) {
  const [teachers, setTeachers] = useState(mockTeachers);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    if (!isActive) {
      setIsFormOpen(false);
    }
  }, [isActive]);

  const handleAdd = () => {
    setSelectedTeacher(null);
    setIsFormOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
  };
  
  const handleSave = (teacher: Teacher) => {
    if (selectedTeacher) {
      setTeachers(teachers.map(t => t.id === teacher.id ? teacher : t));
    } else {
      setTeachers([...teachers, { ...teacher, id: (teachers.length + 2).toString() }]);
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
              {teachers.map((teacher) => (
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
              ))}
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
