"use client";

import Link from "next/link";
import { 
  User, 
  School, 
  GraduationCap, 
  UserCheck,
  UsersRound
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const studentMenus = [
  { href: "/admin/students", icon: User, label: "Data Siswa", color: "bg-blue-50 text-blue-600" },
  { href: "/admin/class-management", icon: School, label: "Manajemen Kelas", color: "bg-green-50 text-green-600" },
  { href: "/admin/alumni", icon: GraduationCap, label: "Alumni", color: "bg-purple-50 text-purple-600" },
  { href: "/admin/student-attendance", icon: UserCheck, label: "Absen Siswa", color: "bg-orange-50 text-orange-600" },
];

export default function SiswaMenuPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {studentMenus.map((menu) => (
          <Link key={menu.href} href={menu.href}>
            <Card className="hover:shadow-md hover:border-primary/50 transition-all group">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3">
                <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", menu.color)}>
                  <menu.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tight text-foreground/80">{menu.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
