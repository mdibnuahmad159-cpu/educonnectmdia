
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
import { PlusCircle, Trash2 } from "lucide-react";
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atur Jam Pelajaran</DialogTitle>
          <DialogDescription>
            Atur waktu mulai dan selesai untuk setiap jam pelajaran. Perubahan ini akan berlaku untuk semua kelas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-4 py-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <FormField
                        control={form.control}
                        name={`periods.${index}.startTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mulai (Jam {index + 1})</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
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
                            <FormLabel>Selesai (Jam {index + 1})</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
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
                      className="h-9 w-9 text-destructive"
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
                  className="w-full gap-2 mt-2"
                  onClick={() => append({ startTime: "00:00", endTime: "00:00" })}
                >
                  <PlusCircle className="h-4 w-4" />
                  Tambah Jam
                </Button>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="submit">Simpan Jam</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
