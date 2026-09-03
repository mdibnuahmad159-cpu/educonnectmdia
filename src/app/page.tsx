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
    <main className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-b from-[#004D40] to-[#002D20] p-6 pt-16">
      <div className="w-full max-w-sm space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-top-4 duration-1000">
          {loading ? (
             <Loader2 className="w-12 h-12 animate-spin text-white/20 mb-4" />
          ) : profile?.logoMadrasahUrl ? (
            <div className="mb-6 p-4 bg-white/5 rounded-[32px] backdrop-blur-sm border border-white/10 shadow-2xl">
              <Image 
                src={profile.logoMadrasahUrl} 
                alt="Logo Madrasah" 
                width={80} 
                height={80} 
                className="object-contain"
              />
            </div>
          ) : (
            <div className="p-4 bg-white/10 rounded-full mb-6 border border-white/20 shadow-xl">
             <BookOpenCheck className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-headline font-bold text-white tracking-tight">
            Assalamu'alaikum
          </h1>
          <p className="text-white/60 mt-2 text-sm font-medium">
            Silakan masuk untuk mengakses sistem terpadu
          </p>
        </div>

        {/* Login Card Section */}
        <div className="animate-in fade-in zoom-in-95 duration-700 delay-200">
          <LoginForm />
        </div>

        {/* Global Footer */}
        <div className="text-center pt-4 opacity-40">
          <p className="text-[10px] text-white uppercase tracking-[0.2em] font-bold leading-relaxed">
            {profile?.namaYayasan || "Yayasan Pendidikan Islam"}<br/>
            {profile?.namaMadrasah || "Madrasah Diniyah Ibnu Ahmad"}
          </p>
        </div>
      </div>
    </main>
  );
}
