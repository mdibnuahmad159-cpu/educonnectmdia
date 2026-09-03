"use client";

import { ReactNode, useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useUser, useAuth, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { ParentBottomNav } from "./components/parent-bottom-nav";
import { 
  BookOpenCheck, 
  Loader2, 
  Calendar, 
  ChevronLeft, 
  LogOut,
  Bell
} from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { useAcademicYear } from "@/context/academic-year-provider";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { collection, query, orderBy } from "firebase/firestore";

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/parent/dashboard": { title: "Beranda Wali", sub: "Informasi perkembangan santri." },
  "/parent/finance": { title: "Keuangan Santri", sub: "Status tabungan dan pelunasan SPP." },
  "/parent/schedule": { title: "Jadwal Pelajaran", sub: "Agenda harian kegiatan belajar." },
  "/parent/reports": { title: "Rapor Digital", sub: "Hasil capaian kompetensi santri." },
  "/parent/attendance": { title: "Riwayat Absensi", sub: "Jurnal kehadiran santri harian." },
  "/parent/announcements": { title: "Pengumuman", sub: "Berita dan informasi penting madrasah." },
};

export default function ParentLayout({ children }: { children: ReactNode }) {
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

  // Ambil semua pengumuman untuk cek notifikasi
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
      // Filter untuk wali
      const parentAnnouncements = allAnnouncements.filter(a => a.target === 'Semua' || a.target === 'Wali Murid');
      
      if (parentAnnouncements.length > 0) {
        const latestId = parentAnnouncements[0].id;
        const lastReadId = localStorage.getItem('last_read_announcement_parent');
        
        if (latestId !== lastReadId && pathname !== "/parent/announcements") {
          setHasNewAnnouncement(true);
        } else if (pathname === "/parent/announcements") {
          setHasNewAnnouncement(false);
          localStorage.setItem('last_read_announcement_parent', latestId);
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
    
    const studentNis = sessionStorage.getItem('studentNis');

    if (!user || !studentNis) {
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
      sessionStorage.removeItem('studentNis');
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
    return PAGE_TITLES[cleanPath] || { title: "Wali Murid", sub: "Portal Informasi Santri." };
  }, [cleanPath]);

  const isDashboard = cleanPath === "/parent/dashboard";

  if (isUserLoading || !user || !isClient || !user.isAnonymous || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground shadow-lg">
        <div className="flex flex-col w-full">
          <div className="flex h-14 items-center justify-between gap-4 px-4 border-b border-white/5">
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

          <div className="px-4 py-2 flex items-center justify-between min-h-[48px]">
              <div className="w-12 flex justify-start items-center gap-1">
                  {!isDashboard ? (
                    <button 
                      onClick={() => router.back()}
                      className="p-1.5 text-accent hover:bg-white/10 rounded-full transition-colors active:scale-90"
                      aria-label="Kembali"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  ) : (
                    <Link href="/parent/announcements" className="relative p-1.5 text-accent hover:bg-white/10 rounded-full transition-all active:scale-90">
                      <Bell className="h-5 w-5" />
                      {hasNewAnnouncement && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-primary animate-pulse" />
                      )}
                    </Link>
                  )}
              </div>
              
              <h2 className="text-[10px] font-bold font-headline uppercase tracking-[0.25em] leading-none text-center text-accent flex-1">
                  {currentPage.title}
              </h2>

              <div className="w-12 flex justify-end">
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
      
      <ParentBottomNav />
    </div>
  );
}
