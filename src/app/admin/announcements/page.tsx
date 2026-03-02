
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, Megaphone, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
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
    const { data: announcements, loading } = useCollection<Announcement>(announcementsQuery);
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
            case 'Guru': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-none">Guru</Badge>;
            case 'Wali Murid': return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-none">Wali Murid</Badge>;
            default: return <Badge variant="secondary" className="bg-green-100 text-green-800 border-none">Semua</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Pengumuman</CardTitle>
                            <CardDescription>
                                Kelola informasi dan berita untuk guru serta wali murid.
                            </CardDescription>
                        </div>
                        <Button size="xs" className="gap-1" onClick={handleAdd}>
                            <PlusCircle className="h-3.5 w-3.5" />
                            Buat Pengumuman
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Judul</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Media</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                            <span>Memuat pengumuman...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : announcements && announcements.length > 0 ? (
                                announcements.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="text-xs">
                                        {format(parseISO(item.createdAt), "d MMM yyyy", { locale: dfnsId })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-xs line-clamp-1">{item.title}</span>
                                            <span className="text-[10px] text-muted-foreground line-clamp-1">{item.content}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getTargetBadge(item.target)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {item.imageUrl && <ImageIcon className="h-3 w-3 text-muted-foreground" title="Ada gambar" />}
                                            {item.linkUrl && <LinkIcon className="h-3 w-3 text-muted-foreground" title="Ada tautan" />}
                                            {!item.imageUrl && !item.linkUrl && <span className="text-[10px] text-muted-foreground">-</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Belum ada pengumuman yang dibuat.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

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
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
