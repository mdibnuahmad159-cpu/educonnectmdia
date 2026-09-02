
"use client";

import { useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, 
  User, 
  PiggyBank, 
  AlertTriangle, 
  ReceiptText,
  Loader2,
  CalendarCheck
} from "lucide-react";
import type { Teacher, Student, SavingsTransaction, SPPPayment } from "@/types";
import { TeacherAttendanceCard } from "./components/teacher-attendance-card";
import { StudentAttendanceCard } from "./components/student-attendance-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  const firestore = useFirestore();

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
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Total Guru</CardTitle>
                <Users className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                <div className="text-lg font-bold">
                    {loadingTeachers ? <Loader2 className="h-4 w-4 animate-spin" /> : teachers?.length ?? 0}
                </div>
                <p className="text-[9px] text-muted-foreground">Guru terdaftar</p>
                </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Total Siswa</CardTitle>
                <User className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                <div className="text-lg font-bold">
                    {loadingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : students?.length ?? 0}
                </div>
                <p className="text-[9px] text-muted-foreground">Siswa aktif</p>
                </CardContent>
            </Card>
            <Card className="bg-primary/5 border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-tight text-primary">Total Tabungan</CardTitle>
                <PiggyBank className="h-3.5 w-3.5 text-primary opacity-50" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                <div className="text-lg font-bold text-primary">
                    {loadingSavings ? <Loader2 className="h-4 w-4 animate-spin" /> : `Rp ${totalSavingsBalance.toLocaleString()}`}
                </div>
                <p className="text-[9px] text-primary/60">Saldo seluruh penabung</p>
                </CardContent>
            </Card>
            <Card className="bg-blue-50 border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-tight text-blue-700">Total SPP Masuk</CardTitle>
                <ReceiptText className="h-3.5 w-3.5 text-blue-700 opacity-50" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                <div className="text-lg font-bold text-blue-700">
                    {loadingSpp ? <Loader2 className="h-4 w-4 animate-spin" /> : `Rp ${totalSppIncome.toLocaleString()}`}
                </div>
                <p className="text-[9px] text-blue-600/60">Akumulasi iuran bulanan</p>
                </CardContent>
            </Card>
      </div>

      {/* Unified Attendance Tab Card */}
      <div className="mt-2">
        <Tabs defaultValue="guru" className="w-full">
            <div className="bg-muted/40 rounded-t-[24px] flex overflow-hidden">
                <TabsList className="bg-transparent h-auto p-0 gap-0 w-full flex">
                    <TabsTrigger 
                        value="guru"
                        className="flex-1 rounded-t-[24px] rounded-b-none py-4 data-[state=active]:bg-card data-[state=active]:shadow-none bg-transparent text-[11px] font-bold uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary transition-all"
                    >
                        Absensi Guru
                    </TabsTrigger>
                    <TabsTrigger 
                        value="siswa"
                        className="flex-1 rounded-t-[24px] rounded-b-none py-4 data-[state=active]:bg-card data-[state=active]:shadow-none bg-transparent text-[11px] font-bold uppercase tracking-widest text-muted-foreground data-[state=active]:text-primary transition-all"
                    >
                        Absensi Siswa
                    </TabsTrigger>
                </TabsList>
            </div>
            <div className="bg-card rounded-b-[24px] border-x border-b shadow-sm overflow-hidden min-h-[400px]">
                <TabsContent value="guru" className="m-0 p-0 border-none outline-none">
                    <TeacherAttendanceCard />
                </TabsContent>
                <TabsContent value="siswa" className="m-0 p-0 border-none outline-none">
                    <StudentAttendanceCard />
                </TabsContent>
            </div>
        </Tabs>
      </div>
    </div>
  );
}
