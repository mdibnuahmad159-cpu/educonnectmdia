"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/firebase";
import { BottomNav } from "./components/bottom-nav";
import { Loader2, School, Calendar } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { useAcademicYear } from "@/context/academic-year-provider";

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
  const router = useRouter();
  const pathname = usePathname();

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

  const currentPage = useMemo(() => {
    const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    return PAGE_TITLES[cleanPath] || { title: "Administrator", sub: "Manajemen sistem terpadu." };
  }, [pathname]);

  if (isUserLoading || !user || user.email !== 'mdibnuahmad159@gmail.com' || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-20 flex flex-col bg-primary shadow-xl text-primary-foreground rounded-b-[32px]">
        {/* Top Row: Basic Info & Profile */}
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
              <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/50 transition-all flex items-center justify-center bg-white/10 backdrop-blur-sm">
                {profile?.logoMadrasahUrl ? (
                  <Image 
                    src={profile.logoMadrasahUrl} 
                    alt="Profile" 
                    width={32} 
                    height={32} 
                    className="h-full w-full object-contain brightness-0 invert"
                  />
                ) : (
                  <School className="h-4 w-4 text-white/60" />
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Bottom Row: Page Titles - Centered with Accent Color */}
        <div className="px-6 py-4 pb-6 flex justify-center">
            <h2 className="text-base font-bold font-headline uppercase tracking-[0.2em] text-accent leading-none text-center">
                {currentPage.title}
            </h2>
        </div>
      </header>

      <main className="flex-1 p-3 pb-24 sm:px-6 -mt-4 relative z-20">
          {children}
      </main>
      
      <BottomNav />
    </div>
  );
}
