
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore } from "firebase/firestore";
import type { ExternalSaver } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, PlusCircle, Edit, Search, Phone, Fingerprint } from "lucide-react";
import { addExternalSaver, updateExternalSaver, deleteExternalSaver } from "@/lib/firebase-helpers";
import { SaverForm } from "./components/saver-form";

export default function ExternalSaversPage() {
    const firestore = useFirestore() as Firestore;
    const saversCollection = useMemoFirebase(() => firestore ? collection(firestore, "externalSavers") : null, [firestore]);
    const { data: savers, loading } = useCollection<ExternalSaver>(saversCollection);
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedSaver, setSelectedSaver] = useState<ExternalSaver | null>(null);
    const [saverToDelete, setSaverToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredSavers = useMemo(() => {
        if (!savers) return [];
        return savers.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.nip && s.nip.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.phoneNumber && s.phoneNumber.includes(searchTerm))
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [savers, searchTerm]);

    const handleAdd = () => {
        setSelectedSaver(null);
        setIsFormOpen(true);
    };

    const handleEdit = (saver: ExternalSaver) => {
        setSelectedSaver(saver);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        setSaverToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!firestore || !saverToDelete) return;
        deleteExternalSaver(firestore, saverToDelete);
        toast({ title: "Data Dihapus", description: "Penabung luar berhasil dihapus." });
        setIsDeleteDialogOpen(false);
        setSaverToDelete(null);
    };

    const handleSave = async (data: any) => {
        if (!firestore) return;
        try {
            if (selectedSaver) {
                await updateExternalSaver(firestore, selectedSaver.id, data);
                toast({ title: "Data Diperbarui", description: "Informasi penabung berhasil diperbarui." });
            } else {
                await addExternalSaver(firestore, data);
                toast({ title: "Penabung Ditambahkan", description: "Penabung luar baru berhasil didaftarkan." });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: e.message });
        }
    };

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-bold font-headline">Penabung Luar</CardTitle>
                            <CardDescription className="text-primary-foreground/70 text-xs">
                                Kelola data penabung non-internal. NIP & Password digunakan untuk akses portal.
                            </CardDescription>
                        </div>
                        <Button variant="secondary" size="sm" className="gap-2 font-bold shadow-md bg-white text-primary hover:bg-white/90 h-9" onClick={handleAdd}>
                            <PlusCircle className="h-4 w-4" />
                            Tambah Penabung
                        </Button>
                    </div>
                    <div className="relative mt-4 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-primary-foreground/50" />
                        <Input 
                            placeholder="Cari nama, NIP atau no. HP..." 
                            className="pl-9 h-9 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
            </Card>

            <div className="pt-2">
                <div className="overflow-x-auto border rounded-xl bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-[50px] px-4 font-bold text-[10px] uppercase">No.</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Nama</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">NIP (ID Login)</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Kontak</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Alamat</TableHead>
                                <TableHead className="text-right px-4 font-bold text-[10px] uppercase">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                            <span className="text-xs">Memuat data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredSavers.length > 0 ? (
                                filteredSavers.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                                    <TableCell className="px-4 text-[11px]">{index + 1}</TableCell>
                                    <TableCell className="text-[11px] font-bold uppercase">{item.name}</TableCell>
                                    <TableCell className="text-[11px]">
                                        <div className="flex items-center gap-1.5">
                                            <Fingerprint className="h-3 w-3 text-muted-foreground" />
                                            <code className="bg-muted px-1 rounded text-[10px] font-bold">{item.nip || 'BELUM ADA'}</code>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[11px]">
                                        {item.phoneNumber ? (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-3 w-3 opacity-50" />
                                                {item.phoneNumber}
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-[11px] truncate max-w-[150px]">{item.address || '-'}</TableCell>
                                    <TableCell className="text-right px-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                                                <Edit className="h-3.5 w-3.5 text-primary" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground italic">
                                        {searchTerm ? "Tidak ada hasil pencarian." : "Belum ada data penabung luar."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <SaverForm 
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                saver={selectedSaver}
                onSave={handleSave}
            />
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Data Penabung?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan menghapus data identitas penabung luar secara permanen. Pastikan saldo tabungan sudah dikosongkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white text-xs">Ya, Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

