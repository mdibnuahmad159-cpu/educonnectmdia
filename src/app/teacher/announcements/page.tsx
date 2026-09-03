"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { Announcement } from "@/types";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    Calendar, 
    ExternalLink, 
    Megaphone,
    BellOff
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";

export default function TeacherAnnouncementsPage() {
    const firestore = useFirestore();

    const announcementsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, "announcements"),
            where("target", "in", ["Semua", "Guru"]),
            orderBy("createdAt", "desc")
        );
    }, [firestore]);

    const { data: announcements, loading } = useCollection<Announcement>(announcementsQuery);

    return (
        <div className="space-y-4 pb-10 max-w-2xl mx-auto">
            <div className="pt-2 space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/40"/>
                        <span className="text-xs font-medium uppercase tracking-widest">Memuat pengumuman...</span>
                    </div>
                ) : announcements && announcements.length > 0 ? (
                    announcements.map((item) => (
                        <Card key={item.id} className="border-none shadow-sm overflow-hidden rounded-[24px]">
                            {item.imageUrl && (
                                <div className="relative w-full aspect-video bg-muted/30">
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.title} 
                                        className="w-full h-full object-cover"
                                    />
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
                                            <ExternalLink className="h-4 w-4" /> Buka Tautan Terkait
                                        </a>
                                    </Button>
                                )}
                            </CardContent>
                            <CardFooter className="bg-muted/10 px-5 py-3 border-t">
                                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                    <Megaphone className="h-3 w-3" /> Info Madrasah
                                </div>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="py-24 text-center text-muted-foreground bg-muted/10 rounded-[32px] border-2 border-dashed">
                        <BellOff className="h-12 w-12 mx-auto mb-4 opacity-5" />
                        <p className="text-sm font-medium">Belum ada pengumuman terbaru.</p>
                        <p className="text-[10px] opacity-60">Informasi resmi dari Admin akan muncul di sini.</p>
                    </div>
                )}
            </div>
        </div>
    );
}