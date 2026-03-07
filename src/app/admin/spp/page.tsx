
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, Firestore } from "firebase/firestore";
import type { Student, SPPPayment } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Settings2,
    FileSpreadsheet,
    FileText,
    TrendingUp,
    AlertCircle,
    BadgeCheck
} from "lucide-react";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { useToast } from "@/hooks/use-toast";
import { saveSPPPayment, updateSchoolProfile } from "@/lib/firebase-helpers";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { PaymentForm } from "./components/payment-form";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const { profile } = useSchoolProfile();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<string>("0");
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
    const [activeMonth, setActiveMonth] = useState<{id: number, name: string} | null>(null);

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "students"), where("kelas", "==", Number(selectedClass)));
    }, [firestore, selectedClass]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);

    const paymentsQuery = useMemoFirebase(() => {
        if (!firestore || !selectedStudentId || !activeYear) return null;
        return query(collection(firestore, "sppPayments"), where("studentId", "==", selectedStudentId));
    }, [firestore, selectedStudentId, activeYear]);
    const { data: payments, loading: loadingPayments } = useCollection<SPPPayment>(paymentsQuery);

    const selectedStudent = useMemo(() => {
        return students?.find(s => s.id === selectedStudentId);
    }, [students, selectedStudentId]);

    const paymentStatusMap = useMemo(() => {
        const map = new Map<number, SPPPayment>();
        if (payments) {
            payments.forEach(p => {
                map.set(p.month, p);
            });
        }
        return map;
    }, [payments]);

    const stats = useMemo(() => {
        const defaultAmount = profile?.defaultSppAmount || 50000;
        const paidPayments = payments?.filter(p => p.status === 'Paid') || [];
        const monthsPaidCount = paidPayments.length;
        const totalPaid = paidPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        
        // Aturan: Lunas jika sudah membayar minimal 10 bulan
        const targetMonths = 10;
        const remainingMonths = Math.max(0, targetMonths - monthsPaidCount);
        const arrears = remainingMonths * defaultAmount;
        const isYearlyPaid = monthsPaidCount >= targetMonths;

        return {
            totalPaid,
            monthsPaidCount,
            arrears,
            isYearlyPaid,
            targetMonths,
            remainingMonths
        };
    }, [payments, profile]);

    const handleMonthClick = (month: {id: number, name: string}) => {
        setActiveMonth(month);
        setIsPaymentFormOpen(true);
    };

    const handleSavePayment = async (data: { paymentDate: string, notes?: string }) => {
        if (!firestore || !selectedStudent || !activeMonth) return;

        const [startYear, endYear] = activeYear.split('/').map(Number);
        const actualYear = activeMonth.id >= 7 ? startYear : endYear;
        const defaultAmount = profile?.defaultSppAmount || 50000;

        const paymentData: Omit<SPPPayment, 'id'> = {
            studentId: selectedStudent.id,
            classId: String(selectedStudent.kelas),
            month: activeMonth.id,
            year: actualYear,
            amountDue: defaultAmount,
            amountPaid: defaultAmount,
            paymentDate: data.paymentDate,
            status: 'Paid',
            notes: data.notes || ""
        };

        try {
            await saveSPPPayment(firestore, paymentData);
            toast({ title: "Pembayaran Tersimpan", description: `Pembayaran bulan ${activeMonth.name} berhasil diperbarui sebagai LUNAS.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Terjadi kesalahan saat mencatat pembayaran." });
        }
    };

    const handleUpdateDefaultBill = (value: string) => {
        if (!firestore) return;
        const amount = Number(value);
        if (isNaN(amount)) return;
        updateSchoolProfile(firestore, { defaultSppAmount: amount });
    };

    const handleExportExcel = () => {
        if (!selectedStudent) return;
        const data = MONTHS.map(m => {
            const p = paymentStatusMap.get(m.id);
            return {
                'Bulan': m.name,
                'Status': p?.status === 'Paid' ? 'LUNAS' : 'BELUM BAYAR',
                'Tanggal Bayar': p?.paymentDate ? format(parseISO(p.paymentDate), "d MMM yyyy", { locale: dfnsId }) : '-',
                'Jumlah Bayar': p?.amountPaid || 0,
                'Catatan': p?.notes || '-'
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Kartu SPP");
        XLSX.writeFile(workbook, `Kartu_SPP_${selectedStudent.name.replace(/\s+/g, '_')}_${activeYear.replace('/', '-')}.xlsx`);
    };

    const handleExportPdf = () => {
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
                    p?.status === 'Paid' ? 'LUNAS' : 'BELUM BAYAR',
                    p?.paymentDate ? format(parseISO(p.paymentDate), "dd/MM/yyyy") : '-',
                    p?.amountPaid ? `Rp ${p.amountPaid.toLocaleString()}` : '0',
                    p?.notes || '-'
                ];
            }),
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50] }
        });

        doc.save(`Kartu_SPP_${selectedStudent.name.replace(/\s+/g, '_')}_${activeYear.replace('/', '-')}.pdf`);
    };

    const handlePrint = () => {
        if (!selectedStudent) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: "destructive", title: "Gagal membuka jendela cetak" });
            return;
        }

        const tableRows = MONTHS.map(m => {
            const p = paymentStatusMap.get(m.id);
            return `
                <tr>
                    <td>${m.name}</td>
                    <td style="color: ${p?.status === 'Paid' ? 'green' : 'red'}; font-weight: bold;">
                        ${p?.status === 'Paid' ? 'LUNAS' : 'BELUM BAYAR'}
                    </td>
                    <td>${p?.paymentDate ? format(parseISO(p.paymentDate), "dd/MM/yyyy") : '-'}</td>
                    <td>Rp ${p?.amountPaid ? p.amountPaid.toLocaleString() : '0'}</td>
                    <td>${p?.notes || '-'}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Kartu SPP - ${selectedStudent.name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; font-size: 12px; line-height: 1.6; }
                        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .school-name { font-size: 18px; font-weight: bold; text-transform: uppercase; }
                        .title { font-size: 16px; font-weight: bold; margin-top: 10px; }
                        .info-grid { display: grid; grid-template-cols: 120px auto; margin-bottom: 20px; }
                        .info-label { font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; text-transform: uppercase; font-size: 10px; }
                        .footer { margin-top: 40px; display: flex; justify-content: flex-end; }
                        .signature { text-align: center; width: 200px; }
                        @media print {
                            body { padding: 0; }
                            @page { size: A4; margin: 1.5cm; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="school-name">${profile?.namaMadrasah || 'MADRASAH DINIYAH IBNU AHMAD'}</div>
                        <div class="title">KARTU KENDALI PEMBAYARAN SPP</div>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-label">Nama Siswa</div><div>: ${selectedStudent.name}</div>
                        <div class="info-label">NIS</div><div>: ${selectedStudent.nis}</div>
                        <div class="info-label">Kelas</div><div>: ${selectedStudent.kelas}</div>
                        <div class="info-label">Tahun Ajaran</div><div>: ${activeYear}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Bulan</th>
                                <th>Status</th>
                                <th>Tgl Bayar</th>
                                <th>Jumlah Bayar</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>

                    <div class="footer">
                        <div class="signature">
                            <p>Sampang, ${format(new Date(), "dd MMMM yyyy", { locale: dfnsId })}</p>
                            <p style="margin-top: 60px;"><strong>Bendahara Madrasah</strong></p>
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    };

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-headline text-primary">Pembayaran SPP</CardTitle>
                    <CardDescription className="text-xs">Kelola pelunasan iuran bulanan siswa untuk tahun ajaran {activeYear}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Settings2 className="h-3 w-3" /> Tagihan Bulanan (Rp)
                            </label>
                            <Input 
                                type="number" 
                                placeholder="Contoh: 50000"
                                defaultValue={profile?.defaultSppAmount || 50000}
                                onBlur={(e) => handleUpdateDefaultBill(e.target.value)}
                                className="h-9 font-normal"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!selectedStudentId ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-3 opacity-10" />
                    <p className="text-sm">Silakan pilih kelas dan siswa untuk mencatat pelunasan.</p>
                </div>
            ) : (
                <div className="grid gap-4 animate-in fade-in duration-500">
                    {/* Ringkasan Statistik */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-none shadow-sm bg-primary/5">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Terbayar</p>
                                    <p className="text-lg font-bold text-primary">Rp {stats.totalPaid.toLocaleString()}</p>
                                    <p className="text-[9px] text-muted-foreground">Sudah membayar {stats.monthsPaidCount} bulan</p>
                                </div>
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-orange-50">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-orange-600">Total Tunggakan</p>
                                    <p className="text-lg font-bold text-orange-700">Rp {stats.arrears.toLocaleString()}</p>
                                    <p className="text-[9px] text-orange-600">Hingga target {stats.targetMonths} bulan</p>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-full">
                                    <AlertCircle className="h-5 w-5 text-orange-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={cn(
                            "border-none shadow-sm transition-colors",
                            stats.isYearlyPaid ? "bg-green-100" : "bg-muted/30"
                        )}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Status Tahunan</p>
                                    <p className={cn(
                                        "text-lg font-bold",
                                        stats.isYearlyPaid ? "text-green-700" : "text-muted-foreground"
                                    )}>
                                        {stats.isYearlyPaid ? "LUNAS TAHUNAN" : "BELUM LUNAS"}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">Syarat lunas: {stats.targetMonths} bulan</p>
                                </div>
                                <div className={cn(
                                    "p-3 rounded-full",
                                    stats.isYearlyPaid ? "bg-green-200" : "bg-muted"
                                )}>
                                    <BadgeCheck className={cn(
                                        "h-5 w-5",
                                        stats.isYearlyPaid ? "text-green-700" : "text-muted-foreground"
                                    )} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-none shadow-sm">
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
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="xs" className="h-8 px-3 gap-1.5 font-normal border-primary/20">
                                            <FileDown className="h-3.5 w-3.5" /> Ekspor
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleExportExcel}>
                                            <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel (.xlsx)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleExportPdf}>
                                            <FileText className="mr-2 h-3.5 w-3.5" /> PDF (.pdf)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="outline" size="xs" onClick={handlePrint} className="h-8 px-3 gap-1.5 font-normal border-primary/20">
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
                                
                                return (
                                    <button 
                                        key={month.id}
                                        onClick={() => handleMonthClick(month)}
                                        className={cn(
                                            "group relative flex flex-col p-3 rounded-lg border transition-all hover:shadow-md text-left",
                                            isPaid ? "bg-green-50/50 border-green-200" : "bg-card border-border hover:border-primary/30"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{month.name}</span>
                                            {isPaid ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-destructive/30 group-hover:text-destructive/60 transition-colors" />
                                            )}
                                        </div>
                                        <div className="mt-auto">
                                            <p className={cn(
                                                "text-xs font-bold",
                                                isPaid ? "text-green-700" : "text-muted-foreground"
                                            )}>
                                                {isPaid ? `LUNAS` : "BELUM BAYAR"}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground truncate">
                                                {p?.paymentDate ? format(parseISO(p.paymentDate), "d MMM yyyy", { locale: dfnsId }) : "-"}
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
                                <p className="font-semibold text-foreground">Kebijakan Kelunasan</p>
                                <p>Siswa dianggap memiliki status <strong>Lunas Tahunan</strong> setelah melunasi pembayaran untuk minimal 10 bulan dalam satu tahun ajaran aktif.</p>
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
                    defaultAmount={profile?.defaultSppAmount || 50000}
                    onSave={handleSavePayment}
                />
            )}
        </div>
    );
}
