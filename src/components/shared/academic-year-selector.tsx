"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useUser } from "@/firebase";
import { ChevronDown, Circle, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AcademicYearSelector() {
  const { activeYear, setActiveYear, availableYears, loading } = useAcademicYear();
  const { user, isUserLoading } = useUser();

  const isAdmin = user?.email === 'mdibnuahmad159@gmail.com';

  if (loading || isUserLoading) {
      return <Skeleton className="h-8 w-28" />;
  }
  
  if (!activeYear) return null;

  if (!isAdmin) {
      return (
          <div className="flex items-center gap-1.5 text-sm font-semibold px-2">
              <Calendar className="h-4 w-4 opacity-70" />
              <span>{activeYear}</span>
          </div>
      )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-sm font-semibold">
          {activeYear}
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableYears.map((year) => (
          <DropdownMenuItem key={year} onSelect={() => setActiveYear(year)} className="flex items-center gap-2">
            {year === activeYear ? (
                <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
            ) : (
                <div className="h-2.5 w-2.5" /> 
            )}
            <span>{year}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
