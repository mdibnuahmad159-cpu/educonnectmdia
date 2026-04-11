
"use client";

import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { TeacherBottomNav } from "./components/teacher-bottom-nav";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { AcademicYearSelector } from "@/components/shared/academic-year-selector";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { profile, loading: isProfileLoading } = useSchoolProfile();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (profile?.namaMadrasah) {
      document.title = profile.namaMadrasah;
    }
  }, [profile]);

  useEffect(() => {
    if (isUserLoading || !isClient) return;
    
    const teacherNig = sessionStorage.getItem('teacherNig');

    if (!user || !teacherNig) {
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
        </div>
      </header>
      <main className="flex-1 p-2 pb-16 sm:px-4">
          {children}
      </main>
      <TeacherBottomNav />
    </div>
  );
}
