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
    <main className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-gradient-to-b from-[#004D40] to-[#002D20] p-4 overflow-hidden">
      <div className="w-full max-w-sm space-y-4 sm:space-y-6">
        {/* Header Section - More compact */}
        <div className="flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-top-4 duration-1000">
          {loading ? (
             <Loader2 className="w-10 h-10 animate-spin text-white/20 mb-2" />
          ) : profile?.logoMadrasahUrl ? (
            <div className="mb-3 p-3 bg-white/5 rounded-[28px] backdrop-blur-sm border border-white/10 shadow-2xl">
              <Image 
                src={profile.logoMadrasahUrl} 
                alt="Logo Madrasah" 
                width={60} 
                height={60} 
                className="object-contain"
              />
            </div>
          ) : (
            <div className="p-3 bg-white/10 rounded-full mb-3 border border-white/20 shadow-xl">
             <BookOpenCheck className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-headline font-bold text-white tracking-tight">
            Assalamu'alaikum
          </h1>
          <p className="text-white/60 mt-1 text-xs font-medium">
            Silakan masuk untuk mengakses sistem
          </p>
        </div>

        {/* Login Card Section */}
        <div className="animate-in fade-in zoom-in-95 duration-700 delay-200">
          <LoginForm />
        </div>

        {/* Global Footer - More compact */}
        <div className="text-center opacity-30">
          <p className="text-[9px] text-white uppercase tracking-[0.2em] font-bold leading-tight">
            {profile?.namaYayasan || "Yayasan Pendidikan Islam"}<br/>
            {profile?.namaMadrasah || "Madrasah Diniyah Ibnu Ahmad"}
          </p>
        </div>
      </div>
    </main>
  );
}
