
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, Firestore, orderBy, deleteDoc, doc } from "firebase/firestore";
import type { SPPPayment } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Loader2, 
    ReceiptText, 
    Search,
    Trash2,
    Calendar,
    FileDown,
    Printer,
    FileSpreadsheet,
    FileText,
    BadgeCheck,
    User,
    Users
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

const MONTH_NAMES = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function RiwayatSPPPage() {
    const firestore = useFirestore() as Firestore;
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [nameFilter, setNameFilter] = useState<string>("all");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<SPPPayment | null>(null);

    const sppQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "sppPayments"), orderBy("paymentDate", "desc"));
    }, [firestore]);
    const { data: payments, loading } = useCollection<SPPPayment>(sppQuery);

    const uniqueNames = useMemo(() => {
        const names = new Set<string>();
        if (payments) {
            payments.forEach(p => {
                if (p.studentName) names.add(p.studentName);
            });
        }
        return Array.from(names).sort();
    }, [payments]);

    const filteredPayments = useMemo(() => {
        if (!payments) return [];
        return payments.filter(p => {
            const matchesSearch = (p.studentName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                                 (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesName = nameFilter === "all" || p.studentName === nameFilter;
            
            let matchesDate = true;
            if (dateFilter) {
                const pDate = format(parseISO(p.paymentDate), "yyyy-MM-dd");
                matchesDate = pDate === dateFilter;
            }

            return matchesSearch && matchesName && matchesDate;
        });
    }, [payments, searchTerm, nameFilter, dateFilter]);

    const totalIncome = useMemo(() => {
        return filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    }, [filteredPayments]);

    const handleDeleteClick = (payment: SPPPayment) => {
        setPaymentToDelete(payment);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!firestore || !paymentToDelete) return;
        try {
            await deleteDoc(doc(firestore, 'sppPayments', paymentToDelete.id));
            toast({ title: "Berhasil Dihapus", description: "Catatan pembayaran SPP telah dihapus." });
        } catch (error) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: "Kesalahan sistem saat menghapus data." });
        } finally {
            setIsDeleteDialogOpen(false);
            setPaymentToDelete(null);
        }
    };

    const handleExportExcel = () => {
        if (!filteredPayments.length) return;
        const data = filteredPayments.map((p, i) => ({
            'No': i + 1,
            'Tanggal Bayar': format(parseISO(p.paymentDate), "dd/MM/yyyy"),
            'Nama Siswa': p.studentName,
            'Kelas': p.classId,
            'Bulan': `${MONTH_NAMES[p.month]} ${p.year}`,
            'Nominal': p.amountPaid,
            'Catatan': p.notes || '-'
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat SPP");
        XLSX.writeFile(workbook, `Riwayat_SPP_${nameFilter === 'all' ? 'Semua' : nameFilter.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!filteredPayments.length) return;
        const doc = new jsPDF();
        doc.text(`Riwayat Pembayaran SPP Siswa`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Nama: ${nameFilter === 'all' ? 'Semua Siswa' : nameFilter}`, 14, 22);
        doc.text(`Total Penerimaan: Rp ${totalIncome.toLocaleString()}`, 14, 27);

        (doc as any).autoTable({
            head: [['Tgl Bayar', 'Nama Siswa', 'Bulan/TA', 'Nominal', 'Ket']],
            body: filteredPayments.map(p => [
                format(parseISO(p.paymentDate), "dd/MM/yy"),
                p.studentName,
                `${MONTH_NAMES[p.month].substring(0,3)} ${p.year}`,
                `Rp ${p.amountPaid.toLocaleString()}`,
                p.notes || '-'
            ]),
            startY: 33,
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138] }
        });

        doc.save(`Riwayat_SPP_${nameFilter}.pdf`);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const rows = filteredPayments.map((p, i) => `
            <tr>
                <td>${i+1}</td>
                <td>${format(parseISO(p.paymentDate), "dd/MM/yyyy")}</td>
                <td>${p.studentName}</td>
                <td>Kelas ${p.classId}</td>
                <td>${MONTH_NAMES[p.month]} ${p.year}</td>
                <td style="text-align: right;">Rp ${p.amountPaid.toLocaleString()}</td>
                <td>${p.notes || '-'}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Riwayat SPP</title>
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
                    <h1>Riwayat Pembayaran SPP Madrasah</h1>
                    <p>Nama: ${nameFilter === 'all' ? 'Semua Siswa' : nameFilter}</p>
                    <p>Total Penerimaan: <strong>Rp ${totalIncome.toLocaleString()}</strong></p>
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Tanggal Bayar</th>
                                <th>Nama Siswa</th>
                                <th>Kelas</th>
                                <th>Bulan SPP</th>
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
                        <ReceiptText className="h-6 w-6" /> Riwayat SPP
                    </h1>
                    <p className="text-xs text-muted-foreground">Catatan pelunasan iuran bulanan seluruh siswa.</p>
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

            <Card className="bg-blue-50 border-none shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-blue-600">Total Penerimaan (Filter)</p>
                        <p className="text-lg font-bold text-blue-700">Rp {totalIncome.toLocaleString()}</p>
                    </div>
                    <BadgeCheck className="h-8 w-8 text-blue-200" />
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b bg-muted/5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Cari nama siswa atau catatan..." 
                                className="pl-9 h-9 text-xs bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="relative">
                            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Select value={nameFilter} onValueChange={setNameFilter}>
                                <SelectTrigger className="pl-9 h-9 text-xs bg-white">
                                    <SelectValue placeholder="Pilih Nama Siswa" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Siswa</SelectItem>
                                    {uniqueNames.map(name => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input 
                                    type="date" 
                                    className="pl-9 h-9 text-xs bg-white"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>
                            {(dateFilter || nameFilter !== "all" || searchTerm) && (
                                <Button variant="ghost" size="xs" className="h-9 px-2 text-destructive" 
                                    onClick={() => { setDateFilter(""); setNameFilter("all"); setSearchTerm(""); }}
                                >
                                    Reset
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
                                    <TableHead className="w-[120px] font-bold text-[10px] uppercase px-4">Tgl Bayar</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Nama Siswa</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Bulan SPP</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-right">Nominal</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Keterangan</TableHead>
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
                                ) : filteredPayments.length > 0 ? (
                                    filteredPayments.map((p) => (
                                        <TableRow key={p.id} className="hover:bg-muted/10 group">
                                            <TableCell className="text-[11px] font-mono px-4">
                                                {format(parseISO(p.paymentDate), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell className="text-[11px] font-bold">
                                                {p.studentName}
                                                <span className="block text-[9px] text-muted-foreground font-normal">Kelas ${p.classId}</span>
                                            </TableCell>
                                            <TableCell className="text-[11px]">
                                                {MONTH_NAMES[p.month]} ${p.year}
                                            </TableCell>
                                            <TableCell className="text-[11px] font-bold text-right text-blue-700">
                                                Rp {p.amountPaid.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-[11px] text-muted-foreground italic truncate max-w-[150px]">
                                                {p.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right px-4">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDeleteClick(p)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-xs">
                                            Tidak ada data pembayaran SPP.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/5 border-t py-2 flex justify-between">
                    <span className="text-[10px] text-muted-foreground">Menampilkan {filteredPayments.length} data</span>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</span>
                </CardFooter>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Catatan SPP?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus catatan pembayaran SPP ini secara permanen. Status pembayaran siswa untuk bulan tersebut akan kembali menjadi "Belum Bayar".
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
