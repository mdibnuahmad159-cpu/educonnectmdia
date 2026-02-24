"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Teacher } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, AlertTriangle } from "lucide-react";

export default function TeacherDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const teacherRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "teachers", user.uid);
  }, [firestore, user]);

  const { data: teacher, isLoading: isTeacherLoading, error } = useDoc<Teacher>(teacherRef);

  const isLoading = isUserLoading || isTeacherLoading;

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
            Terjadi kesalahan saat mengambil data guru. Silakan coba lagi.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (!teacher) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" />
            Data Tidak Ditemukan
          </CardTitle>
          <CardDescription>
            Data guru untuk akun Anda tidak ditemukan. Hubungi administrator.
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
                        <AvatarImage src={teacher.avatarUrl} alt={teacher.name} />
                        <AvatarFallback className="text-2xl">{teacher.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-xl">{teacher.name}</CardTitle>
                        <CardDescription>{teacher.jabatan || 'Guru'}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 text-xs">
                    <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">Email</span>
                        <span className="col-span-2">{teacher.email}</span>
                    </div>
                     <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">No. WA</span>
                        <span className="col-span-2">{teacher.noWa || "-"}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">NIK</span>
                        <span className="col-span-2">{teacher.nik || "-"}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">Pendidikan</span>
                        <span className="col-span-2">{teacher.pendidikan || "-"}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">Latar Belakang Ponpes</span>
                        <span className="col-span-2">{teacher.ponpes || "-"}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center">
                        <span className="text-muted-foreground">Alamat</span>
                        <span className="col-span-2">{teacher.alamat || "-"}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
