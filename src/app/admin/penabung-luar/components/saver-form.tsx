
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WalletCards, X, Save } from "lucide-react";
import type { ExternalSaver } from "@/types";

const formSchema = z.object({
  nip: z.string().min(1, "NIP harus diisi"),
  name: z.string().min(1, "Nama harus diisi"),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "Password minimal 6 karakter jika diisi.",
  }),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type SaverFormData = z.infer<typeof formSchema>;

type SaverFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  saver: ExternalSaver | null;
  onSave: (data: SaverFormData) => void;
};

const defaultValues: SaverFormData = {
    nip: "",
    name: "",
    password: "",
    phoneNumber: "",
    address: "",
    notes: "",
}

export function SaverForm({ isOpen, setIsOpen, saver, onSave }: SaverFormProps) {
  const form = useForm<SaverFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    if (isOpen) {
        if (saver) {
          form.reset({
              ...saver,
              password: "",
              nip: saver.nip || "",
              phoneNumber: saver.phoneNumber || "",
              address: saver.address || "",
              notes: saver.notes || "",
          });
        } else {
          form.reset(defaultValues);
        }
    }
  }, [saver, form, isOpen]);
  
  const onSubmit = (values: SaverFormData) => {
    const data = { ...values };
    if (!data.password) delete data.password;
    onSave(data);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                <DialogHeader className="sr-only">
                    <DialogTitle>{saver ? "Edit Penabung" : "Tambah Penabung"}</DialogTitle>
                    <DialogDescription>Registrasi penabung umum luar internal madrasah.</DialogDescription>
                </DialogHeader>

                <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <WalletCards className="h-8 w-8 text-primary" />
                </div>

                <div className="w-full space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                        {saver ? "Pembaruan Data Penabung" : "Registrasi Penabung Baru"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</p>
                </div>
            </div>

            <div className="px-6 py-2">
                <ScrollArea className="h-[350px] pr-2">
                    <div className="space-y-4 py-4">
                        <FormField
                          control={form.control}
                          name="nip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">NIP (ID Login Penabung)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Contoh: PL001" className="bg-white h-9 font-mono" />
                              </FormControl>
                              <FormDescription className="text-[9px]">Gunakan NIP ini untuk login portal penabung.</FormDescription>
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
                                <Input {...field} placeholder="Masukkan nama..." className="bg-white h-9 uppercase font-semibold" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Password Akses</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} value={field.value ?? ""} placeholder="Min. 6 karakter" className="bg-white h-9" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">No. WhatsApp</FormLabel>
                              <FormControl>
                                <Input type="tel" {...field} value={field.value ?? ""} placeholder="08..." className="bg-white h-9" />
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
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Alamat Lengkap</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value ?? ""} placeholder="Masukkan alamat..." className="bg-white min-h-[80px]" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Catatan (Opsional)</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} placeholder="Misal: Wali santri" className="bg-white h-9" />
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
                  <Save className="h-3.5 w-3.5 mr-2" /> Simpan Penabung
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
