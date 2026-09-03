
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Save, UserCircle } from "lucide-react";
import type { Alumni } from "@/types";

const formSchema = z.object({
  nis: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "Nama harus diisi"),
  tahunLulus: z.string().min(1, "Tahun lulus harus diisi"),
  address: z.string().optional(),
  noWa: z.string().optional(),
});

type AlumniFormData = z.infer<typeof formSchema>;

type AlumniFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  alumnus: Alumni | null;
  onSave: (data: Omit<Alumni, 'id'>) => void;
};

const defaultValues: AlumniFormData = {
    nis: "",
    name: "",
    tahunLulus: "",
    address: "",
    noWa: "",
}

export function AlumniForm({ isOpen, setIsOpen, alumnus, onSave }: AlumniFormProps) {
  const form = useForm<AlumniFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    if (isOpen) {
        if (alumnus) {
          form.reset({
            ...alumnus,
            nis: alumnus.nis || "",
            address: alumnus.address || "",
            noWa: alumnus.noWa || "",
          });
        } else {
          form.reset(defaultValues);
        }
    }
  }, [alumnus, form, isOpen]);
  
  const onSubmit = (values: AlumniFormData) => {
    onSave(values as Omit<Alumni, 'id'>);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
              <DialogHeader className="sr-only">
                <DialogTitle>{alumnus ? "Edit Alumni" : "Tambah Alumni"}</DialogTitle>
                <DialogDescription>Masukkan informasi data alumni madrasah.</DialogDescription>
              </DialogHeader>
              
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <UserCircle className="h-8 w-8 text-primary" />
              </div>

              <div className="w-full space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                    {alumnus ? "Pembaruan Data Alumni" : "Tambah Data Alumni"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</p>
              </div>
            </div>

            <div className="px-6 py-2">
              <ScrollArea className="h-[350px] pr-2">
                <div className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="nis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">NIS (Opsional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Kosongkan jika belum ada" className="bg-white h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nama Lengkap</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-white h-9 uppercase font-semibold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tahunLulus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Tahun Lulus</FormLabel>
                          <FormControl>
                            <Input placeholder="Contoh: 2023/2024" {...field} className="bg-white h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Alamat</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value ?? ""} className="bg-white min-h-[80px]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="noWa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">No. WhatsApp</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} value={field.value ?? ""} className="bg-white h-9" />
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
                  <Save className="h-3.5 w-3.5 mr-2" /> Simpan Alumni
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
