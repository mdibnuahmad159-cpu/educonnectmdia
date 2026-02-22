import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherManagement } from "./components/teacher-management";
import { StudentManagement } from "./components/student-management";

export default function DashboardPage() {
  return (
    <div className="grid flex-1 items-start gap-4">
      <Tabs defaultValue="teachers">
        <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="teachers">Kelola Guru</TabsTrigger>
              <TabsTrigger value="students">Kelola Siswa</TabsTrigger>
            </TabsList>
        </div>
        <div className="mt-4">
            <TabsContent value="teachers">
                <TeacherManagement />
            </TabsContent>
            <TabsContent value="students">
                <StudentManagement />
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
