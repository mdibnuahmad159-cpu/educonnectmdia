
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScheduleEntry, Teacher, Curriculum } from "@/types";

const formSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam tidak valid (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam tidak valid (HH:MM)"),
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
  onSave: (slot: EditingSlot, data: ScheduleEntry) => void;
  subjects: Curriculum[];
  teachers: Teacher[];
};

const defaultValues: ScheduleEntryFormData = {
    startTime: "00:00",
    endTime: "00:00",
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
            startTime: editingSlot.entry.startTime,
            endTime: editingSlot.entry.endTime,
            subjectId: editingSlot.entry.subjectId || "",
            teacherId: editingSlot.entry.teacherId || "",
        });
    }
  }, [editingSlot, form]);
  
  const onSubmit = (values: ScheduleEntryFormData) => {
    if (!editingSlot) return;

    const updatedEntry: ScheduleEntry = {
        ...editingSlot.entry,
        startTime: values.startTime,
        endTime: values.endTime,
        subjectId: values.subjectId || undefined,
        teacherId: values.teacherId || undefined,
    };
    onSave(editingSlot, updatedEntry);
  };
  
  const handleClear = () => {
    if (!editingSlot) return;
    const clearedEntry: ScheduleEntry = {
        type: 'subject',
        startTime: editingSlot.entry.startTime,
        endTime: editingSlot.entry.endTime,
    };
    onSave(editingSlot, clearedEntry);
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
                <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mulai</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selesai</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
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
