
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, TeacherAttendance, Schedule, ScheduleEntry } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Calendar, Camera, X, ChevronDown, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveTeacherAttendanceBatch } from '@/lib/firebase-helpers';
import { useAcademicYear } from '@/context/academic-year-provider';
import { Html5Qrcode } from 'html5-qrcode';
import { DatePickerHorizontal } from './date-picker-horizontal';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
const STATUS_OPTIONS: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa'];

const dayMapping: { [key: number]: keyof Omit<Schedule, 'id' | 'classLevel' | 'academicYear' | 'type'> } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    6: 'saturday',
};

function BarcodeScanner({ 
  onResult, 
  onClose 
}: { 
  onResult: (text: string) => void, 
  onClose: () => void 
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

      html5QrCode.start({ facingMode: "environment" }, config, onResult, undefined).catch(err => {
        html5QrCode.start({ facingMode: "user" }, config, onResult, undefined).catch(e => console.error(e));
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(err => console.warn(err));
      }
    };
  }, [onResult]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-primary/20 bg-muted/20">
        <div id="qr-reader" className="h-full w-full"></div>
        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 flex items-center justify-center">
            <div className="w-full h-full border-2 border-primary shadow-[0_0_0_100vw_rgba(0,0,0,0.3)]"></div>
        </div>
      </div>
      <Button variant="outline" onClick={onClose} className="w-full h-10 font-bold border-destructive/20 text-destructive">
          <X className="h-4 w-4 mr-2" /> Batalkan Scan
      </Button>
    </div>
  );
}

export function TeacherAttendanceCard() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { activeYear } = useAcademicYear();

    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersCollection);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'teacher_attendances'), where('date', '==', selectedDate));
    }, [firestore, selectedDate]);
    const { data: todaysAttendance, loading: loadingAttendance } = useCollection<TeacherAttendance>(attendanceQuery);
    
    const selectedDayKey = useMemo(() => {
        try { return dayMapping[parseISO(selectedDate).getDay()]; } catch (e) { return null; }
    }, [selectedDate]);

    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore || !activeYear) return null;
        return query(collection(firestore, 'schedules'), where('academicYear', '==', activeYear), where('type', '==', 'pelajaran'));
    }, [firestore, activeYear]);
    const { data: schedules } = useCollection<Schedule>(schedulesQuery);

    const scheduledTeacherIds = useMemo(() => {
        if (!schedules || !selectedDayKey) return new Set<string>();
        const teacherIds = new Set<string>();
        for (const schedule of schedules) {
            const daySchedule = schedule[selectedDayKey as keyof typeof schedule] as ScheduleEntry[];
            daySchedule?.forEach(entry => { if (entry.teacherId) teacherIds.add(entry.teacherId); });
        }
        return teacherIds;
    }, [schedules, selectedDayKey]);

    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [isSaving, setIsSaving] = useState<string | null>(null);

    useEffect(() => {
        if (todaysAttendance) {
            const initialAttendance = todaysAttendance.reduce((acc, record) => {
                acc[record.teacherId] = record.status;
                return acc;
            }, {} as Record<string, AttendanceStatus>);
            setAttendance(initialAttendance);
        } else {
            setAttendance({});
        }
    }, [todaysAttendance]);
    
    const scheduledTeachersOnSelectedDate = useMemo(() => {
        if (!selectedDayKey || !schedules || !teachers) return []; 
        return teachers.filter(teacher => scheduledTeacherIds.has(teacher.id)).sort((a,b) => a.name.localeCompare(b.name));
    }, [teachers, scheduledTeacherIds, selectedDayKey, schedules]);

    const handleStatusChange = (teacherId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [teacherId]: status }));
    };

    const handleSaveSingle = async (teacherId: string) => {
        if (!firestore) return;
        const teacher = teachers?.find(t => t.id === teacherId);
        if (!teacher) return;

        setIsSaving(teacherId);
        const status = attendance[teacherId] || 'Alpa';
        
        const attendancePayload: Omit<TeacherAttendance, 'id'>[] = [{
            teacherId: teacher.id,
            teacherName: teacher.name,
            date: selectedDate,
            status: status,
        }];

        try {
            await saveTeacherAttendanceBatch(firestore, attendancePayload);
            toast({ title: 'Absensi Diperbarui', description: `${teacher.name} berhasil ditandai ${status}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
        } finally {
            setIsSaving(null);
        }
    };

    const handleScannerResult = async (decodedText: string) => {
        const foundTeacher = teachers?.find(t => t.nig === decodedText || t.id === decodedText);
        if (foundTeacher) {
            const isScheduled = scheduledTeacherIds.has(foundTeacher.id);
            if (!isScheduled) {
                toast({ variant: "destructive", title: "Guru Tidak Terjadwal" });
            } else {
                setAttendance(prev => ({ ...prev, [foundTeacher.id]: 'Hadir' }));
                if (firestore && scheduledTeachersOnSelectedDate) {
                    setIsSaving(foundTeacher.id);
                    const payload: Omit<TeacherAttendance, 'id'>[] = [{
                        teacherId: foundTeacher.id,
                        teacherName: foundTeacher.name,
                        date: selectedDate,
                        status: 'Hadir',
                    }];
                    try {
                        await saveTeacherAttendanceBatch(firestore, payload);
                        toast({ title: "Absen Berhasil", description: `${foundTeacher.name} tercatat Hadir.` });
                        setIsScannerOpen(false);
                    } catch (error) { toast({ variant: 'destructive', title: 'Gagal' }); }
                    finally { setIsSaving(null); }
                }
            }
        } else { toast({ variant: "destructive", title: "QR Tidak Dikenal" }); }
    };
    
    const isLoading = loadingTeachers || loadingAttendance;

    return (
        <Card className="shadow-none border-none">
            <CardHeader className="pb-3 px-4">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                          <CardTitle className="text-lg font-headline">Absensi Guru</CardTitle>
                          <CardDescription>Pilih tanggal dan kelola kehadiran harian guru.</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 gap-2 border-primary/20 text-primary" onClick={() => setIsScannerOpen(true)}>
                          <Camera className="h-4 w-4" /> Scan QR
                      </Button>
                    </div>
                    <DatePickerHorizontal 
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                    />
                </div>
            </CardHeader>
            <CardContent className="px-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {scheduledTeachersOnSelectedDate.length > 0 ? scheduledTeachersOnSelectedDate.map(teacher => {
                            const currentStatus = attendance[teacher.id];
                            return (
                                <div key={teacher.id} className="flex items-center justify-between p-2 rounded-xl bg-card border shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={teacher.avatarUrl} alt={teacher.name} />
                                            <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-xs font-bold leading-tight">{teacher.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{teacher.nig}</p>
                                        </div>
                                    </div>
                                    
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="secondary" 
                                                size="xs" 
                                                className={cn(
                                                    "rounded-full font-bold px-3 h-[30px] border-none shadow-sm transition-all flex items-center gap-1.5 group",
                                                    currentStatus === 'Hadir' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                                    currentStatus === 'Sakit' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" :
                                                    currentStatus === 'Izin' ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                                                    currentStatus === 'Alpa' ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-muted"
                                                )}
                                            >
                                                <span className="text-[9px] uppercase tracking-wider">{currentStatus || 'Status'}</span>
                                                <ChevronDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-all group-data-[state=open]:rotate-180" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 rounded-[20px] p-1.5 shadow-2xl border-none bg-card z-50">
                                            <div className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                                Status Absen
                                            </div>
                                            {STATUS_OPTIONS.map((opt) => (
                                                <DropdownMenuItem 
                                                    key={opt}
                                                    onSelect={() => handleStatusChange(teacher.id, opt)}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2 rounded-[14px] cursor-pointer focus:bg-muted group transition-all text-[11px] font-bold uppercase",
                                                        currentStatus === opt ? "text-primary" : "text-muted-foreground"
                                                    )}
                                                >
                                                    {opt}
                                                    {currentStatus === opt && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
                                                </DropdownMenuItem>
                                            ))}
                                            
                                            {currentStatus && currentStatus !== 'Hadir' && (
                                                <>
                                                    <DropdownMenuSeparator className="my-1.5 bg-muted/50" />
                                                    <DropdownMenuItem 
                                                        onSelect={(e) => {
                                                            e.preventDefault();
                                                            handleSaveSingle(teacher.id);
                                                        }}
                                                        disabled={isSaving === teacher.id}
                                                        className="flex items-center justify-center gap-2 p-2 rounded-[14px] cursor-pointer bg-primary text-primary-foreground focus:bg-primary/90 text-[10px] font-bold uppercase"
                                                    >
                                                        {isSaving === teacher.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                        Simpan Perubahan
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            );
                        }) : (
                            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl opacity-50">
                                <p className="text-xs italic">Tidak ada jadwal mengajar pada hari ini.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>

            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <DialogContent className="sm:max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary"><Camera className="h-5 w-5" /> Pindai QR Guru</DialogTitle>
                        <DialogDescription className="text-xs">Arahkan kamera ke QR Code guru.</DialogDescription>
                    </DialogHeader>
                    {isScannerOpen && <BarcodeScanner onResult={handleScannerResult} onClose={() => setIsScannerOpen(false)} />}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
