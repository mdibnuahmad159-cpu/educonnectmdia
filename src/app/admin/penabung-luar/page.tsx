
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
import { Trash2, Loader2, PlusCircle, Edit, Search, Phone } from "lucide-react";
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

    const handleSave = (data: any) => {
        if (!firestore) return;
        if (selectedSaver) {
            updateExternalSaver(firestore, selectedSaver.id, data);
            toast({ title: "Data Diperbarui", description: "Informasi penabung berhasil diperbarui." });
        } else {
            addExternalSaver(firestore, data);
            toast({ title: "Penabung Ditambahkan", description: "Penabung luar baru berhasil didaftarkan." });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-headline text-primary">Penabung Luar</h1>
                    <p className="text-xs text-muted-foreground">Kelola data penabung dari luar (bukan siswa/guru).</p>
                </div>
                <Button size="sm" className="gap-2" onClick={handleAdd}>
                    <PlusCircle className="h-4 w-4" />
                    Tambah Penabung
                </Button>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader className="pb-3 px-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Cari nama atau no. HP..." 
                            className="pl-9 h-9 text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-[50px] px-4 font-normal">No.</TableHead>
                                <TableHead className="font-normal">Nama</TableHead>
                                <TableHead className="font-normal">Kontak</TableHead>
                                <TableHead className="font-normal">Alamat</TableHead>
                                <TableHead className="font-normal">Keterangan</TableHead>
                                <TableHead className="text-right px-4 font-normal">Aksi</TableHead>
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
                                <TableRow key={item.id} className="hover:bg-muted/10">
                                    <TableCell className="px-4 text-[11px]">{index + 1}</TableCell>
                                    <TableCell className="text-[11px] font-medium">{item.name}</TableCell>
                                    <TableCell className="text-[11px]">
                                        {item.phoneNumber ? (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-3 w-3 opacity-50" />
                                                {item.phoneNumber}
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-[11px] truncate max-w-[150px]">{item.address || '-'}</TableCell>
                                    <TableCell className="text-[11px] italic text-muted-foreground">{item.notes || '-'}</TableCell>
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
                </CardContent>
            </Card>

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
