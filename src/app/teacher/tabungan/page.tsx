
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Teacher, SavingsTransaction } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    ArrowLeft, 
    Wallet, 
    PiggyBank, 
    History,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CalendarDays
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function TeacherTabunganPage() {
    const [nig, setNig] = useState<string | null>(null);
    const firestore = useFirestore();

    useEffect(() => {
        setNig(sessionStorage.getItem('teacherNig'));
    }, []);

    const teacherRef = useMemoFirebase(() => nig && firestore ? doc(firestore, "teachers", nig) : null, [firestore, nig]);
    const { data: teacher } = useDoc<Teacher>(teacherRef);

    // Fetch Savings Transactions for this teacher
    const savingsQuery = useMemoFirebase(() => {
        if (!firestore || !nig) return null;
        return query(
            collection(firestore, "savingsTransactions"), 
            where("saverId", "==", nig)
        );
    }, [firestore, nig]);
    const { data: rawSavings, loading: loadingSavings, error: savingsError } = useCollection<SavingsTransaction>(savingsQuery);

    // Sort savings by date descending
    const sortedTransactions = useMemo(() => {
        if (!rawSavings) return [];
        return [...rawSavings].sort((a, b) => b.date.localeCompare(a.date));
    }, [rawSavings]);

    // Calculate Balance
    const balance = useMemo(() => {
        if (!rawSavings) return 0;
        return rawSavings.reduce((acc, t) => t.type === 'deposit' ? acc + t.amount : acc - t.amount, 0);
    }, [rawSavings]);

    if (!nig || loadingSavings) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-10">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/teacher/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-headline font-bold text-primary">Tabungan Saya</h1>
            </div>

            {savingsError && (
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardContent className="p-3 text-[10px] text-destructive flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        Gagal memuat data tabungan. Silakan hubungi Bendahara.
                    </CardContent>
                </Card>
            )}

            {/* Savings Balance Overview */}
            <Card className="border-none shadow-md bg-primary text-primary-foreground overflow-hidden relative">
                <CardContent className="p-6 flex items-center justify-between relative z-10">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold opacity-80 tracking-widest">Saldo Tabungan Saat Ini</p>
                        <p className="text-3xl font-bold">Rp {balance.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-3 opacity-90">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs uppercase">
                                {teacher?.name?.charAt(0)}
                            </div>
                            <span className="text-xs font-medium">{teacher?.name}</span>
                        </div>
                    </div>
                    <div className="p-4 bg-white/10 rounded-full">
                        <PiggyBank className="h-8 w-8 text-white" />
                    </div>
                </CardContent>
                <div className="absolute -right-6 -bottom-6 opacity-10">
                    <Wallet className="h-32 w-32 rotate-12" />
                </div>
            </Card>

            {/* Transaction Statistics (Simple) */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="border-none shadow-sm bg-green-50">
                    <CardContent className="p-4 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Total Setoran</span>
                        </div>
                        <p className="text-sm font-bold text-green-700">
                            Rp {rawSavings?.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-red-50">
                    <CardContent className="p-4 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                            <TrendingDown className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Total Penarikan</span>
                        </div>
                        <p className="text-sm font-bold text-red-700">
                            Rp {rawSavings?.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History (Mutasi) */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-normal">
                        <History className="h-3.5 w-3.5" /> Riwayat Mutasi
                    </CardTitle>
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/30" />
                </CardHeader>
                <CardContent className="p-0">
                    {sortedTransactions.length > 0 ? (
                        <div className="divide-y">
                            {sortedTransactions.map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-full",
                                            t.type === 'deposit' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                        )}>
                                            {t.type === 'deposit' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold uppercase leading-tight">
                                                {t.type === 'deposit' ? 'Setoran' : 'Penarikan'}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                                                {format(parseISO(t.date), "dd MMM yyyy • HH:mm", { locale: dfnsId })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "text-sm font-bold",
                                            t.type === 'deposit' ? "text-green-700" : "text-red-700"
                                        )}>
                                            {t.type === 'deposit' ? '+' : '-'} Rp {t.amount.toLocaleString()}
                                        </p>
                                        {t.notes && (
                                            <p className="text-[9px] text-muted-foreground italic truncate max-w-[150px] ml-auto">
                                                {t.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center text-muted-foreground italic">
                            <History className="h-10 w-10 mx-auto mb-2 opacity-5" />
                            <p className="text-[10px]">Belum ada riwayat transaksi tabungan.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/5 border-t py-3">
                    <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                        * Data tabungan dikelola sepenuhnya oleh Bendahara Madrasah. Jika terdapat ketidaksesuaian, silakan hubungi bagian keuangan.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
