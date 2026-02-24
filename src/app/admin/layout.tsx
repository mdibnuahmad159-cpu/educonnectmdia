"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/firebase";
import { BottomNav } from "./components/bottom-nav";
import { BookOpenCheck, Loader2, School } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { Button } from "@/components/ui/button";
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
      // If not loading and no user, redirect to login
      if (!user) {
        router.push('/');
      } 
      // If user exists but is not the admin, redirect away
      else if (user.email !== 'mdibnuahmad159@gmail.com') {
        router.push('/teacher/dashboard');
      }
    }
  }, [user, isUserLoading, router]);

  // Show loader while checking user auth, or if the user is not the admin
  if (isUserLoading || !user || user.email !== 'mdibnuahmad159@gmail.com' || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-11 items-center justify-between gap-4 border-b bg-card px-2 sm:px-3">
        <div className="flex items-center gap-2 text-primary">
            {profile?.logoMadrasahUrl ? (
                <Image src={profile.logoMadrasahUrl} alt="Logo" width={20} height={20} className="h-5 w-5 object-contain"/>
            ) : (
                <BookOpenCheck className="h-4 w-4" />
            )}
            <h1 className="text-sm font-semibold font-headline">
                {profile?.namaMadrasah || 'EduConnect'}
            </h1>
        </div>
        <div className="flex items-center gap-2">
          <AcademicYearSelector />
          <Link href="/admin/profile">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <School className="h-4 w-4" />
              <span className="sr-only">Profil Sekolah</span>
            </Button>
          </Link>
        </div>
      </header>
      <main className="flex-1 p-2 pb-16 sm:px-4">
          {children}
      </main>
      <BottomNav />
    </div>
  );
}
