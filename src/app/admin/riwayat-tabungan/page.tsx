
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function RiwayatTabunganPage() {
    const firestore = useFirestore() as Firestore;
    const { toast } = useToast();

    // Filters matching the Tabungan page flow
    const [saverType, setSaverType] = useState<SaverType | "all">("all");
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedSaverId, setSelectedSaverId] = useState<string>("all");
    
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<SavingsTransaction | null>(null);

    // Data fetching for filters
    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || (saverType !== "student" && saverType !== "all")) return null;
        if (selectedClass !== "all") {
            return query(collection(firestore, "students"), where("kelas", "==", Number(selectedClass)));
        }
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

    // Fetch Transactions
    const savingsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "savingsTransactions"), orderBy("date", "desc"));
    }, [firestore]);
    const { data: savings, loading } = useCollection<SavingsTransaction>(savingsQuery);

    const filteredTransactions = useMemo(() => {
        if (!savings) return [];
        return savings.filter(t => {
            // Filter by Saver ID if selected
            const matchesSaver = selectedSaverId === "all" || t.saverId === selectedSaverId;
            
            // Filter by Saver Type if selected
            const matchesType = saverType === "all" || t.saverType === saverType;

            // Filter by Search Term (Name or Notes)
            const matchesSearch = t.saverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
            
            // Filter by Date
            let matchesDate = true;
            if (dateFilter) {
                const tDate = format(parseISO(t.date), "yyyy-MM-dd");
                matchesDate = tDate === dateFilter;
            }

            return matchesSaver && matchesType && matchesSearch && matchesDate;
        });
    }, [savings, saverType, selectedSaverId, searchTerm, dateFilter]);

    const stats = useMemo(() => {
        const totalIn = filteredTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
        const totalOut = filteredTransactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0);
        const netBalance = totalIn - totalOut;
        return { totalIn, totalOut, netBalance };
    }, [filteredTransactions]);

    const resetFilters = () => {
        setSaverType("all");
        setSelectedClass("all");
        setSelectedSaverId("all");
        setSearchTerm("");
        setDateFilter("");
    };

    const handleDeleteClick = (transaction: SavingsTransaction) => {
        setTransactionToDelete(transaction);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!firestore || !transactionToDelete) return;
        try {
            await deleteDoc(doc(firestore, 'savingsTransactions', transactionToDelete.id));
            toast({ title: "Berhasil Dihapus", description: "Catatan tabungan telah dihapus secara permanen." });
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
            'Nama Penabung': t.saverName,
            'Tipe': t.saverType,
            'Jenis': t.type === 'deposit' ? 'SETOR' : 'TARIK',
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
        doc.text(`Riwayat Tabungan Madrasah`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Total Setoran: Rp ${stats.totalIn.toLocaleString()}`, 14, 22);
        doc.text(`Total Penarikan: Rp ${stats.totalOut.toLocaleString()}`, 14, 27);
        doc.text(`Saldo Akhir (Filter): Rp ${stats.netBalance.toLocaleString()}`, 14, 32);

        (doc as any).autoTable({
            head: [['Tgl', 'Nama Penabung', 'Jenis', 'Nominal', 'Ket']],
            body: filteredTransactions.map(t => [
                format(parseISO(t.date), "dd/MM/yy"),
                t.saverName,
                t.type === 'deposit' ? 'SETOR' : 'TARIK',
                `Rp ${t.amount.toLocaleString()}`,
                t.notes || '-'
            ]),
            startY: 38,
            theme: 'grid',
            headStyles: { fillColor: [22, 101, 52] }
        });

        doc.save(`Riwayat_Tabungan.pdf`);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

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

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Riwayat Tabungan</title>
                    <style>
                        body { font-family: sans-serif; font-size: 10px; padding: 20px; }
                        h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
                        p { margin: 2px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Riwayat Tabungan Madrasah</h1>
                    <div style="margin-bottom: 15px; display: flex; gap: 20px;">
                        <p>Total Setoran: <strong>Rp ${stats.totalIn.toLocaleString()}</strong></p>
                        <p>Total Penarikan: <strong>Rp ${stats.totalOut.toLocaleString()}</strong></p>
                        <p>Saldo Akhir (Filter): <strong>Rp ${stats.netBalance.toLocaleString()}</strong></p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Tanggal</th>
                                <th>Nama Penabung</th>
                                <th>Jenis</th>
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
        printWindow.onload = () => { printWindow.print(); };
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-headline text-primary flex items-center gap-2">
                        <PiggyBank className="h-6 w-6" /> Riwayat Tabungan
                    </h1>
                    <p className="text-xs text-muted-foreground">Catatan mutasi simpanan seluruh penabung.</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-green-50 border-none shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-green-600">Total Setoran</p>
                            <p className="text-sm font-bold text-green-700">Rp {stats.totalIn.toLocaleString()}</p>
                        </div>
                        <ArrowUpCircle className="h-6 w-6 text-green-200" />
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-none shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-red-600">Total Penarikan</p>
                            <p className="text-sm font-bold text-red-700">Rp {stats.totalOut.toLocaleString()}</p>
                        </div>
                        <ArrowDownCircle className="h-6 w-6 text-red-200" />
                    </CardContent>
                </Card>
                <Card className="bg-primary/5 border-none shadow-sm border-l-4 border-l-primary">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-primary">Saldo Akhir (Filter)</p>
                            <p className="text-sm font-bold text-primary">Rp {stats.netBalance.toLocaleString()}</p>
                        </div>
                        <BadgeCheck className="h-6 w-6 text-primary/20" />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b bg-muted/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* 1. Saver Type */}
                        <div className="relative">
                            <Wallet className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                            <Select value={saverType} onValueChange={(v) => { setSaverType(v as SaverType | "all"); setSelectedSaverId("all"); }}>
                                <SelectTrigger className="pl-9 h-9 text-xs bg-white">
                                    <SelectValue placeholder="Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Kategori</SelectItem>
                                    <SelectItem value="student">Siswa</SelectItem>
                                    <SelectItem value="teacher">Guru</SelectItem>
                                    <SelectItem value="external">Luar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Class (if Student) */}
                        <div className={cn("relative transition-all", (saverType === 'student' || saverType === 'all') ? "opacity-100" : "opacity-30 pointer-events-none")}>
                            <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                            <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSaverId("all"); }}>
                                <SelectTrigger className="pl-9 h-9 text-xs bg-white">
                                    <SelectValue placeholder="Kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Kelas</SelectItem>
                                    {[...Array(7).keys()].map(i => (
                                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. Saver Name */}
                        <div className="relative">
                            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                            <Select value={selectedSaverId} onValueChange={setSelectedSaverId}>
                                <SelectTrigger className="pl-9 h-9 text-xs bg-white">
                                    <SelectValue placeholder="Pilih Nama" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Penabung</SelectItem>
                                    {saverType === 'student' && students?.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                    {saverType === 'teacher' && teachers?.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                    {saverType === 'external' && externalSavers?.sort((a,b) => a.name.localeCompare(b.name)).map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                    ))}
                                    {saverType === 'all' && (
                                        <>
                                            {students?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (S)</SelectItem>)}
                                            {teachers?.map(t => <SelectItem key={t.id} value={t.id}>{t.name} (G)</SelectItem>)}
                                            {externalSavers?.map(e => <SelectItem key={e.id} value={e.id}>{e.name} (L)</SelectItem>)}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 4. Date Filter */}
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input 
                                type="date" 
                                className="pl-9 h-9 text-xs bg-white"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>

                        {/* 5. Search & Reset */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input 
                                    placeholder="Cari catatan..." 
                                    className="pl-9 h-9 text-xs bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="ghost" size="xs" className="h-9 px-2 text-destructive hover:bg-destructive/10" onClick={resetFilters}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[140px] font-bold text-[10px] uppercase px-4">Waktu</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Nama Penabung</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-right">Nominal</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Jenis</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Catatan</TableHead>
                                    <TableHead className="text-right w-[50px] font-bold text-[10px] uppercase px-4">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
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
                                                {t.saverName}
                                                <span className="block text-[8px] text-muted-foreground font-normal uppercase tracking-tighter">
                                                    {t.saverType === 'student' ? 'Siswa' : t.saverType === 'teacher' ? 'Guru' : 'Umum'}
                                                </span>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-[11px] font-bold text-right",
                                                t.type === 'deposit' ? "text-green-600" : "text-red-600"
                                            )}>
                                                {t.type === 'deposit' ? '+' : '-'} Rp {t.amount.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold",
                                                    t.type === 'deposit' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {t.type === 'deposit' ? 'SETOR' : 'TARIK'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[11px] text-muted-foreground italic truncate max-w-[150px]">
                                                {t.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right px-4">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDeleteClick(t)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-xs">
                                            Tidak ada data transaksi tabungan yang sesuai filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/5 border-t py-2 flex justify-between">
                    <span className="text-[10px] text-muted-foreground">Menampilkan {filteredTransactions.length} data</span>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</span>
                </CardFooter>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Catatan Tabungan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus catatan ini secara permanen. Jika data ini dihapus, saldo penabung tidak akan kembali secara otomatis. Harap lakukan penyesuaian saldo jika diperlukan.
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
