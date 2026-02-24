
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
import type { Alumni } from "@/types";

const formSchema = z.object({
  nis: z.string().min(1, "NIS harus diisi"),
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
          form.reset(alumnus);
        } else {
          form.reset(defaultValues);
        }
    }
  }, [alumnus, form, isOpen]);
  
  const onSubmit = (values: AlumniFormData) => {
    onSave(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{alumnus ? "Edit Alumni" : "Tambah Alumni"}</DialogTitle>
          <DialogDescription>
            {alumnus ? "Ubah detail data alumni." : "Isi detail data alumni baru."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="nis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIS</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!!alumnus} />
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
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Tahun Lulus</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: 2023/2024" {...field} />
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
                      <FormLabel>Alamat (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} />
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
                      <FormLabel>No. WA (Opsional)</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
