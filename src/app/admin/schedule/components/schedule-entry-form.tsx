
"use client";

import { useEffect } from "react";
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
import type { ScheduleEntry, Teacher, Curriculum } from "@/types";

const formSchema = z.object({
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
});

type ScheduleEntryFormData = z.infer<typeof formSchema>;

export type EditingSlot = {
    day: string;
    periodIndex: number;
    entry: ScheduleEntry;
}

type ScheduleEntryFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingSlot: EditingSlot | null;
  onSave: (slot: EditingSlot, data: {subjectId?: string, teacherId?: string}) => void;
  subjects: Curriculum[];
  teachers: Teacher[];
};

const defaultValues: ScheduleEntryFormData = {
    subjectId: "",
    teacherId: "",
};

export function ScheduleEntryForm({ isOpen, setIsOpen, editingSlot, onSave, subjects, teachers }: ScheduleEntryFormProps) {
  const form = useForm<ScheduleEntryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  useEffect(() => {
    if (editingSlot) {
        form.reset({
            subjectId: editingSlot.entry.subjectId || "",
            teacherId: editingSlot.entry.teacherId || "",
        });
    }
  }, [editingSlot, form]);
  
  const onSubmit = (values: ScheduleEntryFormData) => {
    if (!editingSlot) return;
    onSave(editingSlot, values);
  };
  
  const handleClear = () => {
    if (!editingSlot) return;
    onSave(editingSlot, { subjectId: undefined, teacherId: undefined });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Edit Slot Jadwal</DialogTitle>
          <DialogDescription>
            Atur detail untuk slot jadwal yang dipilih.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-3 py-4">
                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mata Pelajaran</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih mapel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {subjects.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.subjectName}</SelectItem>
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
                      <FormLabel>Guru Pengajar</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih guru" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {teachers.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <DialogFooter className="pt-4 justify-between">
              <Button type="button" size="xs" variant="destructive" onClick={handleClear}>Kosongkan</Button>
              <Button type="submit" size="xs">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
