"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import type { Student } from "@/types";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronsUp, ChevronsDown, ArrowRightLeft, Loader2 } from "lucide-react";

export default function ClassManagementPage() {
  const firestore = useFirestore();
  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const { data: students, loading } = useCollection<Student>(studentsCollection);
  const { toast } = useToast();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [targetClass, setTargetClass] = useState<number | null>(null);

  const sortedStudents = useMemo(() => {
    if (!students) return [];
    return [...students].sort((a, b) => {
      const classA = a.kelas ?? -1;
      const classB = b.kelas ?? -1;
      if (classA !== classB) {
        return classA - classB;
      }
      return a.name.localeCompare(b.name);
    });
  }, [students]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedStudents(sortedStudents.map((s) => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents((prev) => [...prev, studentId]);
    } else {
      setSelectedStudents((prev) => prev.filter((id) => id !== studentId));
    }
  };

  const performBatchUpdate = async (updateLogic: (student: Student) => { kelas: number } | null) => {
    if (!firestore || selectedStudents.length === 0) return;

    const batch = writeBatch(firestore);
    let updatedCount = 0;

    selectedStudents.forEach((studentId) => {
      const student = sortedStudents.find((s) => s.id === studentId);
      if (student) {
        const update = updateLogic(student);
        if (update) {
          const studentRef = doc(firestore, "students", studentId);
          batch.update(studentRef, update);
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      try {
        await batch.commit();
        toast({ title: "Update Berhasil", description: `${updatedCount} siswa telah diperbarui.` });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Update Gagal", description: error.message });
      }
    } else {
      toast({ variant: "destructive", title: "Tidak Ada Perubahan", description: "Tidak ada siswa yang memenuhi kriteria untuk diubah." });
    }

    setSelectedStudents([]);
  };

  const handlePromote = () => {
    performBatchUpdate((student) => {
      const currentClass = student.kelas ?? -1;
      return currentClass < 6 ? { kelas: currentClass + 1 } : null;
    });
  };

  const handleDemote = () => {
    performBatchUpdate((student) => {
      const currentClass = student.kelas ?? 0;
      return currentClass > 0 ? { kelas: currentClass - 1 } : null;
    });
  };

  const handleMove = () => {
    if (targetClass === null) return;
    performBatchUpdate(() => ({ kelas: targetClass }));
    setIsMoveDialogOpen(false);
    setTargetClass(null);
  };

  const isAllSelected = selectedStudents.length > 0 && selectedStudents.length === sortedStudents.length;
  const isIndeterminate = selectedStudents.length > 0 && selectedStudents.length < sortedStudents.length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Manajemen Kelas</CardTitle>
              <CardDescription>
                Kelola kenaikan, penurunan, dan perpindahan kelas siswa.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="xs" variant="outline" onClick={handlePromote} disabled={selectedStudents.length === 0} className="gap-1">
                <ChevronsUp /> Naik Kelas
              </Button>
              <Button size="xs" variant="outline" onClick={handleDemote} disabled={selectedStudents.length === 0} className="gap-1">
                <ChevronsDown /> Turun Kelas
              </Button>
              <Button size="xs" variant="outline" onClick={() => setIsMoveDialogOpen(true)} disabled={selectedStudents.length === 0} className="gap-1">
                <ArrowRightLeft /> Pindah Kelas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={isAllSelected ? true : (isIndeterminate ? "indeterminate" : false)}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[50px]">No.</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Kelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                     <div className="flex justify-center items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span>Memuat data...</span>
                     </div>
                  </TableCell>
                </TableRow>
              ) : sortedStudents.length > 0 ? (
                sortedStudents.map((student, index) => (
                  <TableRow key={student.id} data-state={selectedStudents.includes(student.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.nis}</TableCell>
                    <TableCell>{student.kelas !== undefined ? `Kelas ${student.kelas}` : "Belum diatur"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Belum ada data siswa.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pindah Kelas</AlertDialogTitle>
            <AlertDialogDescription>
              Pilih kelas tujuan untuk {selectedStudents.length} siswa yang dipilih.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
             <Select onValueChange={(value) => setTargetClass(Number(value))}>
                <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas tujuan" />
                </SelectTrigger>
                <SelectContent>
                    {[...Array(7).keys()].map(i => (
                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMove} disabled={targetClass === null}>Pindahkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
