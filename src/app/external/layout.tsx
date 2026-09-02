
"use client";

import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { ExternalBottomNav } from "./components/external-bottom-nav";
import { BookOpenCheck, Loader2, Calendar } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { useAcademicYear } from "@/context/academic-year-provider";

export default function ExternalLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { profile, loading: isProfileLoading } = useSchoolProfile();
  const { activeYear } = useAcademicYear();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isUserLoading || !isClient) return;
    
    const externalNip = sessionStorage.getItem('externalNip');

    if (!user || !externalNip) {
      router.push('/');
      return;
    }

    if (user.email === 'mdibnuahmad159@gmail.com') {
      router.push('/admin/dashboard');
      return;
    }

  }, [user, isUserLoading, router, isClient]);

  if (isUserLoading || !user || !isClient || !user.isAnonymous || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 bg-primary px-3 shadow-md text-primary-foreground">
        <div className="flex items-center gap-2">
            {profile?.logoMadrasahUrl ? (
                <Image src={profile.logoMadrasahUrl} alt="Logo" width={24} height={24} className="h-6 w-6 object-contain brightness-0 invert"/>
            ) : (
                <BookOpenCheck className="h-5 w-5 text-white" />
            )}
            <h1 className="text-sm font-bold font-headline tracking-tight text-white">
                {profile?.namaMadrasah || 'EduConnect'}
            </h1>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-white">
            <Calendar className="h-3 w-3 opacity-80" />
            <span>{activeYear}</span>
        </div>
      </header>
      <main className="flex-1 p-3 pb-24 sm:px-6">
          {children}
      </main>
      <ExternalBottomNav />
    </div>
  );
}
