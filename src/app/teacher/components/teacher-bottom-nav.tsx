
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { href: "/teacher/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

export function TeacherBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      // Clear session storage on logout
      sessionStorage.removeItem('teacherNig');
      await signOut(auth);
      toast({ title: "Logout Berhasil" });
      router.push('/');
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Gagal" });
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 z-50 w-full h-14 bg-card border-t">
      <div className="grid h-full grid-cols-2 max-w-lg mx-auto font-medium">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted group",
              pathname.startsWith(item.href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-4 h-4 mb-1" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
         <button
            type="button"
            onClick={handleLogout}
            className="inline-flex flex-col items-center justify-center px-5 text-muted-foreground hover:bg-muted group"
          >
            <LogOut className="w-4 h-4 mb-1" />
            <span className="text-xs">Keluar</span>
          </button>
      </div>
    </footer>
  );
}
