
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { ParentBottomNav } from "./components/parent-bottom-nav";
import { BookOpenCheck, Loader2 } from "lucide-react";

export default function ParentLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isUserLoading || !isClient) return;
    
    const studentNis = sessionStorage.getItem('studentNis');

    if (!user || !studentNis) {
      // Not logged in or no student identified, redirect to home
      router.push('/');
      return;
    }

    if (user.email === 'mdibnuahmad159@gmail.com') {
      // Is an admin, redirect to admin dashboard
      router.push('/admin/dashboard');
      return;
    }

    if (user.isAnonymous === false) {
       // Is a named user (teacher), redirect to teacher dashboard
      router.push('/teacher/dashboard');
      return;
    }

  }, [user, isUserLoading, router, isClient]);

  if (isUserLoading || !user || !isClient || !user.isAnonymous) {
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
            <BookOpenCheck className="h-5 w-5" />
            <h1 className="text-base font-semibold font-headline">EduConnect Wali Murid</h1>
        </div>
      </header>
      <main className="flex-1 p-2 pb-16 sm:px-4">
          {children}
      </main>
      <ParentBottomNav />
    </div>
  );
}
