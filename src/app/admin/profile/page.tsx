"use client";

import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { SchoolProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { updateSchoolProfile } from "@/lib/firebase-helpers";
import { ProfileForm } from "./components/profile-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive" />
                Gagal Memuat Data
              </CardTitle>
              <CardDescription>
                Terjadi kesalahan saat mengambil data profil. Silakan coba lagi.
              </CardDescription>
            </CardHeader>
          </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profil Madrasah</CardTitle>
                <CardDescription>
                    Kelola informasi umum, visi, misi, dan logo madrasah Anda.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ProfileForm profile={profile} onSave={handleSave} />
            </CardContent>
        </Card>
    );
}