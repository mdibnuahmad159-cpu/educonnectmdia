
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, Firestore, orderBy } from "firebase/firestore";
import type { Student, Teacher, ExternalSaver, SavingsTransaction, SaverType } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
    Search,
    User,
    Users,
    Wallet,
    AlertCircle,
    CheckCircle2,
    Trash2,
    CalendarDays
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addSavingsTransaction, deleteSavingsTransaction } from "@/lib/firebase-helpers";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TabunganPage() {
    const firestore = useFirestore() as Firestore;
    const { toast } = useToast();

    const [saverType, setSaverType] = useState<SaverType>("student");
    const [selectedClass, setSelectedClass] = useState<string>("0");
    const [selectedSaverId, setSelectedSaverId] = useState<string>("");
    
    const [amount, setAmount] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [isProcessing, setIsSaving] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

    // Fetch Lists
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

    // Transaction History for Selected Saver
    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore || !selectedSaverId) return null;
        return query(
            collection(firestore, "savingsTransactions"), 
            where("saverId", "==", selectedSaverId),
            orderBy("date", "desc")
        );
    }, [firestore, selectedSaverId]);
    const { data: transactions, loading: loadingTransactions } = useCollection<SavingsTransaction>(transactionsQuery);

    const selectedSaver = useMemo(() => {
        if (saverType === 'student') return students?.find(s => s.id === selectedSaverId);
        if (saverType === 'teacher') return teachers?.find(t => t.id === selectedSaverId);
        return externalSavers?.find(e => e.id === selectedSaverId);
    }, [saverType, selectedSaverId, students, teachers, externalSavers]);

    const balance = useMemo(() => {
        if (!transactions) return 0;
        return transactions.reduce((total, t) => {
            return t.type === 'deposit' ? total + t.amount : total - t.amount;
        }, 0);
    }, [transactions]);

    const handleTransaction = async (type: 'deposit' | 'withdraw') => {
        const val = Number(amount);
        if (!firestore || !selectedSaverId || isNaN(val) || val <= 0) {
            toast({ variant: "destructive", title: "Input Tidak Valid", description: "Harap masukkan jumlah nominal yang benar." });
            return;
        }

        if (type === 'withdraw' && val > balance) {
            toast({ variant: "destructive", title: "Saldo Tidak Cukup", description: "Jumlah penarikan melebihi saldo yang tersedia." });
            return;
        }

        setIsSaving(true);
        try {
            await addSavingsTransaction(firestore, {
                saverId: selectedSaverId,
                saverType: saverType,
                type,
                amount: val,
                date: new Date().toISOString(),
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

    const handleDeleteClick = (id: string) => {
        setTransactionToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!firestore || !transactionToDelete) return;
        try {
            await deleteSavingsTransaction(firestore, transactionToDelete);
            toast({ title: "Transaksi Dihapus", description: "Catatan transaksi telah berhasil dihapus secara permanen." });
        } catch (error) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: "Kesalahan saat menghapus data." });
        } finally {
            setIsDeleteDialogOpen(false);
            setTransactionToDelete(null);
        }
    };

    const isLoadingLists = loadingStudents || loadingTeachers || loadingExternals;

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-1 border-none shadow-sm h-fit">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-headline text-primary flex items-center gap-2 font-normal">
                            <PiggyBank className="h-5 w-5" /> Tabungan
                        </CardTitle>
                        <CardDescription className="text-[10px]">Pilih penabung dan lakukan transaksi setor/tarik.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Wallet className="h-3 w-3" /> Kategori Penabung
                            </label>
                            <Select value={saverType} onValueChange={(v) => { setSaverType(v as SaverType); setSelectedSaverId(""); }}>
                                <SelectTrigger className="h-9 font-normal">
                                    <SelectValue placeholder="Pilih Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Siswa</SelectItem>
                                    <SelectItem value="teacher">Guru</SelectItem>
                                    <SelectItem value="external">Penabung Luar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {saverType === 'student' && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 ml-1">
                                    <Users className="h-3 w-3" /> Pilih Kelas
                                </label>
                                <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSaverId(""); }}>
                                    <SelectTrigger className="h-9 font-normal">
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
                                <SelectTrigger className="h-9 font-normal">
                                    <SelectValue placeholder={isLoadingLists ? "Memuat..." : "Pilih Nama"} />
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

                        {selectedSaver && (
                            <div className="pt-4 border-t space-y-4 animate-in fade-in duration-300">
                                <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/10">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Saldo Saat Ini</p>
                                    <p className="text-xl font-bold text-primary">Rp {balance.toLocaleString()}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground">Jumlah (Rp)</label>
                                        <Input 
                                            type="number" 
                                            placeholder="0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="h-9 font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground">Catatan (Opsional)</label>
                                        <Input 
                                            placeholder="Keterangan..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="h-9 text-xs font-normal"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <Button 
                                            onClick={() => handleTransaction('deposit')} 
                                            disabled={isProcessing}
                                            className="bg-green-600 hover:bg-green-700 text-white gap-1.5 font-normal h-10"
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
                                            Setor
                                        </Button>
                                        <Button 
                                            onClick={() => handleTransaction('withdraw')} 
                                            disabled={isProcessing || balance <= 0}
                                            variant="destructive"
                                            className="gap-1.5 font-normal h-10"
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
                                            Tarik
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            Riwayat Transaksi {selectedSaver ? `- ${selectedSaver.name}` : ''}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {!selectedSaverId ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-30">
                                <Search className="h-12 w-12 mb-2" />
                                <p className="text-xs">Pilih penabung untuk melihat riwayat.</p>
                            </div>
                        ) : loadingTransactions ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                            </div>
                        ) : transactions && transactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="w-[120px] font-normal text-[10px] uppercase">Tanggal</TableHead>
                                            <TableHead className="font-normal text-[10px] uppercase">Tipe</TableHead>
                                            <TableHead className="font-normal text-[10px] uppercase">Nominal</TableHead>
                                            <TableHead className="font-normal text-[10px] uppercase">Catatan</TableHead>
                                            <TableHead className="text-right w-[50px] font-normal text-[10px] uppercase px-4">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((t) => (
                                            <TableRow key={t.id} className="hover:bg-muted/10">
                                                <TableCell className="text-[11px] font-mono whitespace-nowrap">
                                                    {format(parseISO(t.date), "dd/MM/yyyy HH:mm")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        t.type === 'deposit' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                    )}>
                                                        {t.type === 'deposit' ? 'SETOR' : 'TARIK'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={cn(
                                                    "text-[11px] font-bold font-mono whitespace-nowrap",
                                                    t.type === 'deposit' ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {t.type === 'deposit' ? '+' : '-'} Rp {t.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-[11px] text-muted-foreground italic truncate max-w-[150px]">
                                                    {t.notes || '-'}
                                                </TableCell>
                                                <TableCell className="text-right px-4">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteClick(t.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground italic">
                                <AlertCircle className="h-10 w-10 mb-2 opacity-10" />
                                <p className="text-xs">Belum ada riwayat transaksi untuk penabung ini.</p>
                            </div>
                        )}
                    </CardContent>
                    {selectedSaverId && (
                        <CardFooter className="bg-muted/5 border-t py-3 flex justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-[10px] text-muted-foreground">Sinkronisasi saldo otomatis</span>
                            </div>
                            <span className="text-[10px] text-primary font-bold">Total {transactions?.length || 0} Transaksi</span>
                        </CardFooter>
                    )}
                </Card>
            </div>

            <Card className="border-primary/10 shadow-none bg-muted/5">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                        <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">Kebijakan Transaksi Tabungan</p>
                        <p>Setiap transaksi setoran dan penarikan tercatat secara permanen dengan stempel waktu otomatis. Penghapusan data transaksi hanya diizinkan bagi Administrator untuk koreksi kesalahan input.</p>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Catatan Transaksi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus catatan transaksi secara permanen dari database. Saldo penabung akan disesuaikan secara otomatis setelah data dihapus.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="text-xs">Batal</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDelete} 
                            className="bg-destructive hover:bg-destructive/90 text-white text-xs"
                        >
                            Ya, Hapus Transaksi
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
