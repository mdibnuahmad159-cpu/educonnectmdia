
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, doc } from "firebase/firestore";
import type { Student, SPPPayment, SavingsTransaction } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    ArrowLeft, 
    Wallet, 
    PiggyBank, 
    CreditCard, 
    History,
    CheckCircle2,
    XCircle,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    BadgeCheck
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { cn } from "@/lib/utils";

const MONTHS = [
    { id: 7, name: "Juli" }, { id: 8, name: "Agustus" }, { id: 9, name: "September" },
    { id: 10, name: "Oktober" }, { id: 11, name: "November" }, { id: 12, name: "Desember" },
    { id: 1, name: "Januari" }, { id: 2, name: "Februari" }, { id: 3, name: "Maret" },
    { id: 4, name: "April" }, { id: 5, name: "Mei" }, { id: 6, name: "Juni" },
];

export default function ParentFinancePage() {
    const [nis, setNis] = useState<string | null>(null);
    const firestore = useFirestore();
    const { activeYear } = useAcademicYear();
    const { profile } = useSchoolProfile();

    useEffect(() => {
        setNis(sessionStorage.getItem('studentNis'));
    }, []);

    const studentRef = useMemoFirebase(() => nis && firestore ? doc(firestore, "students", nis) : null, [firestore, nis]);
    const { data: student } = useDoc<Student>(studentRef);

    const sppQuery = useMemoFirebase(() => {
        if (!firestore || !nis) return null;
        return query(collection(firestore, "sppPayments"), where("studentId", "==", nis));
    }, [firestore, nis]);
    const { data: payments, loading: loadingSpp } = useCollection<SPPPayment>(sppQuery);

    const savingsQuery = useMemoFirebase(() => {
        if (!firestore || !nis) return null;
        return query(collection(firestore, "savingsTransactions"), where("saverId", "==", nis), orderBy("date", "desc"));
    }, [firestore, nis]);
    const { data: savings, loading: loadingSavings } = useCollection<SavingsTransaction>(savingsQuery);

    const balance = useMemo(() => {
        if (!savings) return 0;
        return savings.reduce((acc, t) => t.type === 'deposit' ? acc + t.amount : acc - t.amount, 0);
    }, [savings]);

    const academicYears = useMemo(() => {
        if (!activeYear) return { start: 0, end: 0 };
        const [start, end] = activeYear.split('/').map(Number);
        return { start, end };
    }, [activeYear]);

    const sppMap = useMemo(() => {
        const map = new Map<number, SPPPayment>();
        if (payments && academicYears.start) {
            payments.filter(p => {
                if (p.month >= 7) return p.year === academicYears.start;
                if (p.month <= 6) return p.year === academicYears.end;
                return false;
            }).forEach(p => map.set(p.month, p));
        }
        return map;
    }, [payments, academicYears]);

    const sppStats = useMemo(() => {
        const defaultAmount = profile?.defaultSppAmount || 50000;
        const targetMonths = 10; // Kebijakan Admin: 10 bulan lunas setahun
        let totalPaid = 0;
        let paidCount = 0;

        MONTHS.forEach(m => {
            const p = sppMap.get(m.id);
            if (p?.status === 'Paid') {
                totalPaid += p.amountPaid;
                paidCount++;
            }
        });

        const remainingNeeded = Math.max(0, targetMonths - paidCount);
        const totalArrears = remainingNeeded * defaultAmount;

        return {
            totalPaid,
            totalArrears,
            paidCount,
            targetMonths,
            isFullPaid: paidCount >= targetMonths
        };
    }, [sppMap, profile]);

    if (!nis || loadingSpp || loadingSavings) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/parent/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-headline font-bold text-primary">Keuangan Santri</h1>
            </div>

            {/* Savings Overview */}
            <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden relative">
                <CardContent className="p-5 flex items-center justify-between relative z-10">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold opacity-80 tracking-widest">Saldo Tabungan</p>
                        <p className="text-2xl font-bold">Rp {balance.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-full">
                        <PiggyBank className="h-6 w-6" />
                    </div>
                </CardContent>
                <div className="absolute -right-4 -bottom-4 opacity-10">
                    <Wallet className="h-24 w-24 rotate-12" />
                </div>
            </Card>

            {/* SPP Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="border-none shadow-sm bg-blue-50">
                    <CardContent className="p-4 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Total Terbayar</span>
                        </div>
                        <p className="text-sm font-bold text-blue-700">Rp {sppStats.totalPaid.toLocaleString()}</p>
                        <p className="text-[8px] text-blue-600/70 font-medium">Sudah bayar {sppStats.paidCount} bulan</p>
                    </CardContent>
                </Card>
                <Card className={cn(
                    "border-none shadow-sm transition-colors",
                    sppStats.isFullPaid ? "bg-green-50" : "bg-orange-50"
                )}>
                    <CardContent className="p-4 flex flex-col gap-1">
                        <div className={cn(
                            "flex items-center gap-2 mb-1",
                            sppStats.isFullPaid ? "text-green-600" : "text-orange-600"
                        )}>
                            {sppStats.isFullPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                            <span className="text-[9px] font-bold uppercase tracking-tight">Tunggakan (Target 10 Bln)</span>
                        </div>
                        <p className={cn(
                            "text-sm font-bold",
                            sppStats.isFullPaid ? "text-green-700" : "text-orange-700"
                        )}>
                            {sppStats.isFullPaid ? "LUNAS TAHUNAN" : `Rp ${sppStats.totalArrears.toLocaleString()}`}
                        </p>
                        <p className={cn(
                            "text-[8px] font-medium",
                            sppStats.isFullPaid ? "text-green-600/70" : "text-orange-600/70"
                        )}>Tahun Ajaran {activeYear}</p>
                    </CardContent>
                </Card>
            </div>

            {/* SPP Grid */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5" /> Kontrol Pembayaran SPP
                        </CardTitle>
                        <CardDescription className="text-[10px]">Riwayat pelunasan bulanan</CardDescription>
                    </div>
                    {sppStats.isFullPaid && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Lunas Tahunan
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-3 gap-2">
                    {MONTHS.map(m => {
                        const p = sppMap.get(m.id);
                        const isPaid = p?.status === 'Paid';
                        return (
                            <div key={m.id} className={cn(
                                "flex flex-col p-2 rounded-lg border text-center transition-colors",
                                isPaid ? "bg-green-50/50 border-green-100" : "bg-muted/20 border-transparent"
                            )}>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{m.name}</span>
                                <div className="flex justify-center my-1">
                                    {isPaid ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-muted-foreground/30" />}
                                </div>
                                <span className={cn(
                                    "text-[8px] font-bold uppercase",
                                    isPaid ? "text-green-700" : "text-muted-foreground/50"
                                )}>
                                    {isPaid ? "Lunas" : "Belum"}
                                </span>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Savings History */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <History className="h-3.5 w-3.5" /> Riwayat Mutasi Tabungan
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                    {savings && savings.length > 0 ? (
                        savings.map((t) => (
                            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-1.5 rounded-full",
                                        t.type === 'deposit' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                    )}>
                                        {t.type === 'deposit' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase">{t.type === 'deposit' ? 'Setoran' : 'Penarikan'}</p>
                                        <p className="text-[8px] text-muted-foreground font-mono">{format(parseISO(t.date), "dd/MM/yy HH:mm")}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        "text-[11px] font-bold",
                                        t.type === 'deposit' ? "text-green-700" : "text-red-700"
                                    )}>
                                        {t.type === 'deposit' ? '+' : '-'} Rp {t.amount.toLocaleString()}
                                    </p>
                                    <p className="text-[8px] text-muted-foreground truncate max-w-[100px]">{t.notes || '-'}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-muted-foreground italic text-[10px]">
                            Belum ada riwayat transaksi tabungan.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
