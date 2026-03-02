"use client";

import { useEffect, useState } from "react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Student } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, AlertTriangle } from "lucide-react";

export default function ParentDashboardPage() {
  const [nis, setNis] = useState<string | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    // This runs on the client, so window is available.
    const storedNis = sessionStorage.getItem('studentNis');
    setNis(storedNis);
  }, []);

  const studentRef = useMemoFirebase(() => {
    if (!firestore || !nis) return null;
    return doc(firestore, "students", nis);
  }, [firestore, nis]);

  const { data: student, loading: isStudentLoading, error } = useDoc<Student>(studentRef);
  
  const isLoading = !nis || isStudentLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" />
            Gagal Memuat Data
          </CardTitle>
          <CardDescription>
            Terjadi kesalahan saat mengambil data siswa. Silakan coba lagi.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (!student) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" />
            Data Siswa Tidak Ditemukan
          </CardTitle>
          <CardDescription>
            Data untuk NIS yang Anda gunakan tidak ditemukan. Hubungi administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={student.avatarUrl} alt={student.name} />
                        <AvatarFallback className="text-2xl">{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-xl">{student.name}</CardTitle>
                        <CardDescription>NIS: {student.nis}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 text-xs">
                    <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">Jenis Kelamin</span>
                        <span className="col-span-2">{student.gender}</span>
                    </div>
                     <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">Tanggal Lahir</span>
                        <span className="col-span-2">{student.dateOfBirth}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">Alamat</span>
                        <span className="col-span-2">{student.address}</span>
                    </div>
                     <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">Nama Ayah</span>
                        <span className="col-span-2">{student.namaAyah || "-"}</span>
                    </div>
                     <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">Nama Ibu</span>
                        <span className="col-span-2">{student.namaIbu || "-"}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}