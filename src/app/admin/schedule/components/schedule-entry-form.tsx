
"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarRange, X, Save, Trash2 } from "lucide-react";
import type { Curriculum, Teacher } from "@/types";
import type { EditContext } from "../page";

const formSchema = z.object({
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
});

type ScheduleEntryFormData = z.infer<typeof formSchema>;

type ScheduleEntryFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  context: EditContext | null;
  initialData: { subjectId?: string; teacherId?: string };
  curriculumData: Curriculum[];
  teachers: Teacher[];
  onSave: (data: ScheduleEntryFormData) => void;
  onClear: () => void;
};

export function ScheduleEntryForm({
  isOpen,
  setIsOpen,
  context,
  initialData,
  curriculumData,
  teachers,
  onSave,
  onClear
}: ScheduleEntryFormProps) {
  const form = useForm<ScheduleEntryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subjectId: "",
      teacherId: "",
    },
  });

  const filteredCurriculum = useMemo(() => {
    if (!context) return [];
    return curriculumData.filter(item => item.classLevel === context.classLevel);
  }, [curriculumData, context]);

  useEffect(() => {
    if (context) {
      form.reset({
        subjectId: initialData.subjectId || "",
        teacherId: initialData.teacherId || "",
      });
    }
  }, [context, initialData, form]);

  const onSubmit = (values: ScheduleEntryFormData) => {
    const dataToSave = {
      subjectId: values.subjectId === 'clear' ? '' : values.subjectId,
      teacherId: values.teacherId === 'clear' ? '' : values.teacherId,
    };
    onSave(dataToSave as ScheduleEntryFormData);
    setIsOpen(false);
  };
  
  const handleClear = () => {
    onClear();
    setIsOpen(false);
  }

  if (!context) return null;

  const dayNames: { [key: string]: string } = {
    saturday: 'Sabtu',
    sunday: 'Minggu',
    monday: 'Senin',
    tuesday: 'Selasa',
    wednesday: 'Rabu',
    thursday: 'Kamis',
  };

  const periodName = `Jam ke-${context.periodIndex + 1}`;
  const dayName = dayNames[context.dayKey];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                <DialogHeader className="sr-only">
                    <DialogTitle>Edit Jadwal</DialogTitle>
                    <DialogDescription>Pengaturan mata pelajaran per jam.</DialogDescription>
                </DialogHeader>

                <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <CalendarRange className="h-8 w-8 text-primary" />
                </div>

                <div className="w-full space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                        Atur Detail Jadwal
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase px-4 truncate">
                        Kelas {context.classLevel} • {dayName}, {periodName}
                    </p>
                </div>
            </div>

            <div className="px-6 py-2">
                <ScrollArea className="h-auto max-h-[300px] pr-2">
                    <div className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="subjectId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Mata Pelajaran</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-10 bg-white text-xs">
                                        <SelectValue placeholder="Pilih Mata Pelajaran" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="clear">-- Kosongkan --</SelectItem>
                                    {filteredCurriculum.map(item => (
                                    <SelectItem key={item.id} value={item.id} className="text-xs">
                                        {item.subjectName}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="teacherId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Guru Pengajar</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-10 bg-white text-xs">
                                        <SelectValue placeholder="Pilih Guru" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="clear">-- Kosongkan --</SelectItem>
                                    {teachers.map(teacher => (
                                    <SelectItem key={teacher.id} value={teacher.id} className="text-xs">
                                        {teacher.name}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </ScrollArea>
            </div>

            <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3 mt-2">
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="rounded-full px-4 text-xs font-bold uppercase tracking-widest h-10" onClick={() => setIsOpen(false)}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="destructive" className="rounded-full px-4 h-10 shadow-lg shadow-destructive/20" onClick={handleClear}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
                <Button type="submit" className="h-10 rounded-full px-8 bg-accent text-primary hover:bg-accent/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20">
                  <Save className="h-3.5 w-3.5 mr-2" /> Simpan Jadwal
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
