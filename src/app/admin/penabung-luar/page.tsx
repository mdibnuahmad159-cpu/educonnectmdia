"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore } from "firebase/firestore";
import type { ExternalSaver } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, PlusCircle, Edit, Search, WalletCards, MapPin, Fingerprint } from "lucide-react";
import { addExternalSaver, updateExternalSaver, deleteExternalSaver } from "@/lib/firebase-helpers";
import { SaverForm } from "./components/saver-form";

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.87 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

function formatWaLink(phone?: string) {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, "");
    const final = cleaned.startsWith("0") ? "62" + cleaned.slice(1) : cleaned;
    return `https://wa.me/${final}`;
}

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
            setIsFormOpen(false);
            setSelectedSaver(null);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: e.message });
        }
    };

    return (
        <div className="space-y-4">
            <Card className="sticky top-[106px] z-20 border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-primary-foreground/50" />
                        <Input 
                            placeholder="Cari nama atau NIP penabung..." 
                            className="pl-9 h-9 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="secondary" size="xs" className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none" onClick={handleAdd}>
                        <PlusCircle className="h-4 w-4" />
                        Tambah Penabung
                    </Button>
                </CardHeader>
            </Card>

            <div className="pt-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/40"/>
                        <span className="text-xs font-medium uppercase tracking-widest">Memuat data penabung...</span>
                    </div>
                ) : filteredSavers.length > 0 ? (
                    <div className="space-y-3">
                        {filteredSavers.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-card border shadow-sm hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10 border-2 border-primary/5 group-hover:border-primary/20 transition-all">
                                        <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">{item.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-bold leading-tight uppercase text-foreground group-hover:text-primary transition-colors truncate">{item.name}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 rounded">
                                                <Fingerprint className="h-3 w-3 opacity-50" />
                                                <span>NIP: {item.nip}</span>
                                            </div>
                                            {item.address && (
                                                <>
                                                    <span className="text-[10px] text-muted-foreground">•</span>
                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                        <MapPin className="h-2.5 w-2.5 opacity-50" />
                                                        <span className="truncate">{item.address}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                    {item.phoneNumber && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-green-600 hover:bg-green-50" 
                                            asChild
                                        >
                                            <a href={formatWaLink(item.phoneNumber)!} target="_blank" rel="noopener noreferrer">
                                                <WhatsAppIcon />
                                            </a>
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(item)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">
                        <WalletCards className="h-10 w-10 mx-auto mb-3 opacity-10" />
                        <p className="text-sm font-medium">
                            {searchTerm ? "Tidak ada hasil pencarian." : "Belum ada data penabung luar."}
                        </p>
                    </div>
                )}
            </div>

            <SaverForm 
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                saver={selectedSaver}
                onSave={handleSave}
            />
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[28px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm font-bold uppercase tracking-tight">Hapus Data Penabung?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                        Tindakan ini akan menghapus data identitas penabung luar secara permanen. Pastikan saldo tabungan sudah dikosongkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full h-9 text-xs">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white rounded-full h-9 text-xs">Ya, Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
