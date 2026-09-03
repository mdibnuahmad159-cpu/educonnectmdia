
"use client";

import { ReactNode, useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useUser, useAuth } from "@/firebase";
import { TeacherBottomNav } from "./components/teacher-bottom-nav";
import { BookOpenCheck, Loader2, Calendar, ChevronLeft, LogOut } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { useAcademicYear } from "@/context/academic-year-provider";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/teacher/dashboard": { title: "Beranda Guru", sub: "Ringkasan jadwal dan tugas harian." },
  "/teacher/grades": { title: "Input Nilai", sub: "Pengelolaan hasil belajar santri." },
  "/teacher/student-attendance": { title: "Absensi Santri", sub: "Verifikasi kehadiran harian kelas." },
  "/teacher/tabungan": { title: "Tabungan Saya", sub: "Riwayat simpanan pribadi." },
};

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { profile, loading: isProfileLoading } = useSchoolProfile();
  const { activeYear } = useAcademicYear();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const handleLogout = async () => {
    if (!auth) return;
    try {
      sessionStorage.removeItem('teacherNig');
      await signOut(auth);
      toast({ title: "Logout Berhasil" });
      router.push('/');
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Gagal" });
    }
  };

  const cleanPath = useMemo(() => {
    return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  }, [pathname]);

  const currentPage = useMemo(() => {
    return PAGE_TITLES[cleanPath] || { title: "Portal Guru", sub: "Sistem Madrasah Terpadu." };
  }, [cleanPath]);

  const isDashboard = cleanPath === "/teacher/dashboard";

  if (isUserLoading || !user || !isClient || !user.isAnonymous || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 p-2 bg-transparent">
        <div className="flex flex-col bg-primary text-primary-foreground rounded-2xl shadow-lg border-b border-white/5 overflow-hidden">
          {/* Baris Atas: Identitas & Tahun */}
          <div className="flex h-14 items-center justify-between gap-4 px-4">
            <div className="flex-1 flex justify-start">
              <div className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-white">
                  <Calendar className="h-3 w-3 opacity-80" />
                  <span>{activeYear}</span>
              </div>
            </div>
            
            <div className="flex-none text-center">
                <h1 className="text-[10px] font-bold font-headline uppercase tracking-widest text-white/60">
                    {profile?.namaMadrasah || 'EduConnect'}
                </h1>
            </div>

            <div className="flex-1 flex justify-end">
                <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-white/30 flex items-center justify-center bg-white shadow-sm">
                  {profile?.logoMadrasahUrl ? (
                    <Image 
                      src={profile.logoMadrasahUrl} 
                      alt="Madrasah" 
                      width={36} 
                      height={36} 
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <BookOpenCheck className="h-5 w-5 text-primary" />
                  )}
                </div>
            </div>
          </div>

          {/* Baris Bawah: Judul & Aksi */}
          <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-white/5 min-h-[44px]">
              <div className="w-16 flex justify-start">
                  {!isDashboard && (
                    <button 
                      onClick={() => router.back()}
                      className="p-1.5 text-accent hover:bg-white/10 rounded-full transition-colors active:scale-90"
                      aria-label="Kembali"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
              </div>
              
              <h2 className="text-[10px] font-bold font-headline uppercase tracking-[0.25em] leading-none text-center text-accent flex-1">
                  {currentPage.title}
              </h2>

              <div className="w-16 flex justify-end">
                  <button 
                    onClick={handleLogout}
                    className="p-1.5 text-white/40 hover:text-destructive-foreground hover:bg-destructive rounded-full transition-all active:scale-90"
                    title="Log Out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
              </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-3 pb-24 sm:px-6 relative z-10">
          {children}
      </main>
      
      <TeacherBottomNav />
    </div>
  );
}
