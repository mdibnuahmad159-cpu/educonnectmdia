"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Wallet, 
  FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/parent/dashboard", icon: Home, label: "Beranda" },
  { href: "/parent/finance", icon: Wallet, label: "Keuangan" },
  { href: "/parent/reports", icon: FileText, label: "Rapor" },
];

export function ParentBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
      <div className="max-w-md w-full pointer-events-auto">
        <nav className="bg-primary/95 backdrop-blur-md rounded-full p-1.5 flex items-center justify-around shadow-2xl border border-white/10">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
                  isActive ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {isActive && (
                  <span className="text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95 duration-200">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
