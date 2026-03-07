
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, Firestore } from "firebase/firestore";
import type { Student, SPPPayment } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    CreditCard, 
    CheckCircle2, 
    XCircle, 
    Printer, 
    FileDown, 
    Users, 
    User,
    CalendarDays,
    ChevronRight,
    AlertCircle
} from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useToast } from "@/hooks/use-toast";
import { saveSPPPayment } from "@/lib/firebase-helpers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { PaymentForm } from "./components/payment-form";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MONTHS = [
    { id: 7, name: "Juli" },
    { id: 8, name: "Agustus" },
    { id: 9, name: "September" },
    { id: 10, name: "Oktober" },
    { id: 11, name: "November" },
    { id: 12, name: "Desember" },
    { id: 1, name: "Januari" },
    { id: 2, name: "Februari" },
    { id: 3, name: "Maret" },
    { id: 4, name: "April" },
    { id: 5, name: "Mei" },
    { id: 6, name: "Juni" },
];

export default function SppPage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<string>("0");
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
    const [activeMonth, setActiveMonth] = useState<{id: number, name: string} | null>(null);

    // Fetch students based on class
    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "students"), where("kelas", "==", Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);

    // Fetch payments for the selected student and academic year
    const paymentsQuery = useMemoFirebase(() => {
        if (!firestore || !selectedStudentId || !activeYear) return null;
        // In a real app, you might want to fetch by studentId AND academicYear if your logic supports it.
        // For simplicity, we filter by studentId and will manage year mapping in memory.
        return query(collection(firestore, "sppPayments"), where("studentId", "==", selectedStudentId));
    }, [firestore, selectedStudentId, activeYear]);
    const { data: payments, loading: loadingPayments } = useCollection<SPPPayment>(paymentsQuery);

    const selectedStudent = useMemo(() => {
        return students?.find(s => s.id === selectedStudentId);
    }, [students, selectedStudentId]);

    // Map payments to months
    const paymentStatusMap = useMemo(() => {
        const map = new Map<number, SPPPayment>();
        if (payments) {
            payments.forEach(p => {
                // Assuming year is correct for the active academic cycle
                map.set(p.month, p);
            });
        }
        return map;
    }, [payments]);

    const handleMonthClick = (month: {id: number, name: string}) => {
        setActiveMonth(month);
        setIsPaymentFormOpen(true);
    };

    const handleSavePayment = async (data: any) => {
        if (!firestore || !selectedStudent || !activeMonth) return;

        // Determine actual year based on month (School year 2023/2024 starts 2023 for July-Dec, 2024 for Jan-Jun)
        const [startYear, endYear] = activeYear.split('/').map(Number);
        const actualYear = activeMonth.id >= 7 ? startYear : endYear;

        const paymentData: Omit<SPPPayment, 'id'> = {
            studentId: selectedStudent.id,
            classId: String(selectedStudent.kelas),
            month: activeMonth.id,
            year: actualYear,
            amountDue: data.amountDue,
            amountPaid: data.amountPaid,
            paymentDate: data.paymentDate,
            status: data.amountPaid >= data.amountDue ? 'Paid' : (data.amountPaid > 0 ? 'Partial' : 'Unpaid'),
            notes: data.notes || ""
        };

        try {
            await saveSPPPayment(firestore, paymentData);
            toast({ title: "Pembayaran Tersimpan", description: `Pembayaran bulan ${activeMonth.name} berhasil diperbarui.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Terjadi kesalahan saat mencatat pembayaran." });
        }
    };

    const handleExportExcel = () => {
        if (!selectedStudent) return;
        const data = MONTHS.map(m => {
            const p = paymentStatusMap.get(m.id);
            return {
                'Bulan': m.name,
                'Status': p?.status === 'Paid' ? 'LUNAS' : (p?.status === 'Partial' ? 'CICIL' : 'BELUM BAYAR'),
                'Tanggal Bayar': p?.paymentDate ? format(parseISO(p.paymentDate), "d MMM yyyy", { locale: dfnsId }) : '-',
                'Jumlah Bayar': p?.amountPaid || 0,
                'Catatan': p?.notes || '-'
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Kartu SPP");
        XLSX.writeFile(workbook, `Kartu_SPP_${selectedStudent.name}_${activeYear.replace('/', '-')}.xlsx`);
    };

    const handlePrint = () => {
        if (!selectedStudent) return;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`KARTU KENDALI SPP`, 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Nama Siswa : ${selectedStudent.name}`, 14, 25);
        doc.text(`NIS : ${selectedStudent.nis}`, 14, 30);
        doc.text(`Kelas : ${selectedStudent.kelas}`, 14, 35);
        doc.text(`Tahun Ajaran : ${activeYear}`, 14, 40);

        (doc as any).autoTable({
            head: [['Bulan', 'Status', 'Tgl Bayar', 'Jumlah', 'Ket']],
            body: MONTHS.map(m => {
                const p = paymentStatusMap.get(m.id);
                return [
                    m.name,
                    p?.status === 'Paid' ? 'LUNAS' : (p?.status === 'Partial' ? 'CICIL' : 'BELUM BAYAR'),
                    p?.paymentDate ? format(parseISO(p.paymentDate), "d/MM/yy") : '-',
                    p?.amountPaid ? `Rp ${p.amountPaid.toLocaleString()}` : '0',
                    p?.notes || '-'
                ];
            }),
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50] }
        });

        window.open(doc.output('bloburl'), '_blank');
    };

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-headline text-primary">Pembayaran SPP</CardTitle>
                    <CardDescription className="text-xs">Kelola iuran bulanan siswa untuk tahun ajaran {activeYear}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Users className="h-3 w-3" /> Pilih Kelas
                            </label>
                            <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudentId(""); }}>
                                <SelectTrigger className="h-9 font-normal">
                                    <SelectValue placeholder="Pilih Kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...Array(7).keys()].map(i => (
                                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <User className="h-3 w-3" /> Pilih Nama Siswa
                            </label>
                            <Select 
                                value={selectedStudentId} 
                                onValueChange={setSelectedStudentId}
                                disabled={loadingStudents || !students?.length}
                            >
                                <SelectTrigger className="h-9 font-normal">
                                    <SelectValue placeholder={loadingStudents ? "Memuat siswa..." : "Pilih Siswa"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students?.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.nis})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!selectedStudentId ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-3 opacity-10" />
                    <p className="text-sm">Silakan pilih kelas dan siswa terlebih dahulu.</p>
                </div>
            ) : (
                <div className="grid gap-4 animate-in fade-in duration-500">
                    <Card className="border-none shadow-sm bg-primary/5">
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {selectedStudent?.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{selectedStudent?.name}</h3>
                                    <p className="text-[10px] text-muted-foreground">NIS: {selectedStudent?.nis} • Kelas {selectedStudent?.kelas}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="xs" onClick={handleExportExcel} className="h-8 px-3 gap-1.5 font-normal">
                                    <FileDown className="h-3.5 w-3.5" /> Ekspor
                                </Button>
                                <Button variant="outline" size="xs" onClick={handlePrint} className="h-8 px-3 gap-1.5 font-normal">
                                    <Printer className="h-3.5 w-3.5" /> Cetak
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {loadingPayments ? (
                            <div className="col-span-full flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                            </div>
                        ) : (
                            MONTHS.map((month) => {
                                const p = paymentStatusMap.get(month.id);
                                const isPaid = p?.status === 'Paid';
                                const isPartial = p?.status === 'Partial';
                                
                                return (
                                    <button 
                                        key={month.id}
                                        onClick={() => handleMonthClick(month)}
                                        className={cn(
                                            "group relative flex flex-col p-3 rounded-lg border transition-all hover:shadow-md text-left",
                                            isPaid ? "bg-green-50/50 border-green-200" : (isPartial ? "bg-amber-50/50 border-amber-200" : "bg-card border-border hover:border-primary/30")
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{month.name}</span>
                                            {isPaid ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            ) : isPartial ? (
                                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-destructive/30 group-hover:text-destructive/60 transition-colors" />
                                            )}
                                        </div>
                                        <div className="mt-auto">
                                            <p className={cn(
                                                "text-xs font-bold",
                                                isPaid ? "text-green-700" : (isPartial ? "text-amber-700" : "text-muted-foreground")
                                            )}>
                                                {p ? `Rp ${p.amountPaid.toLocaleString()}` : "Rp 0"}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground truncate">
                                                {p?.paymentDate ? format(parseISO(p.paymentDate), "d MMM yyyy", { locale: dfnsId }) : "Belum bayar"}
                                            </p>
                                        </div>
                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 rounded-lg pointer-events-none transition-opacity" />
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <Card className="border-primary/10 shadow-none bg-muted/5">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 rounded-full bg-primary/10">
                                <CalendarDays className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-xs text-muted-foreground">
                                <p className="font-semibold text-foreground">Informasi Pembayaran</p>
                                <p>Silakan klik pada kotak bulan untuk mencatat atau mengubah data pembayaran SPP siswa.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeMonth && (
                <PaymentForm 
                    isOpen={isPaymentFormOpen}
                    setIsOpen={setIsPaymentFormOpen}
                    month={activeMonth}
                    studentName={selectedStudent?.name || ""}
                    existingData={paymentStatusMap.get(activeMonth.id)}
                    onSave={handleSavePayment}
                />
            )}
        </div>
    );
}
