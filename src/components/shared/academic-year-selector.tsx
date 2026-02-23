'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAcademicYear } from "@/context/academic-year-provider";
import { ChevronDown, Circle } from "lucide-react";

export function AcademicYearSelector() {
  const { activeYear, setActiveYear, availableYears } = useAcademicYear();

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
