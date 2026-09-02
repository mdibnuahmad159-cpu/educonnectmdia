
"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/firebase";
import { BottomNav } from "./components/bottom-nav";
import { Loader2, School, Calendar } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { useAcademicYear } from "@/context/academic-year-provider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { profile, loading: isProfileLoading } = useSchoolProfile();
  const { activeYear } = useAcademicYear();
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
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 bg-primary px-4 shadow-lg text-primary-foreground">
        {/* Left: Academic Year Display */}
        <div className="flex-1 flex justify-start">
          <div className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-white">
              <Calendar className="h-3.5 w-3.5 opacity-80" />
              <span>{activeYear}</span>
          </div>
        </div>
        
        {/* Center: App Name */}
        <div className="flex-none text-center">
            <h1 className="text-sm font-bold font-headline uppercase tracking-wider text-white">
                {profile?.namaMadrasah || 'EduConnect'}
            </h1>
        </div>

        {/* Right: School Profile Link with Logo */}
        <div className="flex-1 flex justify-end">
          <Link href="/admin/profile">
            <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/50 transition-all flex items-center justify-center bg-white/10 backdrop-blur-sm">
              {profile?.logoMadrasahUrl ? (
                <Image 
                  src={profile.logoMadrasahUrl} 
                  alt="Profile" 
                  width={36} 
                  height={36} 
                  className="h-full w-full object-contain brightness-0 invert"
                />
              ) : (
                <School className="h-5 w-5 text-white/60" />
              )}
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-3 pb-24 sm:px-6">
          {children}
      </main>
      
      <BottomNav />
    </div>
  );
}
