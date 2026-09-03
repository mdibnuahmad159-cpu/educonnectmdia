
"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { PlusCircle, Trash2, Clock, X, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const periodSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Format jam tidak valid (JJ:MM)" }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Format jam tidak valid (JJ:MM)" }),
});

const formSchema = z.object({
  periods: z.array(periodSchema),
});

type TimeSettingsFormData = z.infer<typeof formSchema>;

type TimeSettingsFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialPeriods: { startTime: string; endTime: string }[];
  onSave: (periods: { startTime: string; endTime: string }[]) => void;
};

export function TimeSettingsForm({
  isOpen,
  setIsOpen,
  initialPeriods,
  onSave,
}: TimeSettingsFormProps) {
  const form = useForm<TimeSettingsFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      periods: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "periods",
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ periods: initialPeriods });
    }
  }, [isOpen, initialPeriods, form]);

  const onSubmit = (values: TimeSettingsFormData) => {
    const sortedPeriods = [...values.periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
    onSave(sortedPeriods);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                <DialogHeader className="sr-only">
                    <DialogTitle>Atur Jam Pelajaran</DialogTitle>
                    <DialogDescription>Pengaturan durasi waktu per jam pelajaran.</DialogDescription>
                </DialogHeader>

                <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Clock className="h-8 w-8 text-primary" />
                </div>

                <div className="w-full space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                        Pengaturan Waktu Belajar
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Berlaku untuk semua kelas</p>
                </div>
            </div>

            <div className="px-6 py-2">
                <ScrollArea className="h-[300px] pr-2">
                    <div className="space-y-4 py-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-end gap-2 p-3 rounded-2xl bg-muted/20 border">
                                <div className="grid grid-cols-2 gap-2 flex-1">
                                    <FormField
                                        control={form.control}
                                        name={`periods.${index}.startTime`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Mulai (Jam {index + 1})</FormLabel>
                                            <FormControl>
                                            <Input type="time" {...field} className="bg-white h-9" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`periods.${index}.endTime`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Selesai</FormLabel>
                                            <FormControl>
                                            <Input type="time" {...field} className="bg-white h-9" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-destructive rounded-full hover:bg-destructive/10"
                                    onClick={() => remove(index)}
                                    disabled={fields.length <= 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 rounded-xl h-10 border-dashed border-2 hover:bg-primary/5 hover:text-primary transition-all"
                            onClick={() => append({ startTime: "00:00", endTime: "00:00" })}
                        >
                            <PlusCircle className="h-4 w-4" />
                            Tambah Slot Waktu
                        </Button>
                    </div>
                </ScrollArea>
            </div>

            <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3 mt-2">
                <Button type="button" variant="ghost" className="rounded-full px-6 text-xs font-bold uppercase tracking-widest h-10" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5 mr-2" /> Batal
                </Button>
                <Button type="submit" className="h-10 rounded-full px-8 bg-accent text-primary hover:bg-accent/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20">
                  <Save className="h-3.5 w-3.5 mr-2" /> Simpan Perubahan
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
