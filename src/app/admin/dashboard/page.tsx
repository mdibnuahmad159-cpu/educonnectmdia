"use client";

import { useCollection } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User } from "lucide-react";
import type { Teacher, Student } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherManagement } from "./components/teacher-management";
import { StudentManagement } from "./components/student-management";


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
      
      <Tabs defaultValue="teachers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teachers">Data Guru</TabsTrigger>
          <TabsTrigger value="students">Data Siswa</TabsTrigger>
        </TabsList>
        <TabsContent value="teachers">
          <TeacherManagement />
        </TabsContent>
        <TabsContent value="students">
          <StudentManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
