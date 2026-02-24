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
    onSave(values);
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
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Edit Jadwal</DialogTitle>
          <DialogDescription>
            Kelas {context.classLevel} - {dayName}, {periodName}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mata Pelajaran</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Mapel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">-- Kosongkan --</SelectItem>
                        {filteredCurriculum.map(item => (
                          <SelectItem key={item.id} value={item.id}>
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
                    <FormLabel>Guru</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Guru" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">-- Kosongkan --</SelectItem>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>
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
            <DialogFooter className="pt-4 justify-between">
              <Button type="button" variant="destructive" size="xs" onClick={handleClear}>Hapus</Button>
              <Button type="submit" size="xs">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
