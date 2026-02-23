"use client";

import { ReactNode, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { TeacherBottomNav } from "./components/teacher-bottom-nav";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { profile, loading: isProfileLoading } = useSchoolProfile();
  const router = useRouter();
  
  useEffect(() => {
    if (profile?.namaMadrasah) {
      document.title = `${profile.namaMadrasah} - Guru`;
    }
  }, [profile]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
    // Also check if the user is an admin, if so, redirect to admin dashboard
    if (!isUserLoading && user && user.email === 'mdibnuahmad159@gmail.com') {
      router.push('/admin/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-12 items-center gap-4 border-b bg-background px-3 sm:px-4">
        <div className="flex items-center gap-2 text-primary">
            {profile?.logoMadrasahUrl ? (
                <Image src={profile.logoMadrasahUrl} alt="Logo" width={24} height={24} className="h-6 w-6 object-contain"/>
            ) : (
                <BookOpenCheck className="h-5 w-5" />
            )}
            <h1 className="text-base font-semibold font-headline">
                {profile?.namaMadrasah ? `${profile.namaMadrasah} Guru` : 'EduConnect Guru'}
            </h1>
        </div>
      </header>
      <main className="flex-1 p-2 pb-16 sm:px-4">
          {children}
      </main>
      <TeacherBottomNav />
    </div>
  );
}
