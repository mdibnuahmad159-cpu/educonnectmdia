"use client";

import Link from "next/link";
import { 
  Users, 
  BookCopy, 
  Calendar, 
  ClipboardCheck, 
  FileText, 
  ClipboardList, 
  Megaphone, 
  Award
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const academicMenus = [
  { href: "/admin/teachers", icon: Users, label: "Guru", color: "bg-blue-50 text-blue-600" },
  { href: "/admin/curriculum", icon: BookCopy, label: "Kurikulum", color: "bg-indigo-50 text-indigo-600" },
  { href: "/admin/schedule", icon: Calendar, label: "Jadwal", color: "bg-purple-50 text-purple-600" },
  { href: "/admin/grades", icon: ClipboardCheck, label: "Nilai", color: "bg-green-50 text-green-600" },
  { href: "/admin/reports", icon: FileText, label: "Rapor", color: "bg-emerald-50 text-emerald-600" },
  { href: "/admin/attendance", icon: ClipboardList, label: "Absen Guru", color: "bg-orange-50 text-orange-600" },
  { href: "/admin/announcements", icon: Megaphone, label: "Info", color: "bg-amber-50 text-amber-600" },
  { href: "/admin/certificates", icon: Award, label: "Piagam", color: "bg-yellow-50 text-yellow-600" },
];

export default function AkademikMenuPage() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {academicMenus.map((menu) => (
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
