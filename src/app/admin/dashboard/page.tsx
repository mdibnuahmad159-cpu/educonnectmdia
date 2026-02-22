"use client";

import Link from "next/link";
import { useCollection } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, User, ChevronRight } from "lucide-react";
import type { Teacher, Student } from "@/types";

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
          <CardHeader className="pb-2">
              <CardTitle className="text-sm">Menu Navigasi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
                <Button asChild variant="outline" size="xs" className="justify-between">
                  <Link href="/admin/teachers">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Data Guru</span>
                      </span>
                      <ChevronRight className="h-4 w-4" />
                  </Link>
              </Button>
                <Button asChild variant="outline" size="xs" className="justify-between">
                  <Link href="/admin/students">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Data Siswa</span>
                      </span>
                      <ChevronRight className="h-4 w-4" />
                  </Link>
              </Button>
          </CardContent>
      </Card>
    </div>
  );
}
