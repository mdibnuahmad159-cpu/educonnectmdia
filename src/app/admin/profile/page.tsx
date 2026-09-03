"use client";

import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { SchoolProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { updateSchoolProfile } from "@/lib/firebase-helpers";
import { ProfileForm } from "./components/profile-form";
import { Loader2, AlertTriangle } from "lucide-react";

export default function ProfilePage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const profileRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, "schoolProfile", "main");
    }, [firestore]);

    const { data: profile, loading, error } = useDoc<SchoolProfile>(profileRef);

    const handleSave = (profileData: Partial<Omit<SchoolProfile, 'id'>>) => {
        if (!firestore) return;
        updateSchoolProfile(firestore, profileData);
        toast({ 
            title: "Profil Diperbarui", 
            description: "Informasi identitas madrasah telah berhasil disimpan.",
        });
    };

    if (loading) {
        return (
          <div className="flex h-[70vh] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Sinkronisasi Data...</span>
            </div>
          </div>
        );
    }
    
    if (error) {
        return (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-4 bg-destructive/5 rounded-[32px] border border-destructive/20 mt-10">
             <div className="p-4 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-8 w-8 text-destructive" />
             </div>
             <div className="space-y-1">
                <p className="font-bold text-destructive">Gagal Memuat Profil</p>
                <p className="text-xs text-muted-foreground">Terjadi kendala saat menghubungi basis data. Harap muat ulang halaman.</p>
             </div>
          </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
            <ProfileForm profile={profile} onSave={handleSave} />
        </div>
    );
}
