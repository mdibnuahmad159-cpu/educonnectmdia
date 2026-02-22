"use client";

import { useCollection } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, User, ArrowRight } from "lucide-react";
import type { Teacher, Student } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>("teachers");
  const { data: students, loading: loadingStudents } = useCollection<Student>("students");

  return (
    <div className="grid gap-2">
        <div className="grid gap-2 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Total Guru</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-xl font-bold">
                    {loadingTeachers ? "..." : teachers.length}
                </div>
                <p className="text-xs text-muted-foreground">
                    Jumlah guru yang terdaftar
                </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Total Siswa</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-xl font-bold">
                    {loadingStudents ? "..." : students.length}
                </div>
                <p className="text-xs text-muted-foreground">
                    Jumlah siswa yang terdaftar
                </p>
                </CardContent>
            </Card>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Kelola Data</CardTitle>
              <CardDescription>Navigasi ke halaman untuk mengelola data guru dan siswa.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
              <Link href="/admin/teachers" passHref>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                      <span>Halaman Data Guru</span>
                      <ArrowRight className="h-4 w-4" />
                  </Button>
              </Link>
              <Link href="/admin/students" passHref>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                      <span>Halaman Data Siswa</span>
                      <ArrowRight className="h-4 w-4" />
                  </Button>
              </Link>
          </CardContent>
      </Card>
    </div>
  );
}
