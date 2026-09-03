"use client";

import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { SchoolProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { updateSchoolProfile } from "@/lib/firebase-helpers";
import { ProfileForm } from "./components/profile-form";
import { Card, CardContent } from "@/components/ui/card";
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
        toast({ title: "Profil Diperbarui", description: "Data profil madrasah berhasil disimpan." });
    };

    if (loading) {
        return (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
    }
    
    if (error) {
        return (
          <Card className="border-destructive/20 bg-destructive/5 p-6 text-destructive flex items-center gap-3">
             <AlertTriangle className="h-6 w-6" />
             <div className="text-xs">
                <p className="font-bold">Gagal Memuat Data</p>
                <p>Terjadi kesalahan saat mengambil data profil. Silakan coba lagi.</p>
             </div>
          </Card>
        );
    }

    return (
        <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
                <ProfileForm profile={profile} onSave={handleSave} />
            </CardContent>
        </Card>
    );
}
