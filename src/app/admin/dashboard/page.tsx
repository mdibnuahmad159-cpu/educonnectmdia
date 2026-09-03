"use client";

import { useMemo, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, Firestore } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, 
  User, 
  PiggyBank, 
  AlertTriangle, 
  ReceiptText,
  Loader2,
  Umbrella,
  X
} from "lucide-react";
import type { Teacher, Student, SavingsTransaction, SPPPayment, Schedule, ScheduleEntry, TeacherAttendance, StudentAttendance } from "@/types";
import { TeacherAttendanceCard } from "./components/teacher-attendance-card";
import { StudentAttendanceCard } from "./components/student-attendance-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerHorizontal } from "./components/date-picker-horizontal";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { setGlobalHoliday } from "@/lib/firebase-helpers";
import { cn } from "@/lib/utils";
import { useAcademicYear } from "@/context/academic-year-provider";

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

export default function DashboardPage() {
  const firestore = useFirestore() as Firestore;
  const { toast } = useToast();
  const { activeYear } = useAcademicYear();

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isProcessingHoliday, setIsProcessingHoliday] = useState(false);

  const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
  const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
  const savingsCollection = useMemoFirebase(() => firestore ? collection(firestore, "savingsTransactions") : null, [firestore]);
  const sppCollection = useMemoFirebase(() => firestore ? collection(firestore, "sppPayments") : null, [firestore]);
  
  const { data: teachers, loading: loadingTeachers, error: teachersError } = useCollection<Teacher>(teachersCollection);
  const { data: students, loading: loadingStudents, error: studentsError } = useCollection<Student>(studentsCollection);
  const { data: savings, loading: loadingSavings } = useCollection<SavingsTransaction>(savingsCollection);
  const { data: spp, loading: loadingSpp } = useCollection<SPPPayment>(sppCollection);

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore || !activeYear) return null;
    return query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', 'pelajaran'));
  }, [firestore, activeYear]);
  const { data: schedules } = useCollection<Schedule>(schedulesQuery);

  const teacherAttendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedDate) return null;
    return query(collection(firestore, 'teacher_attendances'), where('date', '==', selectedDate));
  }, [firestore, selectedDate]);
  const { data: teacherAttendance } = useCollection<TeacherAttendance>(teacherAttendanceQuery);

  const isFriday = useMemo(() => {
    try { return parseISO(selectedDate).getDay() === 5; } catch (e) { return false; }
  }, [selectedDate]);

  const scheduledTeacherIdsToday = useMemo(() => {
    if (!schedules || !selectedDate) return new Set<string>();
    const dayIndex = parseISO(selectedDate).getDay();
    const dayKey = dayMapping[dayIndex];
    if (!dayKey) return new Set<string>();

    const teacherIds = new Set<string>();
    schedules.forEach(schedule => {
        const daySchedule = schedule[dayKey] as ScheduleEntry[];
        daySchedule?.forEach(entry => { if (entry.teacherId) teacherIds.add(entry.teacherId); });
    });
    return teacherIds;
  }, [schedules, selectedDate]);

  const scheduledTeachersToday = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter(t => scheduledTeacherIdsToday.has(t.id));
  }, [teachers, scheduledTeacherIdsToday]);

  const isHoliday = useMemo(() => {
    if (!scheduledTeachersToday.length || !teacherAttendance) return false;
    return scheduledTeachersToday.every(t => {
        const record = teacherAttendance.find(att => att.teacherId === t.id);
        return record?.status === 'Libur';
    });
  }, [scheduledTeachersToday, teacherAttendance]);

  const handleToggleHoliday = async () => {
    if (!firestore || !teachers || !students || isFriday) return;
    
    setIsProcessingHoliday(true);
    try {
        await setGlobalHoliday(firestore, selectedDate, teachers, students, isHoliday);
        toast({ 
            title: isHoliday ? "Sekolah Diaktifkan" : "Sekolah Diliburkan", 
            description: isHoliday ? "Status libur massal telah dibatalkan." : "Seluruh guru dan siswa telah ditandai libur." 
        });
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal" });
    } finally {
        setIsProcessingHoliday(false);
    }
  };

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
        <Card className="m-2">
            <CardHeader className="p-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> Akses Ditolak
                </CardTitle>
                <CardDescription className="text-[10px]">
                    Anda tidak memiliki izin untuk melihat data dasbor.
                </CardDescription>
            </CardHeader>
        </Card>
      )
  }

  return (
    <div className="grid gap-3">
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-primary text-primary-foreground border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
                <CardTitle className="text-[9px] font-bold uppercase tracking-tight text-primary-foreground/70">Total Guru</CardTitle>
                <Users className="h-3 w-3 text-primary-foreground/40" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                <div className="text-base font-bold text-white leading-none">
                    {loadingTeachers ? <Loader2 className="h-3 w-3 animate-spin" /> : teachers?.length ?? 0}
                </div>
                </CardContent>
            </Card>
            <Card className="bg-primary text-primary-foreground border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
                <CardTitle className="text-[9px] font-bold uppercase tracking-tight text-primary-foreground/70">Total Siswa</CardTitle>
                <User className="h-3 w-3 text-primary-foreground/40" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                <div className="text-base font-bold text-white leading-none">
                    {loadingStudents ? <Loader2 className="h-3 w-3 animate-spin" /> : students?.length ?? 0}
                </div>
                </CardContent>
            </Card>
            <Card className="bg-primary text-primary-foreground border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
                <CardTitle className="text-[9px] font-bold uppercase tracking-tight text-primary-foreground/70">Tabungan</CardTitle>
                <PiggyBank className="h-3 w-3 text-primary-foreground/40" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                <div className="text-base font-bold text-white leading-none truncate">
                    {loadingSavings ? <Loader2 className="h-3 w-3 animate-spin" /> : `Rp ${totalSavingsBalance.toLocaleString()}`}
                </div>
                </CardContent>
            </Card>
            <Card className="bg-primary text-primary-foreground border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
                <CardTitle className="text-[9px] font-bold uppercase tracking-tight text-primary-foreground/70">SPP Masuk</CardTitle>
                <ReceiptText className="h-3 w-3 text-primary-foreground/40" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                <div className="text-base font-bold text-white leading-none truncate">
                    {loadingSpp ? <Loader2 className="h-3 w-3 animate-spin" /> : `Rp ${totalSppIncome.toLocaleString()}`}
                </div>
                </CardContent>
            </Card>
      </div>

      <Card className="border-none shadow-sm p-3">
          <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                  <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-tight text-primary">Monitoring</h3>
                  </div>
                  <Button 
                    variant="outline" 
                    size="xs" 
                    className={cn(
                        "h-7 gap-1.5 border-primary/20 transition-all text-[9px] font-bold",
                        isHoliday ? "text-destructive border-destructive/20 hover:bg-destructive/5" : "text-primary hover:bg-primary/5"
                    )} 
                    onClick={handleToggleHoliday}
                    disabled={isProcessingHoliday || isFriday}
                  >
                      {isProcessingHoliday ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isHoliday ? (
                          <><X className="h-3 w-3" /> Aktifkan</>
                      ) : (
                          <><Umbrella className="h-3 w-3" /> Liburkan</>
                      )}
                  </Button>
              </div>
              <DatePickerHorizontal 
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
              />
          </div>
      </Card>

      <div className="mt-1">
        <Tabs defaultValue="guru" className="w-full">
            <div className="bg-muted/40 rounded-t-2xl flex overflow-hidden">
                <TabsList className="bg-transparent h-auto p-0 gap-0 w-full flex">
                    <TabsTrigger 
                        value="guru"
                        className="flex-1 rounded-t-2xl rounded-b-none py-2 data-[state=active]:bg-card data-[state=active]:shadow-none bg-transparent text-[10px] font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-primary transition-all"
                    >
                        Guru
                    </TabsTrigger>
                    <TabsTrigger 
                        value="siswa"
                        className="flex-1 rounded-t-2xl rounded-b-none py-2 data-[state=active]:bg-card data-[state=active]:shadow-none bg-transparent text-[10px] font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-primary transition-all"
                    >
                        Siswa
                    </TabsTrigger>
                </TabsList>
            </div>
            <div className="bg-card rounded-b-2xl border-x border-b shadow-sm overflow-hidden min-h-[300px]">
                <TabsContent value="guru" className="m-0 p-0 border-none outline-none">
                    <TeacherAttendanceCard selectedDate={selectedDate} />
                </TabsContent>
                <TabsContent value="siswa" className="m-0 p-0 border-none outline-none">
                    <StudentAttendanceCard selectedDate={selectedDate} />
                </TabsContent>
            </div>
        </Tabs>
      </div>
    </div>
  );
}
