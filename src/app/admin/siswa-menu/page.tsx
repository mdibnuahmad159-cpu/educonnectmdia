"use client";

import Link from "next/link";
import { 
  User, 
  School, 
  GraduationCap, 
  UserCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const studentMenus = [
  { href: "/admin/students", icon: User, label: "Data Siswa", color: "bg-blue-50 text-blue-600" },
  { href: "/admin/class-management", icon: School, label: "Manajemen", color: "bg-green-50 text-green-600" },
  { href: "/admin/alumni", icon: GraduationCap, label: "Alumni", color: "bg-purple-50 text-purple-600" },
  { href: "/admin/student-attendance", icon: UserCheck, label: "Absen Siswa", color: "bg-orange-50 text-orange-600" },
];

export default function SiswaMenuPage() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {studentMenus.map((menu) => (
          <Link key={menu.href} href={menu.href}>
            <Card className="hover:shadow-sm border-muted/50 active:scale-95 transition-all">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className={cn("p-2 rounded-xl", menu.color)}>
                  <menu.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight text-foreground/70">{menu.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
