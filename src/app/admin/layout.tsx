"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useUser, useAuth } from "@/firebase";
import { BottomNav } from "./components/bottom-nav";
import { Loader2, School, Calendar, ChevronLeft, LogOut, Save } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { useAcademicYear } from "@/context/academic-year-provider";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/admin/dashboard": { title: "Dashboard", sub: "Monitoring data madrasah hari ini." },
  "/admin/teachers": { title: "Data Guru", sub: "Kelola informasi pendidik dan staf." },
  "/admin/students": { title: "Data Siswa", sub: "Kelola informasi santri aktif." },
  "/admin/akademik": { title: "Akademik", sub: "Manajemen kurikulum dan administrasi guru." },
  "/admin/siswa-menu": { title: "Kategori Siswa", sub: "Manajemen data, kelas, dan alumni santri." },
  "/admin/keuangan-menu": { title: "Kategori Keuangan", sub: "Manajemen tabungan, SPP, dan kas madrasah." },
  "/admin/curriculum": { title: "Kurikulum", sub: "Daftar mata pelajaran dan kitab per kelas." },
  "/admin/schedule": { title: "Jadwal", sub: "Pengaturan jam belajar dan ujian." },
  "/admin/grades": { title: "Input Nilai", sub: "Rekapitulasi hasil belajar santri per semester." },
  "/admin/reports": { title: "Rapor Digital", sub: "Kelola tautan dokumen rapor resmi." },
  "/admin/attendance": { title: "Absensi Guru", sub: "Rekapitulasi kehadiran guru terjadwal." },
  "/admin/student-attendance": { title: "Absensi Siswa", sub: "Rekapitulasi kehadiran harian santri." },
  "/admin/announcements": { title: "Pengumuman", sub: "Berita dan informasi untuk warga madrasah." },
  "/admin/certificates": { title: "Sertifikat", sub: "Catatan prestasi dan pencetakan piagam." },
  "/admin/alumni": { title: "Alumni", sub: "Data santri yang telah menyelesaikan pendidikan." },
  "/admin/class-management": { title: "Manajemen Kelas", sub: "Kenaikan, penurunan, dan mutasi kelas." },
  "/admin/tabungan": { title: "Tabungan", sub: "Input setoran dan penarikan simpanan." },
  "/admin/spp": { title: "Input SPP", sub: "Catatan pelunasan iuran bulanan siswa." },
  "/admin/riwayat-tabungan": { title: "Riwayat Tabungan", sub: "Log mutasi simpanan seluruh penabung." },
  "/admin/riwayat-spp": { title: "Riwayat SPP", sub: "Log pembayaran iuran bulanan." },
  "/admin/riwayat-transaksi": { title: "Kas Terpadu", sub: "Gabungan seluruh mutasi keuangan." },
  "/admin/penabung-luar": { title: "Penabung Luar", sub: "Data penabung dari luar internal madrasah." },
  "/admin/profile": { title: "Profil Madrasah", sub: "Informasi umum, visi, misi, dan identitas lembaga." },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { profile, loading: isProfileLoading } = useSchoolProfile();
  const { activeYear } = useAcademicYear();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

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

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: "Logout Berhasil" });
      router.push('/');
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Gagal" });
    }
  };

  const handleTriggerSaveProfile = () => {
    window.dispatchEvent(new CustomEvent('save-profile'));
  };

  const cleanPath = useMemo(() => {
    return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  }, [pathname]);

  const currentPage = useMemo(() => {
    return PAGE_TITLES[cleanPath] || { title: "Administrator", sub: "Manajemen sistem terpadu." };
  }, [cleanPath]);

  const isDashboard = cleanPath === "/admin/dashboard";

  if (isUserLoading || !user || user.email !== 'mdibnuahmad159@gmail.com' || isProfileLoading) {
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
          {/* Top Row: Identity & Year */}
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
              <Link href="/admin/profile">
                <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-white/30 hover:border-white transition-all flex items-center justify-center bg-white shadow-sm">
                  {profile?.logoMadrasahUrl ? (
                    <Image 
                      src={profile.logoMadrasahUrl} 
                      alt="Profile" 
                      width={36} 
                      height={36} 
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <School className="h-5 w-5 text-primary" />
                  )}
                </div>
              </Link>
            </div>
          </div>

          {/* Bottom Row: Title (Centered) & Actions */}
          <div className="px-4 py-2 flex items-center justify-between min-h-[48px]">
              <div className="w-12 flex justify-start">
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

              <div className="w-12 flex justify-end items-center gap-1">
                  {cleanPath === "/admin/profile" && (
                    <button 
                      onClick={handleTriggerSaveProfile}
                      className="p-1.5 text-accent hover:bg-white/10 rounded-full transition-all active:scale-90"
                      title="Simpan Perubahan"
                    >
                      <Save className="h-5 w-5" />
                    </button>
                  )}
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
      
      <BottomNav />
    </div>
  );
}