'use client';

import { useEffect } from 'react';
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";

export default function Home() {
  const { profile, loading } = useSchoolProfile();

  useEffect(() => {
    if (profile?.namaMadrasah) {
      document.title = profile.namaMadrasah;
    }
  }, [profile]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          {loading ? (
             <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          ) : profile?.logoMadrasahUrl ? (
            <div className="mb-4">
              <Image 
                src={profile.logoMadrasahUrl} 
                alt="Logo Madrasah" 
                width={80} 
                height={80} 
                className="rounded-full object-contain"
              />
            </div>
          ) : (
            <div className="p-3 bg-primary rounded-full mb-4">
             <BookOpenCheck className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-headline font-bold text-primary">
            {loading ? "Memuat..." : profile?.namaMadrasah || "EduConnect"}
          </h1>
          <p className="text-muted-foreground mt-1">Sistem Informasi Sekolah Terpadu</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
