"use client";

import Link from "next/link";
import { 
  UsersRound, 
  PiggyBank, 
  History, 
  CreditCard, 
  ReceiptText,
  Wallet
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const financeMenus = [
  { href: "/admin/penabung-luar", icon: UsersRound, label: "Penabung Luar", color: "bg-blue-50 text-blue-600" },
  { href: "/admin/tabungan", icon: PiggyBank, label: "Tabungan", color: "bg-purple-50 text-purple-600" },
  { href: "/admin/riwayat-tabungan", icon: History, label: "Riwayat Tabungan", color: "bg-indigo-50 text-indigo-600" },
  { href: "/admin/spp", icon: CreditCard, label: "Input SPP", color: "bg-green-50 text-green-600" },
  { href: "/admin/riwayat-spp", icon: ReceiptText, label: "Riwayat SPP", color: "bg-emerald-50 text-emerald-600" },
  { href: "/admin/riwayat-transaksi", icon: Wallet, label: "Kas Terpadu", color: "bg-orange-50 text-orange-600" },
];

export default function KeuanganMenuPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {financeMenus.map((menu) => (
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
