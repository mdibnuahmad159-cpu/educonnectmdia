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
  { href: "/admin/penabung-luar", icon: UsersRound, label: "Penabung", color: "bg-blue-50 text-blue-600" },
  { href: "/admin/tabungan", icon: PiggyBank, label: "Input", color: "bg-purple-50 text-purple-600" },
  { href: "/admin/riwayat-tabungan", icon: History, label: "Riwayat Tab", color: "bg-indigo-50 text-indigo-600" },
  { href: "/admin/spp", icon: CreditCard, label: "SPP", color: "bg-green-50 text-green-600" },
  { href: "/admin/riwayat-spp", icon: ReceiptText, label: "Riwayat SPP", color: "bg-emerald-50 text-emerald-600" },
  { href: "/admin/riwayat-transaksi", icon: Wallet, label: "Kas", color: "bg-orange-50 text-orange-600" },
];

export default function KeuanganMenuPage() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {financeMenus.map((menu) => (
          <Link key={menu.href} href={menu.href}>
            <Card className="hover:shadow-sm border-muted/50 active:scale-95 transition-all">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className={cn("p-2 rounded-xl", menu.color)}>
                  <menu.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight text-foreground/80">{menu.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
