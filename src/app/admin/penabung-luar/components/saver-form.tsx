
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
              password: "", // Security: don't reset password
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{saver ? "Edit Penabung" : "Tambah Penabung"}</DialogTitle>
          <DialogDescription>
            Isi detail data penabung luar (non-siswa/guru). NIP digunakan untuk login.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="nip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIP (Nomor Induk Penabung)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contoh: PL001" />
                      </FormControl>
                      <FormDescription>Digunakan sebagai ID Login penabung.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Masukkan nama" />
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
                      <FormLabel>Password Login</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} value={field.value ?? ""} placeholder="Kosongkan jika tidak diubah" />
                      </FormControl>
                      <FormDescription>Minimal 6 karakter.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. HP / WA</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} value={field.value ?? ""} placeholder="08..." />
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
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} placeholder="Masukkan alamat" />
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
                      <FormLabel>Catatan (Opsional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="Contoh: Orang tua alumni" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit">Simpan Data</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
