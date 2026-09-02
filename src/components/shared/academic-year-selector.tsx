
"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useUser } from "@/firebase";
import { ChevronDown, Calendar, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AcademicYearSelector() {
  const { activeYear, setActiveYear, availableYears, loading } = useAcademicYear();
  const { user, isUserLoading } = useUser();
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualYear, setManualYear] = useState("");

  const isAdmin = user?.email === 'mdibnuahmad159@gmail.com';

  if (loading || isUserLoading) {
      return <Skeleton className="h-9 w-32 rounded-full" />;
  }
  
  if (!activeYear) return null;

  if (!isAdmin) {
      return (
          <div className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 bg-secondary/50 rounded-full border border-primary/5">
              <Calendar className="h-3.5 w-3.5 opacity-70 text-primary" />
              <span>{activeYear}</span>
          </div>
      )
  }

  const handleManualSubmit = async () => {
    if (manualYear.includes('/')) {
        await setActiveYear(manualYear);
        setIsManualOpen(false);
        setManualYear("");
    }
  };

  return (
    <>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button 
                variant="secondary" 
                size="sm" 
                className="rounded-full bg-secondary/80 hover:bg-secondary text-foreground font-bold px-5 h-9 border-none shadow-sm transition-all flex items-center gap-2 group"
            >
                <Calendar className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs">{activeYear}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100 transition-all group-data-[state=open]:rotate-180" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
            align="start" 
            className="w-56 rounded-[24px] p-2 shadow-2xl border-none bg-card animate-in fade-in zoom-in-95 duration-200"
        >
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Pilih Tahun Ajaran
            </div>
            {availableYears.map((year) => (
            <DropdownMenuItem 
                key={year} 
                onSelect={() => setActiveYear(year)} 
                className="flex items-center gap-3 p-3 rounded-[16px] cursor-pointer focus:bg-muted group transition-all"
            >
                <div className={year === activeYear ? "text-primary" : "text-muted-foreground opacity-50"}>
                    <Calendar className="h-4 w-4" />
                </div>
                <span className={`flex-1 text-sm ${year === activeYear ? "font-bold text-primary" : "font-medium"}`}>
                    {year}
                </span>
                {year === activeYear && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
            </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator className="my-2 bg-muted/50" />
            
            <DropdownMenuItem 
                onSelect={() => setIsManualOpen(true)}
                className="flex items-center gap-3 p-3 rounded-[16px] cursor-pointer focus:bg-primary/5 group"
            >
                <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    <Plus className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-medium text-muted-foreground group-hover:text-primary">
                    Input Manual...
                </span>
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogContent className="sm:max-w-xs rounded-[24px]">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold uppercase tracking-tight">Tahun Ajaran Baru</DialogTitle>
                    <DialogDescription className="text-xs">
                        Gunakan format: YYYY/YYYY (Contoh: 2025/2026)
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder="2025/2026" 
                        value={manualYear}
                        onChange={(e) => setManualYear(e.target.value)}
                        className="h-10 rounded-xl font-mono text-center"
                    />
                </div>
                <DialogFooter>
                    <Button 
                        onClick={handleManualSubmit} 
                        className="w-full rounded-full h-10 font-bold"
                        disabled={!manualYear.includes('/')}
                    >
                        Aktifkan Tahun Ini
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
