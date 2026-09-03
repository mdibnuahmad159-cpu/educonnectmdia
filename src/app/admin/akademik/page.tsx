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
  Award,
  BookOpen
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const academicMenus = [
  { href: "/admin/teachers", icon: Users, label: "Data Guru", color: "bg-blue-50 text-blue-600" },
  { href: "/admin/curriculum", icon: BookCopy, label: "Kurikulum", color: "bg-indigo-50 text-indigo-600" },
  { href: "/admin/schedule", icon: Calendar, label: "Jadwal", color: "bg-purple-50 text-purple-600" },
  { href: "/admin/grades", icon: ClipboardCheck, label: "Nilai", color: "bg-green-50 text-green-600" },
  { href: "/admin/reports", icon: FileText, label: "Rapor", color: "bg-emerald-50 text-emerald-600" },
  { href: "/admin/attendance", icon: ClipboardList, label: "Absen Guru", color: "bg-orange-50 text-orange-600" },
  { href: "/admin/announcements", icon: Megaphone, label: "Pengumuman", color: "bg-amber-50 text-amber-600" },
  { href: "/admin/certificates", icon: Award, label: "Sertifikat", color: "bg-yellow-50 text-yellow-600" },
];

export default function AkademikMenuPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {academicMenus.map((menu) => (
          <Link key={menu.href} href={menu.href}>
            <Card className="hover:shadow-md hover:border-primary/50 transition-all group overflow-hidden">
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
