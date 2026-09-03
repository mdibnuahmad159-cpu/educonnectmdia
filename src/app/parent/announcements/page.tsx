"use client";

import { useMemo, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { Announcement } from "@/types";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    Calendar, 
    ExternalLink, 
    Megaphone,
    BellOff,
    Maximize2,
    X
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ParentAnnouncementsPage() {
    const firestore = useFirestore();
    const [viewImage, setViewImage] = useState<string | null>(null);

    const announcementsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, "announcements"),
            orderBy("createdAt", "desc")
        );
    }, [firestore]);

    const { data: allAnnouncements, loading } = useCollection<Announcement>(announcementsQuery);

    const filteredAnnouncements = useMemo(() => {
        if (!allAnnouncements) return [];
        return allAnnouncements.filter(a => a.target === 'Semua' || a.target === 'Wali Murid');
    }, [allAnnouncements]);

    return (
        <div className="space-y-4 pb-10 max-w-2xl mx-auto">
            <div className="pt-2 space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/40"/>
                        <span className="text-xs font-medium uppercase tracking-widest">Memuat pengumuman...</span>
                    </div>
                ) : filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((item) => (
                        <Card key={item.id} className="border-none shadow-sm overflow-hidden rounded-[24px]">
                            {item.imageUrl && (
                                <div 
                                    className="relative w-full aspect-video bg-muted/30 cursor-pointer group"
                                    onClick={() => setViewImage(item.imageUrl!)}
                                >
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.title} 
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30">
                                            <Maximize2 className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <CardHeader className="p-5 pb-2">
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold mb-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {item.createdAt ? format(parseISO(item.createdAt), "d MMMM yyyy", { locale: dfnsId }) : '-'}
                                </div>
                                <h3 className="text-sm font-bold text-primary leading-snug uppercase tracking-tight">{item.title}</h3>
                            </CardHeader>
                            <CardContent className="p-5 pt-0">
                                <p className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                    {item.content}
                                </p>
                                {item.linkUrl && (
                                    <Button asChild variant="outline" size="sm" className="mt-4 w-full h-9 rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5 text-[11px] font-bold uppercase">
                                        <a href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" /> Buka Link Lampiran
                                        </a>
                                    </Button>
                                )}
                            </CardContent>
                            <CardFooter className="bg-muted/10 px-5 py-3 border-t">
                                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                    <Megaphone className="h-3 w-3" /> Informasi Wali Murid
                                </div>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="py-24 text-center text-muted-foreground bg-muted/10 rounded-[32px] border-2 border-dashed">
                        <BellOff className="h-12 w-12 mx-auto mb-4 opacity-5" />
                        <p className="text-sm font-medium">Belum ada pengumuman terbaru.</p>
                        <p className="text-[10px] opacity-60">Informasi dari Madrasah akan muncul di sini.</p>
                    </div>
                )}
            </div>

            {/* Modal Pratinjau Gambar */}
            <Dialog open={!!viewImage} onOpenChange={(open) => !open && setViewImage(null)}>
                <DialogContent className="max-w-[95vw] sm:max-w-3xl p-0 overflow-hidden bg-transparent border-none shadow-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Pratinjau Gambar</DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full h-full flex items-center justify-center">
                        <button 
                            onClick={() => setViewImage(null)}
                            className="absolute -top-12 right-0 sm:right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        {viewImage && (
                            <img 
                                src={viewImage} 
                                alt="Full Preview" 
                                className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}