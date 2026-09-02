
"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/firebase";
import { BottomNav } from "./components/bottom-nav";
import { Loader2, School } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { AcademicYearSelector } from "@/components/shared/academic-year-selector";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { profile, loading: isProfileLoading } = useSchoolProfile();
  const router = useRouter();

  useEffect(() => {
    if (profile?.namaMadrasah) {
      document.title = profile.namaMadrasah;
    }
  }, [profile]);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.push('/');
      } 
      else if (user.email !== 'mdibnuahmad159@gmail.com') {
        router.push('/');
      }
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || user.email !== 'mdibnuahmad159@gmail.com' || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b bg-card px-4 shadow-sm">
        {/* Left: Academic Year Selector */}
        <div className="flex-1 flex justify-start">
          <AcademicYearSelector />
        </div>
        
        {/* Center: App Name */}
        <div className="flex-none text-center">
            <h1 className="text-sm font-bold font-headline text-primary uppercase tracking-tight">
                {profile?.namaMadrasah || 'EduConnect'}
            </h1>
        </div>

        {/* Right: School Profile Link with Logo */}
        <div className="flex-1 flex justify-end">
          <Link href="/admin/profile">
            <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-primary/10 hover:border-primary/50 transition-all flex items-center justify-center bg-muted">
              {profile?.logoMadrasahUrl ? (
                <Image 
                  src={profile.logoMadrasahUrl} 
                  alt="Profile" 
                  width={36} 
                  height={36} 
                  className="h-full w-full object-contain"
                />
              ) : (
                <School className="h-5 w-5 text-primary/40" />
              )}
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-2 pb-24 sm:px-4">
          {children}
      </main>
      
      <BottomNav />
    </div>
  );
}
