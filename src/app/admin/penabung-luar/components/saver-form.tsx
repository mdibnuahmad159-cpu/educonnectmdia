
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
import type { ExternalSaver } from "@/types";

const formSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
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
    name: "",
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
          form.reset(saver);
        } else {
          form.reset(defaultValues);
        }
    }
  }, [saver, form, isOpen]);
  
  const onSubmit = (values: SaverFormData) => {
    onSave(values);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{saver ? "Edit Penabung" : "Tambah Penabung"}</DialogTitle>
          <DialogDescription>
            Isi detail data penabung luar (non-siswa/guru).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
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
