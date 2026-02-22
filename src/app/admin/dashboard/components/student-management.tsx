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
import { StudentForm } from "./student-form";
import type { Student } from "@/types";

const mockStudents: Student[] = [
  { id: '1001', name: 'Andi Pratama', class: '10A' },
  { id: '1002', name: 'Bunga Citra', class: '10B' },
  { id: '1003', name: 'Candra Wijaya', class: '11A' },
];

export function StudentManagement({ isActive }: { isActive: boolean }) {
  const [students, setStudents] = useState(mockStudents);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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

  const handleDelete = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
  };
  
  const handleSave = (student: Student) => {
    if (selectedStudent) {
      setStudents(students.map(s => s.id === student.id ? student : s));
    } else {
      setStudents([...students, student]);
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
              {students.map((student) => (
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
              ))}
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
