
"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useUser } from "@/firebase";
import { ChevronDown, Calendar, Plus } from "lucide-react";
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
      return <Skeleton className="h-8 w-28 rounded-full" />;
  }
  
  if (!activeYear) return null;

  if (!isAdmin) {
      return (
          <div className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-secondary/50 rounded-full border border-primary/5">
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
            className="rounded-full bg-secondary/80 hover:bg-secondary text-foreground font-bold px-3 h-[32px] border-none shadow-sm transition-all flex items-center gap-2 group outline-none"
          >
            <Calendar className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <span className="text-[11px]">{activeYear}</span>
            <ChevronDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-all group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent 
            align="start" 
            sideOffset={8}
            className="w-44 rounded-[20px] p-1.5 shadow-2xl border-none bg-card z-[100] animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Tahun Ajaran
            </div>
            {availableYears.map((year) => (
              <DropdownMenuItem 
                key={year} 
                onSelect={() => setActiveYear(year)} 
                className="flex items-center gap-2.5 p-2 rounded-[14px] cursor-pointer focus:bg-muted group transition-all"
              >
                <div className={year === activeYear ? "text-primary" : "text-muted-foreground opacity-40"}>
                    <Calendar className="h-3.5 w-3.5" />
                </div>
                <span className={`flex-1 text-xs ${year === activeYear ? "font-bold text-primary" : "font-medium"}`}>
                    {year}
                </span>
                {year === activeYear && (
                    <div className="w-1 h-1 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator className="my-1.5 bg-muted/50" />
            
            <DropdownMenuItem 
                onSelect={() => setIsManualOpen(true)}
                className="flex items-center gap-2.5 p-2 rounded-[14px] cursor-pointer focus:bg-primary/5 group"
            >
                <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1 text-[11px] font-bold text-muted-foreground group-hover:text-primary uppercase tracking-tight">
                    Input Manual
                </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>

      <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
        <DialogContent className="sm:max-w-xs rounded-[28px] p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-tight text-center">Tahun Ajaran Baru</DialogTitle>
            <DialogDescription className="text-xs text-center">
                Gunakan format: YYYY/YYYY<br/>(Contoh: 2025/2026)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="2025/2026" 
              value={manualYear}
              onChange={(e) => setManualYear(e.target.value)}
              className="h-12 rounded-2xl font-mono text-center text-lg tracking-wider border-primary/10 focus-visible:ring-primary"
            />
          </div>
          <DialogFooter>
            <Button 
              onClick={handleManualSubmit} 
              className="w-full rounded-full h-11 font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
              disabled={!manualYear.includes('/')}
            >
              Aktifkan Tahun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
