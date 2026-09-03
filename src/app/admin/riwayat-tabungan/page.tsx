"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, Firestore, orderBy, deleteDoc, doc, where } from "firebase/firestore";
import type { SavingsTransaction, Student, Teacher, ExternalSaver, SaverType } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Loader2, 
    PiggyBank, 
    Search,
    Trash2,
    Calendar,
    FileDown,
    Printer,
    FileSpreadsheet,
    FileText,
    ArrowUpCircle,
    ArrowDownCircle,
    User,
    Users,
    Wallet,
    X,
    BadgeCheck
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn, safePrint } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';

export default function RiwayatTabunganPage() {
    const firestore = useFirestore() as Firestore;
    const { toast } = useToast();

    const [saverType, setSaverType] = useState<SaverType | "all">("all");
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedSaverId, setSelectedSaverId] = useState<string>("all");
    
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<SavingsTransaction | null>(null);

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || (saverType !== "student" && saverType !== "all")) return null;
        if (selectedClass !== "all") return query(collection(firestore, "students"), where("kelas", "==", Number(selectedClass)));
        return collection(firestore, "students");
    }, [firestore, saverType, selectedClass]);
    const { data: students } = useCollection<Student>(studentsQuery);

    const teachersQuery = useMemoFirebase(() => {
        if (!firestore || (saverType !== "teacher" && saverType !== "all")) return null;
        return collection(firestore, "teachers");
    }, [firestore, saverType]);
    const { data: teachers } = useCollection<Teacher>(teachersQuery);

    const externalSaversQuery = useMemoFirebase(() => {
        if (!firestore || (saverType !== "external" && saverType !== "all")) return null;
        return collection(firestore, "externalSavers");
    }, [firestore, saverType]);
    const { data: externalSavers } = useCollection<ExternalSaver>(externalSaversQuery);

    const savingsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "savingsTransactions"), orderBy("date", "desc"));
    }, [firestore]);
    const { data: savings, loading } = useCollection<SavingsTransaction>(savingsQuery);

    const filteredTransactions = useMemo(() => {
        if (!savings) return [];
        return savings.filter(t => {
            const matchesSaver = selectedSaverId === "all" || t.saverId === selectedSaverId;
            const matchesType = saverType === "all" || t.saverType === saverType;
            const matchesSearch = t.saverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
            let matchesDate = true;
            if (dateFilter) matchesDate = format(parseISO(t.date), "yyyy-MM-dd") === dateFilter;
            return matchesSaver && matchesType && matchesSearch && matchesDate;
        });
    }, [savings, saverType, selectedSaverId, searchTerm, dateFilter]);

    const stats = useMemo(() => {
        const totalIn = filteredTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
        const totalOut = filteredTransactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0);
        return { totalIn, totalOut, netBalance: totalIn - totalOut };
    }, [filteredTransactions]);

    const handlePrint = () => {
        const rows = filteredTransactions.map((t, i) => `
            <tr>
                <td>${i+1}</td>
                <td>${format(parseISO(t.date), "dd/MM/yy HH:mm")}</td>
                <td>${t.saverName}</td>
                <td style="color: ${t.type === 'deposit' ? 'green' : 'red'}; font-weight: bold;">
                    ${t.type === 'deposit' ? 'SETOR' : 'TARIK'}
                </td>
                <td style="text-align: right;">Rp ${t.amount.toLocaleString()}</td>
                <td>${t.notes || '-'}</td>
            </tr>
        `).join('');

        const finalHtml = `
            <html>
                <head>
                    <title>Cetak Riwayat Tabungan</title>
                    <style>
                        body { font-family: sans-serif; font-size: 10px; padding: 20px; }
                        h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Riwayat Tabungan Madrasah</h1>
                    <p>Total Setoran: <strong>Rp ${stats.totalIn.toLocaleString()}</strong> | Penarikan: <strong>Rp ${stats.totalOut.toLocaleString()}</strong></p>
                    <table>
                        <thead>
                            <tr><th>No</th><th>Tanggal</th><th>Nama Penabung</th><th>Jenis</th><th>Nominal</th><th>Keterangan</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </body>
            </html>
        `;
        safePrint(finalHtml);
    };

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="p-4 flex flex-row flex-wrap items-center justify-between gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 max-w-sm">
                        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-8 text-xs bg-white/10 border-white/20 text-white focus:ring-white/30" />
                        <div className="relative">
                            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-white/50" />
                            <Input placeholder="Cari catatan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-white/30" />
                        </div>
                    </div>
                    <Button variant="secondary" size="xs" className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none" onClick={handlePrint}>
                        <Printer className="h-4 w-4" /> Cetak
                    </Button>
                </CardHeader>
            </Card>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 bg-green-50"><p className="text-[10px] uppercase font-bold text-green-600">Total Setoran</p><p className="text-sm font-bold">Rp {stats.totalIn.toLocaleString()}</p></Card>
                <Card className="p-4 bg-red-50"><p className="text-[10px] uppercase font-bold text-red-600">Total Penarikan</p><p className="text-sm font-bold">Rp {stats.totalOut.toLocaleString()}</p></Card>
                <Card className="p-4 bg-primary/5"><p className="text-[10px] uppercase font-bold text-primary">Saldo Akhir</p><p className="text-sm font-bold">Rp {stats.netBalance.toLocaleString()}</p></Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="px-4">Waktu</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead className="text-right">Nominal</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead className="text-right px-4">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow> : (
                                filteredTransactions.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell className="px-4 text-[11px]">{format(parseISO(t.date), "dd/MM/yy HH:mm")}</TableCell>
                                        <TableCell className="text-[11px] font-bold">{t.saverName}</TableCell>
                                        <TableCell className={cn("text-[11px] font-bold text-right", t.type === 'deposit' ? "text-green-600" : "text-red-600")}>
                                            Rp {t.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-[10px] uppercase font-bold">{t.type}</TableCell>
                                        <TableCell className="text-right px-4">
                                            <Button variant="ghost" size="icon" onClick={() => { setTransactionToDelete(t); setIsDeleteDialogOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Hapus Data?</AlertDialogTitle><AlertDialogDescription>Tindakan ini permanen.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={async () => {
                        if (!firestore || !transactionToDelete) return;
                        await deleteDoc(doc(firestore, 'savingsTransactions', transactionToDelete.id));
                        setIsDeleteDialogOpen(false);
                    }}>Hapus</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
