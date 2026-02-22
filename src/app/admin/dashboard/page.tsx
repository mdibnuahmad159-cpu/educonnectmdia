"use client";

import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Users, 
  User, 
  BookCopy,
  Calendar,
  Mail,
  ClipboardCheck,
  FileText,
  School,
  GraduationCap,
  CreditCard,
  PiggyBank,
  History
} from "lucide-react";
import type { Teacher, Student } from "@/types";

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => (
    <Link 
      href={href} 
      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-center"
    >
        <Icon className="h-5 w-5" />
        <span className="text-xs font-medium">{label}</span>
    </Link>
);

export default function DashboardPage() {
  const firestore = useFirestore();
  const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
  
  const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
  const { data: students, loading: loadingStudents } = useCollection<Student>(studentsCollection);

  return (
    <div className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Total Guru</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-xl font-bold">
                    {loadingTeachers ? "..." : teachers?.length ?? 0}
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
                    {loadingStudents ? "..." : students?.length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                    Jumlah siswa yang terdaftar
                </p>
                </CardContent>
            </Card>
      </div>
      
      <Tabs defaultValue="akademik" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="akademik">Akademik</TabsTrigger>
            <TabsTrigger value="siswa">Siswa</TabsTrigger>
            <TabsTrigger value="keuangan">Keuangan</TabsTrigger>
        </TabsList>
        <TabsContent value="akademik">
            <Card>
                <CardContent className="grid grid-cols-3 gap-2 p-3">
                    <NavLink href="/admin/teachers" icon={Users} label="Data Guru" />
                    <NavLink href="/admin/curriculum" icon={BookCopy} label="Kurikulum" />
                    <NavLink href="/admin/schedule" icon={Calendar} label="Jadwal" />
                    <NavLink href="/admin/letters" icon={Mail} label="Surat" />
                    <NavLink href="/admin/grades" icon={ClipboardCheck} label="Nilai" />
                    <NavLink href="/admin/reports" icon={FileText} label="Rapor" />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="siswa">
            <Card>
                <CardContent className="grid grid-cols-3 gap-2 p-3">
                    <NavLink href="/admin/students" icon={User} label="Data Siswa" />
                    <NavLink href="/admin/class-management" icon={School} label="Manajemen Kelas" />
                    <NavLink href="/admin/alumni" icon={GraduationCap} label="Alumni" />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="keuangan">
            <Card>
                <CardContent className="grid grid-cols-3 gap-2 p-3">
                    <NavLink href="/admin/spp" icon={CreditCard} label="SPP" />
                    <NavLink href="/admin/tabungan" icon={PiggyBank} label="Tabungan" />
                    <NavLink href="/admin/riwayat-transaksi" icon={History} label="Riwayat Transaksi" />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
