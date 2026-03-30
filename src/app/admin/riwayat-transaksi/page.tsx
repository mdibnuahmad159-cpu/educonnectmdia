
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, Firestore, orderBy, where, deleteDoc, doc } from "firebase/firestore";
import type { SavingsTransaction } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Loader2, 
    History, 
    Search,
    Trash2,
    Calendar,
    FileDown,
    Printer,
    FileSpreadsheet,
    FileText,
    ArrowUpCircle,
    ArrowDownCircle,
    Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
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
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function RiwayatTransaksiPage() {
    const firestore = useFirestore() as Firestore;
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

    // Fetch All Transactions
    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, "savingsTransactions"), orderBy("date", "desc"));
        
        if (dateFilter) {
            const start = startOfDay(parseISO(dateFilter)).toISOString();
            const end = endOfDay(parseISO(dateFilter)).toISOString();
            q = query(collection(firestore, "savingsTransactions"), 
                where("date", ">=", start), 
                where("date", "<=", end),
                orderBy("date", "desc")
            );
        }
        
        return q;
    }, [firestore, dateFilter]);
    const { data: transactions, loading } = useCollection<SavingsTransaction>(transactionsQuery);

    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        return transactions.filter(t => 
            t.saverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.saverType.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

    const stats = useMemo(() => {
        if (!filteredTransactions) return { totalDeposit: 0, totalWithdraw: 0 };
        const totalDeposit = filteredTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
        const totalWithdraw = filteredTransactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0);
        return { totalDeposit, totalWithdraw };
    }, [filteredTransactions]);

    const handleDeleteClick = (id: string) => {
        setTransactionToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!firestore || !transactionToDelete) return;
        try {
            await deleteDoc(doc(firestore, "savingsTransactions", transactionToDelete));
            toast({ title: "Berhasil Dihapus", description: "Catatan transaksi telah dihapus secara permanen." });
        } catch (error) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: "Kesalahan sistem saat menghapus data." });
        } finally {
            setIsDeleteDialogOpen(false);
            setTransactionToDelete(null);
        }
    };

    const handleExportExcel = () => {
        if (!filteredTransactions.length) return;
        const data = filteredTransactions.map((t, i) => ({
            'No': i + 1,
            'Tanggal': format(parseISO(t.date), "dd/MM/yyyy HH:mm"),
            'Nama Penabung': t.saverName || 'N/A',
            'Kategori': t.saverType === 'student' ? 'Siswa' : t.saverType === 'teacher' ? 'Guru' : 'Umum',
            'Tipe': t.type === 'deposit' ? 'SETOR' : 'TARIK',
            'Nominal': t.amount,
            'Keterangan': t.notes || '-'
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Tabungan");
        XLSX.writeFile(workbook, `Riwayat_Tabungan_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!filteredTransactions.length) return;
        const doc = new jsPDF();
        doc.text(`Riwayat Transaksi Tabungan`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Dicetak pada: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: dfnsId })}`, 14, 22);

        (doc as any).autoTable({
            head: [['Tgl', 'Nama', 'Kategori', 'Tipe', 'Nominal', 'Ket']],
            body: filteredTransactions.map(t => [
                format(parseISO(t.date), "dd/MM/yy"),
                t.saverName || '-',
                t.saverType,
                t.type === 'deposit' ? 'SETOR' : 'TARIK',
                `Rp ${t.amount.toLocaleString()}`,
                t.notes || '-'
            ]),
            startY: 28,
            theme: 'grid',
            styles: { fontSize: 8 }
        });

        doc.save(`Riwayat_Tabungan_${format(new Date(), "yyyyMMdd")}.pdf`);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const rows = filteredTransactions.map((t, i) => `
            <tr>
                <td>${i+1}</td>
                <td>${format(parseISO(t.date), "dd/MM/yy HH:mm")}</td>
                <td>${t.saverName || '-'}</td>
                <td>${t.saverType}</td>
                <td style="color: ${t.type === 'deposit' ? 'green' : 'red'}; font-weight: bold;">
                    ${t.type === 'deposit' ? 'SETOR' : 'TARIK'}
                </td>
                <td style="text-align: right;">Rp ${t.amount.toLocaleString()}</td>
                <td>${t.notes || '-'}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Riwayat Transaksi</title>
                    <style>
                        body { font-family: sans-serif; font-size: 10px; padding: 20px; }
                        h1 { text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Laporan Riwayat Transaksi Tabungan</h1>
                    <p>Periode: ${dateFilter ? format(parseISO(dateFilter), "dd MMMM yyyy", {locale: dfnsId}) : 'Semua Waktu'}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Tanggal</th>
                                <th>Nama Penabung</th>
                                <th>Kategori</th>
                                <th>Tipe</th>
                                <th>Nominal</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-headline text-primary flex items-center gap-2">
                        <History className="h-6 w-6" /> Riwayat Transaksi Tabungan
                    </h1>
                    <p className="text-xs text-muted-foreground">Log lengkap mutasi uang masuk dan keluar dari seluruh kategori penabung.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="xs" variant="outline" className="gap-1.5 border-primary/30 text-primary h-9">
                                <FileDown className="h-4 w-4" /> Ekspor
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
                                <FileText className="h-4 w-4 text-red-600" /> PDF (.pdf)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="xs" variant="outline" className="gap-1.5 border-primary/30 text-primary h-9" onClick={handlePrint}>
                        <Printer className="h-4 w-4" /> Cetak
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-green-50 border-none shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-green-600">Total Setoran (Masuk)</p>
                            <p className="text-lg font-bold text-green-700">Rp {stats.totalDeposit.toLocaleString()}</p>
                        </div>
                        <ArrowUpCircle className="h-8 w-8 text-green-200" />
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-none shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-red-600">Total Penarikan (Keluar)</p>
                            <p className="text-lg font-bold text-red-700">Rp {stats.totalWithdraw.toLocaleString()}</p>
                        </div>
                        <ArrowDownCircle className="h-8 w-8 text-red-200" />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b bg-muted/5">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Cari nama penabung atau catatan..." 
                                className="pl-9 h-9 text-xs bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input 
                                    type="date" 
                                    className="pl-9 h-9 text-xs bg-white w-[160px]"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>
                            {dateFilter && (
                                <Button variant="ghost" size="xs" className="h-9 px-2 text-destructive" onClick={() => setDateFilter("")}>
                                    Reset Filter
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[140px] font-bold text-[10px] uppercase px-4">Waktu</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Penabung</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Kategori</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Jenis</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-right">Nominal</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Ket</TableHead>
                                    <TableHead className="text-right w-[50px] font-bold text-[10px] uppercase px-4">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary/40" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((t) => (
                                        <TableRow key={t.id} className="hover:bg-muted/10 group">
                                            <TableCell className="text-[11px] font-mono px-4">
                                                {format(parseISO(t.date), "dd/MM/yy HH:mm")}
                                            </TableCell>
                                            <TableCell className="text-[11px] font-bold">
                                                {t.saverName || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-[10px] uppercase text-muted-foreground font-medium">
                                                {t.saverType === 'student' ? 'Siswa' : t.saverType === 'teacher' ? 'Guru' : 'Umum'}
                                            </TableCell>
                                            <TableCell>
                                                <div className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold",
                                                    t.type === 'deposit' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {t.type === 'deposit' ? 'SETOR' : 'TARIK'}
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-[11px] font-bold text-right",
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
                                                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDeleteClick(t.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic text-xs">
                                            Tidak ada riwayat transaksi ditemukan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/5 border-t py-2 flex justify-between">
                    <span className="text-[10px] text-muted-foreground">Menampilkan {filteredTransactions.length} baris data</span>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</span>
                </CardFooter>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Catatan Transaksi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus data dari riwayat secara permanen. Pastikan saldo penabung disesuaikan secara manual jika penghapusan ini mengubah saldo aktif mereka.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="text-xs">Batal</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDelete} 
                            className="bg-destructive hover:bg-destructive/90 text-white text-xs"
                        >
                            Hapus Permanen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
