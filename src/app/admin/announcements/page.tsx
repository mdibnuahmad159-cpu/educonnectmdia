
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore, query, orderBy } from "firebase/firestore";
import type { Announcement } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, Image as ImageIcon, AlertTriangle, ExternalLink, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { addAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/lib/firebase-helpers";
import { AnnouncementForm } from "./components/announcement-form";

export default function AnnouncementsPage() {
    const firestore = useFirestore() as Firestore;
    const announcementsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "announcements"), orderBy("createdAt", "desc"));
    }, [firestore]);
    const { data: announcements, loading, error } = useCollection<Announcement>(announcementsQuery);
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    const handleAdd = () => {
        setSelectedAnnouncement(null);
        setIsFormOpen(true);
    };

    const handleEdit = (announcement: Announcement) => {
        setSelectedAnnouncement(announcement);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        setIdToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!firestore || !idToDelete) return;
        deleteAnnouncement(firestore, idToDelete);
        toast({ title: "Pengumuman Dihapus", description: "Pengumuman berhasil dihapus." });
        setIsDeleteDialogOpen(false);
        setIdToDelete(null);
    };

    const handleSave = (data: Omit<Announcement, 'id' | 'createdAt'>) => {
        if (!firestore) return;
        if (selectedAnnouncement) {
            updateAnnouncement(firestore, selectedAnnouncement.id, data);
            toast({ title: "Pengumuman Diperbarui", description: "Perubahan berhasil disimpan." });
        } else {
            addAnnouncement(firestore, data);
            toast({ title: "Pengumuman Terkirim", description: "Pengumuman baru telah dipublikasikan." });
        }
    };

    const getTargetBadge = (target: Announcement['target']) => {
        switch (target) {
            case 'Guru': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-none text-[10px]">Guru</Badge>;
            case 'Wali Murid': return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-none text-[10px]">Wali Murid</Badge>;
            default: return <Badge variant="secondary" className="bg-green-100 text-green-800 border-none text-[10px]">Semua</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold font-headline text-primary">Pengumuman</h1>
                    <p className="text-xs text-muted-foreground">Kelola informasi dan berita untuk guru serta wali murid.</p>
                </div>
                <Button size="sm" className="gap-2" onClick={handleAdd}>
                    <PlusCircle className="h-4 w-4" />
                    Buat Pengumuman
                </Button>
            </div>

            {error && (
                <Card className="border-destructive bg-destructive/10">
                    <CardContent className="flex items-center gap-3 p-4 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <div className="text-xs">
                            <p className="font-bold">Gagal memuat pengumuman</p>
                            <p>{error.message}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                    <span className="text-sm">Memuat daftar pengumuman...</span>
                </div>
            ) : announcements && announcements.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
                    {announcements.map((item) => (
                        <Card key={item.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                            {item.imageUrl ? (
                                <div className="relative w-full bg-muted/50">
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.title} 
                                        className="w-full h-auto max-h-[400px] object-contain"
                                    />
                                    <div className="absolute top-2 left-2">
                                        {getTargetBadge(item.target)}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 flex items-start justify-between">
                                    {getTargetBadge(item.target)}
                                    <ImageIcon className="h-6 w-6 text-primary/20" />
                                </div>
                            )}
                            
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                                    <Calendar className="h-3 w-3" />
                                    {item.createdAt ? format(parseISO(item.createdAt), "d MMMM yyyy", { locale: dfnsId }) : '-'}
                                </div>
                                <CardTitle className="text-sm font-bold line-clamp-2">{item.title}</CardTitle>
                            </CardHeader>
                            
                            <CardContent className="p-4 pt-0 flex-1">
                                <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
                                    {item.content}
                                </p>
                                {item.linkUrl && (
                                    <a 
                                        href={item.linkUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-primary font-medium hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Tautan Terkait
                                    </a>
                                )}
                            </CardContent>
                            
                            <CardFooter className="p-3 border-t bg-muted/30 flex justify-end gap-2">
                                <Button variant="ghost" size="xs" className="h-8 w-8 p-0" onClick={() => handleEdit(item)}>
                                    <Edit className="h-3.5 w-3.5" />
                                    <span className="sr-only">Edit</span>
                                </Button>
                                <Button variant="ghost" size="xs" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="sr-only">Hapus</span>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                    <p className="text-sm">Belum ada pengumuman yang dibuat.</p>
                    <Button variant="link" size="sm" onClick={handleAdd}>Buat sekarang</Button>
                </div>
            )}

            <AnnouncementForm 
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                announcement={selectedAnnouncement}
                onSave={handleSave}
            />
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Pengumuman?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan menghapus pengumuman secara permanen. Pengguna tidak akan dapat melihatnya lagi.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white">Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
