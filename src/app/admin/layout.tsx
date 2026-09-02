
"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/firebase";
import { BottomNav } from "./components/bottom-nav";
import { BookOpenCheck, Loader2, School } from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { Button } from "@/components/ui/button";
import { AcademicYearSelector } from "@/components/shared/academic-year-selector";
import { cn } from "@/lib/utils";

const MAIN_ROUTES = [
  "/admin/dashboard/",
  "/admin/akademik/",
  "/admin/siswa-menu/",
  "/admin/keuangan-menu/",
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { profile, loading: isProfileLoading } = useSchoolProfile();
  const router = useRouter();
  const pathname = usePathname();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left' | 'none'>('none');
  
  // Touch Handling for Swiping with visual feedback
  const contentRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

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

  useEffect(() => {
    const newIndex = MAIN_ROUTES.indexOf(pathname);
    if (newIndex !== -1) {
      if (newIndex > currentIndex) {
        setDirection('right');
      } else if (newIndex < currentIndex) {
        setDirection('left');
      } else {
        setDirection('none');
      }
      setCurrentIndex(newIndex);
    }
  }, [pathname, currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    isDragging.current = true;
    if (contentRef.current) {
      contentRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !isDragging.current) return;
    
    touchCurrentX.current = e.targetTouches[0].clientX;
    const deltaX = touchCurrentX.current - touchStartX.current;

    // Boundary resistance: restrict swiping past first/last items
    const isAtStart = currentIndex === 0 && deltaX > 0;
    const isAtEnd = currentIndex === MAIN_ROUTES.length - 1 && deltaX < 0;
    
    const factor = (isAtStart || isAtEnd) ? 0.3 : 1.0;
    
    if (contentRef.current) {
      contentRef.current.style.transform = `translateX(${deltaX * factor}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchCurrentX.current) {
        isDragging.current = false;
        return;
    }
    
    const deltaX = touchCurrentX.current - touchStartX.current;
    const threshold = 75; // Ambang batas geser untuk pindah halaman
    
    isDragging.current = false;

    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      contentRef.current.style.transform = 'translateX(0)';
    }

    if (deltaX > threshold && currentIndex > 0) {
      // Swipe Right -> Go Left (Previous)
      router.push(MAIN_ROUTES[currentIndex - 1]);
    } else if (deltaX < -threshold && currentIndex < MAIN_ROUTES.length - 1) {
      // Swipe Left -> Go Right (Next)
      router.push(MAIN_ROUTES[currentIndex + 1]);
    }

    touchStartX.current = null;
    touchCurrentX.current = null;
  };

  if (isUserLoading || !user || user.email !== 'mdibnuahmad159@gmail.com' || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Animation class for entering routes
  const animationClass = direction === 'right' ? 'page-slide-right' : direction === 'left' ? 'page-slide-left' : '';

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
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
      <main 
        key={pathname}
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "flex-1 p-2 pb-16 sm:px-4 will-change-transform",
          animationClass
        )}
      >
          {children}
      </main>
      <BottomNav />
    </div>
  );
}
