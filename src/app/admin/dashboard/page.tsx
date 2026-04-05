
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  History,
  AlertTriangle,
  ClipboardList,
  Megaphone,
  UserCheck,
  Award,
  UsersRound,
  ReceiptText,
  Wallet,
  TrendingUp,
  Loader2
} from "lucide-react";
import type { Teacher, Student, SavingsTransaction, SPPPayment } from "@/types";
import { TeacherAttendanceCard } from "./components/teacher-attendance-card";
import { StudentAttendanceCard } from "./components/student-attendance-card";

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => (
    <Link 
      href={href} 
      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-center"
    >
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
    </Link>
);

export default function DashboardPage() {
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState("akademik");

  const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const savingsCollection = useMemoFirebase(() => firestore ? collection(firestore, "savingsTransactions") : null, [firestore]);
  const sppCollection = useMemoFirebase(() => firestore ? collection(firestore, "sppPayments") : null, [firestore]);
  
  const { data: teachers, loading: loadingTeachers, error: teachersError } = useCollection<Teacher>(teachersCollection);
  const { data: students, loading: loadingStudents, error: studentsError } = useCollection<Student>(studentsCollection);
  const { data: savings, loading: loadingSavings } = useCollection<SavingsTransaction>(savingsCollection);
  const { data: spp, loading: loadingSpp } = useCollection<SPPPayment>(sppCollection);

  const totalSavingsBalance = useMemo(() => {
    if (!savings) return 0;
    return savings.reduce((acc, t) => t.type === 'deposit' ? acc + t.amount : acc - t.amount, 0);
  }, [savings]);

  const totalSppIncome = useMemo(() => {
    if (!spp) return 0;
    return spp.reduce((acc, p) => acc + p.amountPaid, 0);
  }, [spp]);

  const hasPermissionError = teachersError || studentsError;

  if (hasPermissionError) {
      return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive" />
                    Akses Ditolak
                </CardTitle>
                <CardDescription>
                    Anda tidak memiliki izin untuk melihat data dasbor. Silakan coba login kembali sebagai admin.
                </CardDescription>
            </CardHeader>
        </Card>
      )
  }

  return (
    <div className="grid gap-4">
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Total Guru</CardTitle>
                <Users className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </CardHeader>
                <CardContent>
                <div className="text-lg font-bold">
                    {loadingTeachers ? <Loader2 className="h-4 w-4 animate-spin" /> : teachers?.length ?? 0}
                </div>
                <p className="text-[9px] text-muted-foreground">Guru terdaftar</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Total Siswa</CardTitle>
                <User className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </CardHeader>
                <CardContent>
                <div className="text-lg font-bold">
                    {loadingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : students?.length ?? 0}
                </div>
                <p className="text-[9px] text-muted-foreground">Siswa aktif</p>
                </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-tight text-primary">Total Tabungan</CardTitle>
                <PiggyBank className="h-3.5 w-3.5 text-primary opacity-50" />
                </CardHeader>
                <CardContent>
                <div className="text-lg font-bold text-primary">
                    {loadingSavings ? <Loader2 className="h-4 w-4 animate-spin" /> : `Rp ${totalSavingsBalance.toLocaleString()}`}
                </div>
                <p className="text-[9px] text-primary/60">Saldo seluruh penabung</p>
                </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-tight text-blue-700">Total SPP Masuk</CardTitle>
                <ReceiptText className="h-3.5 w-3.5 text-blue-700 opacity-50" />
                </CardHeader>
                <CardContent>
                <div className="text-lg font-bold text-blue-700">
                    {loadingSpp ? <Loader2 className="h-4 w-4 animate-spin" /> : `Rp ${totalSppIncome.toLocaleString()}`}
                </div>
                <p className="text-[9px] text-blue-600/60">Akumulasi iuran bulanan</p>
                </CardContent>
            </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="akademik">Akademik</TabsTrigger>
            <TabsTrigger value="siswa">Siswa</TabsTrigger>
            <TabsTrigger value="keuangan">Keuangan</TabsTrigger>
        </TabsList>
        <TabsContent value="akademik">
            <Card>
                <CardContent className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3">
                    <NavLink href="/admin/teachers" icon={Users} label="Data Guru" />
                    <NavLink href="/admin/curriculum" icon={BookCopy} label="Kurikulum" />
                    <NavLink href="/admin/schedule" icon={Calendar} label="Jadwal" />
                    <NavLink href="/admin/letters" icon={Mail} label="Surat" />
                    <NavLink href="/admin/grades" icon={ClipboardCheck} label="Nilai" />
                    <NavLink href="/admin/reports" icon={FileText} label="Rapor" />
                    <NavLink href="/admin/attendance" icon={ClipboardList} label="Absen Guru" />
                    <NavLink href="/admin/announcements" icon={Megaphone} label="Pengumuman" />
                    <NavLink href="/admin/certificates" icon={Award} label="Sertifikat" />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="siswa">
            <Card>
                <CardContent className="grid grid-cols-3 gap-2 p-3">
                    <NavLink href="/admin/students" icon={User} label="Data Siswa" />
                    <NavLink href="/admin/class-management" icon={School} label="Manajemen Kelas" />
                    <NavLink href="/admin/alumni" icon={GraduationCap} label="Alumni" />
                    <NavLink href="/admin/student-attendance" icon={UserCheck} label="Absen Siswa" />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="keuangan">
            <Card>
                <CardContent className="grid grid-cols-3 gap-2 p-3">
                    <NavLink href="/admin/penabung-luar" icon={UsersRound} label="Penabung Luar" />
                    <NavLink href="/admin/tabungan" icon={PiggyBank} label="Tabungan" />
                    <NavLink href="/admin/riwayat-tabungan" icon={History} label="Riwayat Tabungan" />
                    <NavLink href="/admin/spp" icon={CreditCard} label="Input SPP" />
                    <NavLink href="/admin/riwayat-spp" icon={ReceiptText} label="Riwayat SPP" />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      {activeTab === "akademik" && <TeacherAttendanceCard />}
      {activeTab === "siswa" && <StudentAttendanceCard />}

    </div>
  );
}
