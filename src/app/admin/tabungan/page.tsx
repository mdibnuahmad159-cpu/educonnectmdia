
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, Firestore, orderBy } from "firebase/firestore";
import type { Student, Teacher, ExternalSaver, SavingsTransaction, SaverType } from "@/types";
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
    PiggyBank, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    History, 
    User,
    Users,
    Wallet,
    TrendingUp,
    CalendarDays,
    Clock,
    SearchX
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addSavingsTransaction } from "@/lib/firebase-helpers";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";

export default function TabunganPage() {
    const firestore = useFirestore() as Firestore;
    const { toast } = useToast();

    const [saverType, setSaverType] = useState<SaverType>("student");
    const [selectedClass, setSelectedClass] = useState<string>("0");
    const [selectedSaverId, setSelectedSaverId] = useState<string>("");
    
    // Default today's date
    const [transactionDate, setTransactionDate] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [isProcessing, setIsSaving] = useState(false);

    useEffect(() => {
        setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
    }, []);

    // Fetch Lists for Selectors
    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || saverType !== "student") return null;
        return query(collection(firestore, "students"), where("kelas", "==", Number(selectedClass)));
    }, [firestore, saverType, selectedClass]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);

    const teachersQuery = useMemoFirebase(() => {
        if (!firestore || saverType !== "teacher") return null;
        return collection(firestore, "teachers");
    }, [firestore, saverType]);
    const { data: teachers, loading: loadingTeachers } = useCollection<Teacher>(teachersQuery);

    const externalSaversQuery = useMemoFirebase(() => {
        if (!firestore || saverType !== "external") return null;
        return collection(firestore, "externalSavers");
    }, [firestore, saverType]);
    const { data: externalSavers, loading: loadingExternals } = useCollection<ExternalSaver>(externalSaversQuery);

    // Fetch ALL Transactions to calculate balance and show local history
    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "savingsTransactions"), orderBy("date", "desc"));
    }, [firestore]);
    const { data: allTransactions, loading: loadingTransactions } = useCollection<SavingsTransaction>(transactionsQuery);

    const selectedSaver = useMemo(() => {
        if (saverType === 'student') return students?.find(s => s.id === selectedSaverId);
        if (saverType === 'teacher') return teachers?.find(t => t.id === selectedSaverId);
        return externalSavers?.find(e => e.id === selectedSaverId);
    }, [saverType, selectedSaverId, students, teachers, externalSavers]);

    const saverBalance = useMemo(() => {
        if (!allTransactions || !selectedSaverId) return 0;
        return allTransactions
            .filter(t => t.saverId === selectedSaverId)
            .reduce((total, t) => t.type === 'deposit' ? total + t.amount : total - t.amount, 0);
    }, [allTransactions, selectedSaverId]);

    // History filtered by the selected date in the input
    const historyOnSelectedDate = useMemo(() => {
        if (!allTransactions || !transactionDate) return [];
        return allTransactions.filter(t => {
            const tDate = format(parseISO(t.date), 'yyyy-MM-dd');
            return tDate === transactionDate;
        });
    }, [allTransactions, transactionDate]);

    const handleTransaction = async (type: 'deposit' | 'withdraw') => {
        const val = Number(amount);
        if (!firestore || !selectedSaverId || isNaN(val) || val <= 0) {
            toast({ variant: "destructive", title: "Input Tidak Valid", description: "Harap masukkan jumlah nominal yang benar." });
            return;
        }

        if (type === 'withdraw' && val > saverBalance) {
            toast({ variant: "destructive", title: "Saldo Tidak Cukup", description: "Jumlah penarikan melebihi saldo yang tersedia." });
            return;
        }

        setIsSaving(true);
        try {
            // Construct ISO date with current time for correct chronological sorting
            const [y, m, d] = transactionDate.split('-').map(Number);
            const now = new Date();
            const dateObj = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
            const isoDate = dateObj.toISOString();

            await addSavingsTransaction(firestore, {
                saverId: selectedSaverId,
                saverName: selectedSaver?.name || "Unknown",
                saverType: saverType,
                type,
                amount: val,
                date: isoDate,
                notes: notes.trim()
            });
            toast({ title: "Transaksi Berhasil", description: `${type === 'deposit' ? 'Setoran' : 'Penarikan'} senilai Rp ${val.toLocaleString()} telah dicatat.` });
            setAmount("");
            setNotes("");
        } catch (error) {
            toast({ variant: "destructive", title: "Transaksi Gagal", description: "Terjadi kesalahan saat menghubungi database." });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoadingLists = loadingStudents || loadingTeachers || loadingExternals;

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-xl font-headline text-primary flex items-center gap-2">
                                <PiggyBank className="h-6 w-6" /> Tabungan Madrasah
                            </CardTitle>
                            <CardDescription className="text-xs">Kelola simpanan siswa, guru, dan penabung umum secara terpadu.</CardDescription>
                        </div>
                        <Link href="/admin/riwayat-tabungan">
                            <Button size="sm" variant="outline" className="gap-2 border-primary/30 text-primary h-9">
                                <History className="h-4 w-4" />
                                Riwayat Lengkap
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Wallet className="h-3 w-3" /> Kategori Penabung
                            </label>
                            <Select value={saverType} onValueChange={(v) => { setSaverType(v as SaverType); setSelectedSaverId(""); }}>
                                <SelectTrigger className="h-10 font-normal bg-muted/20">
                                    <SelectValue placeholder="Pilih Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Siswa Madrasah</SelectItem>
                                    <SelectItem value="teacher">Guru / Staf</SelectItem>
                                    <SelectItem value="external">Penabung Umum (Luar)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {saverType === 'student' && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                    <Users className="h-3 w-3" /> Pilih Kelas
                                </label>
                                <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSaverId(""); }}>
                                    <SelectTrigger className="h-10 font-normal bg-muted/20">
                                        <SelectValue placeholder="Kelas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[...Array(7).keys()].map(i => (
                                            <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <User className="h-3 w-3" /> Nama Penabung
                            </label>
                            <Select 
                                value={selectedSaverId} 
                                onValueChange={setSelectedSaverId}
                                disabled={isLoadingLists}
                            >
                                <SelectTrigger className="h-10 font-normal bg-muted/20">
                                    <SelectValue placeholder={isLoadingLists ? "Memuat data..." : "Pilih Nama"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {saverType === 'student' && students?.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.nis})</SelectItem>
                                    ))}
                                    {saverType === 'teacher' && teachers?.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                    {saverType === 'external' && externalSavers?.sort((a,b) => a.name.localeCompare(b.name)).map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {!selectedSaverId ? (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-muted/5 text-muted-foreground transition-all">
                            <PiggyBank className="h-16 w-16 mb-4 opacity-5" />
                            <p className="text-sm font-medium">Silakan tentukan penabung untuk memulai transaksi.</p>
                            <p className="text-[10px] mt-1 italic opacity-60">Pilih kategori, kelas, dan nama penabung pada kolom di atas.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border-none shadow-md bg-primary text-primary-foreground overflow-hidden">
                                    <CardContent className="p-6 flex items-center justify-between relative">
                                        <div className="space-y-1 relative z-10">
                                            <p className="text-[10px] uppercase font-bold opacity-80 tracking-widest">Saldo Tabungan Saat Ini</p>
                                            <p className="text-3xl font-bold">
                                                {loadingTransactions ? <Loader2 className="h-8 w-8 animate-spin" /> : `Rp ${saverBalance.toLocaleString()}`}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 opacity-90">
                                                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                                                    {selectedSaver?.name.charAt(0)}
                                                </div>
                                                <span className="text-xs font-medium truncate max-w-[200px]">{selectedSaver?.name}</span>
                                            </div>
                                        </div>
                                        <TrendingUp className="h-24 w-24 absolute -right-4 -bottom-4 opacity-10 rotate-12" />
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-sm bg-muted/10 border-l-4 border-l-primary">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                                <CalendarDays className="h-3 w-3" /> Tanggal Transaksi
                                            </label>
                                            <Input 
                                                type="date" 
                                                value={transactionDate}
                                                onChange={(e) => setTransactionDate(e.target.value)}
                                                className="h-10 text-xs font-normal bg-white border-primary/10"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nominal Transaksi (Rp)</label>
                                            <Input 
                                                type="number" 
                                                placeholder="0"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="h-11 font-mono text-lg font-bold bg-white text-primary border-primary/20"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Keterangan / Catatan</label>
                                            <Input 
                                                placeholder="Contoh: Setoran awal, tabungan qurban, dll"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="h-10 text-xs font-normal bg-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <Button 
                                                onClick={() => handleTransaction('deposit')} 
                                                disabled={isProcessing}
                                                className="bg-green-600 hover:bg-green-700 text-white gap-2 font-bold h-11 shadow-lg shadow-green-600/20"
                                            >
                                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-5 w-5" />}
                                                Setor Uang
                                            </Button>
                                            <Button 
                                                onClick={() => handleTransaction('withdraw')} 
                                                disabled={isProcessing || saverBalance <= 0}
                                                variant="destructive"
                                                className="gap-2 font-bold h-11 shadow-lg shadow-destructive/20"
                                            >
                                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-5 w-5" />}
                                                Tarik Uang
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* List of transactions for the SELECTED DATE */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="py-3 bg-muted/20 border-b">
                    <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <History className="h-3.5 w-3.5" /> Riwayat Transaksi Tanggal Terpilih
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold text-primary">
                        {transactionDate ? format(parseISO(transactionDate), "EEEE, d MMMM yyyy", { locale: dfnsId }) : "-"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingTransactions ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/30" /></div>
                    ) : historyOnSelectedDate.length > 0 ? (
                        <div className="divide-y">
                            {historyOnSelectedDate.map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-full",
                                            t.type === 'deposit' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                        )}>
                                            <Clock className="h-3 w-3" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold leading-tight">{t.saverName}</p>
                                            <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                                                {format(parseISO(t.date), "HH:mm")} • {t.saverType === 'student' ? 'Siswa' : t.saverType === 'teacher' ? 'Guru' : 'Umum'}
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
                        <div className="py-12 text-center text-muted-foreground/40 flex flex-col items-center">
                            <SearchX className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-[10px] italic">Tidak ada transaksi yang dicatat pada tanggal ini.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-none bg-muted/5 border-dashed">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <CalendarDays className="h-6 w-6" />
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                        <p className="font-bold text-primary mb-1 uppercase tracking-tight">Informasi Sinkronisasi</p>
                        <p>Setiap transaksi yang Anda input menggunakan pemilih tanggal di atas akan muncul di riwayat transaksi harian dan mutasi wali murid sesuai dengan tanggal yang Anda tentukan. Pastikan tanggal sudah benar sebelum menekan tombol setor atau tarik.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
