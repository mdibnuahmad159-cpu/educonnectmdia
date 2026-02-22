"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherManagement } from "./components/teacher-management";
import { StudentManagement } from "./components/student-management";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("teachers");

  return (
    <div className="grid flex-1 items-start gap-4">
      <Tabs defaultValue="teachers" onValueChange={setActiveTab}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="teachers">Kelola Guru</TabsTrigger>
            <TabsTrigger value="students">Kelola Siswa</TabsTrigger>
          </TabsList>
        </div>
        <div className="mt-4">
          <TabsContent value="teachers">
            <TeacherManagement isActive={activeTab === "teachers"} />
          </TabsContent>
          <TabsContent value="students">
            <StudentManagement isActive={activeTab === "students"} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
