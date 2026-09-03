"use client";

import { ReactNode, useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useUser, useAuth, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { TeacherBottomNav } from "./components/teacher-bottom-nav";
import { BookOpenCheck, Loader2, Calendar, ChevronLeft, LogOut, Bell } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { useAcademicYear } from "@/context/academic-year-provider";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { collection, query, orderBy } from "firebase/firestore";

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/teacher/dashboard": { title: "Beranda Guru", sub: "Ringkasan jadwal dan tugas harian." },
  "/teacher/grades": { title: "Input Nilai", sub: "Pengelolaan hasil belajar santri." },
  "/teacher/student-attendance": { title: "Absensi Santri", sub: "Verifikasi kehadiran harian kelas." },
  "/teacher/tabungan": { title: "Tabungan Saya", sub: "Riwayat simpanan pribadi." },
  "/teacher/attendance-history": { title: "Riwayat Absensi", sub: "Laporan jurnal dan rekap kehadiran pribadi." },
  "/teacher/schedule": { title: "Jadwal Mengajar", sub: "Daftar jam mengajar dan kurikulum mingguan." },
  "/teacher/announcements": { title: "Pengumuman", sub: "Informasi dan berita madrasah." },
};

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { profile, loading: isProfileLoading } = useSchoolProfile();
  const { activeYear } = useAcademicYear();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "announcements"),
      orderBy("createdAt", "desc")
    );
  }, [firestore]);
  const { data: allAnnouncements } = useCollection(announcementsQuery);

  useEffect(() => {
    if (allAnnouncements && allAnnouncements.length > 0) {
      const teacherAnnouncements = allAnnouncements.filter(a => a.target === 'Semua' || a.target === 'Guru');
      
      if (teacherAnnouncements.length > 0) {
        const latestId = teacherAnnouncements[0].id;
        const lastReadId = localStorage.getItem('last_read_announcement_teacher');
        
        if (latestId !== lastReadId && pathname !== "/teacher/announcements") {
          setHasNewAnnouncement(true);
        } else if (pathname === "/teacher/announcements") {
          setHasNewAnnouncement(false);
          localStorage.setItem('last_read_announcement_teacher', latestId);
        }
      }
    }
  }, [allAnnouncements, pathname]);

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
      <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground shadow-md">
        <div className="flex flex-col w-full">
          <div className="flex h-12 items-center justify-between gap-4 px-4 border-b border-white/5">
            <div className="flex-1 flex justify-start">
              <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-white/10 rounded-full border border-white/10 text-white">
                  <Calendar className="h-2.5 w-2.5 opacity-80" />
                  <span>{activeYear}</span>
              </div>
            </div>
            
            <div className="flex-none text-center">
                <h1 className="text-[9px] font-bold font-headline uppercase tracking-widest text-white/50">
                    {profile?.namaMadrasah || 'EduConnect'}
                </h1>
            </div>

            <div className="flex-1 flex justify-end">
                <div className="h-8 w-8 rounded-full overflow-hidden border border-white/30 flex items-center justify-center bg-white shadow-sm">
                  {profile?.logoMadrasahUrl ? (
                    <Image 
                      src={profile.logoMadrasahUrl} 
                      alt="Madrasah" 
                      width={32} 
                      height={32} 
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <BookOpenCheck className="h-4 w-4 text-primary" />
                  )}
                </div>
            </div>
          </div>

          <div className="px-3 py-1 flex items-center justify-between min-h-[40px]">
              <div className="w-10 flex justify-start items-center gap-1">
                  {!isDashboard ? (
                    <button 
                      onClick={() => router.back()}
                      className="p-1 text-accent hover:bg-white/10 rounded-full transition-colors active:scale-90"
                      aria-label="Kembali"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  ) : (
                    <Link href="/teacher/announcements" className="relative p-1 text-accent hover:bg-white/10 rounded-full transition-all active:scale-90">
                      <Bell className="h-4 w-4" />
                      {hasNewAnnouncement && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-destructive rounded-full border border-primary animate-pulse" />
                      )}
                    </Link>
                  )}
              </div>
              
              <h2 className="text-[9px] font-bold font-headline uppercase tracking-[0.2em] leading-none text-center text-accent flex-1">
                  {currentPage.title}
              </h2>

              <div className="w-10 flex justify-end">
                  <button 
                    onClick={handleLogout}
                    className="p-1 text-white/40 hover:text-destructive-foreground hover:bg-destructive rounded-full transition-all active:scale-90"
                    title="Log Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
              </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-2 pb-20 sm:px-4 relative z-10">
          {children}
      </main>
      
      <TeacherBottomNav />
    </div>
  );
}
