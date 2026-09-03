
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, X, Save } from "lucide-react";
import type { Curriculum } from "@/types";

const formSchema = z.object({
  subjectCode: z.string().min(1, "Kode Mapel harus diisi"),
  subjectName: z.string().min(1, "Nama Mapel harus diisi"),
  classLevel: z.coerce.number({invalid_type_error: "Kelas harus dipilih"}).min(0, "Kelas harus dipilih"),
  bookName: z.string().optional(),
});

type CurriculumFormData = z.infer<typeof formSchema>;

type CurriculumFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  curriculum: Curriculum | null;
  onSave: (data: CurriculumFormData) => void;
};

const defaultValues: CurriculumFormData = {
    subjectCode: "",
    subjectName: "",
    classLevel: 0,
    bookName: "",
}

export function CurriculumForm({ isOpen, setIsOpen, curriculum, onSave }: CurriculumFormProps) {
  const form = useForm<CurriculumFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    if (isOpen) {
        if (curriculum) {
          form.reset(curriculum);
        } else {
          form.reset(defaultValues);
        }
    }
  }, [curriculum, form, isOpen]);
  
  const onSubmit = (values: CurriculumFormData) => {
    onSave(values);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                <DialogHeader className="sr-only">
                    <DialogTitle>{curriculum ? "Edit Mapel" : "Tambah Mapel"}</DialogTitle>
                    <DialogDescription>Masukkan informasi mata pelajaran kurikulum.</DialogDescription>
                </DialogHeader>

                <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <BookOpen className="h-8 w-8 text-primary" />
                </div>

                <div className="w-full space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                        {curriculum ? "Pembaruan Mata Pelajaran" : "Tambah Mata Pelajaran"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</p>
                </div>
            </div>

            <div className="px-6 py-2">
                <ScrollArea className="h-[320px] pr-2">
                    <div className="space-y-4 py-4">
                        <FormField
                          control={form.control}
                          name="subjectCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Kode Mata Pelajaran</FormLabel>
                              <FormControl>
                                <Input placeholder="Contoh: FIQH1" {...field} className="bg-white h-9 font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="subjectName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nama Mata Pelajaran</FormLabel>
                              <FormControl>
                                <Input placeholder="Contoh: Fiqih" {...field} className="bg-white h-9 uppercase font-semibold" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="classLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Level Kelas</FormLabel>
                              <Select onValueChange={field.onChange} value={String(field.value)}>
                                <FormControl>
                                  <SelectTrigger className="bg-white h-9 text-xs">
                                    <SelectValue placeholder="Pilih kelas" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {[...Array(7).keys()].map(i => (
                                        <SelectItem key={i} value={String(i)} className="text-xs">Kelas {i === 0 ? 'Sifir' : i}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bookName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nama Kitab (Opsional)</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} className="bg-white h-9" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                </ScrollArea>
            </div>

            <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3 mt-2">
                <Button type="button" variant="ghost" className="rounded-full px-6 text-xs font-bold uppercase tracking-widest h-10" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5 mr-2" /> Batal
                </Button>
                <Button type="submit" className="h-10 rounded-full px-8 bg-accent text-primary hover:bg-accent/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20">
                  <Save className="h-3.5 w-3.5 mr-2" /> Simpan Mapel
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
