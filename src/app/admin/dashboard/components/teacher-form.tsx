
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
import type { Teacher } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().optional(),
  jabatan: z.string().optional(),
  noWa: z.string().optional(),
  nik: z.string().optional(),
  pendidikan: z.string().optional(),
  ponpes: z.string().optional(),
  alamat: z.string().optional(),
  dokumenUrl: z.string().url("URL tidak valid").optional().or(z.literal('')),
});

const jabatanOptions = [
  "Pengasuh",
  "Pengawas",
  "Kepala Madrasah",
  "Wakil Kepala Madrasah",
  "Sekretaris",
  "Bendahara",
  ...Array.from({ length: 7 }, (_, i) => `Wali Kelas ${i}`),
  "Guru",
];

type TeacherFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  teacher: Teacher | null;
  onSave: (teacher: Omit<Teacher, 'id'> & { password?: string, id?: string }) => void;
};

export function TeacherForm({ isOpen, setIsOpen, teacher, onSave }: TeacherFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema.refine(data => !!teacher || !!data.password, {
        message: "Password minimal 6 karakter untuk guru baru",
        path: ["password"],
    }).refine(data => !data.password || data.password.length >= 6, {
        message: "Password minimal 6 karakter",
        path: ["password"],
    })),
    defaultValues: {
      name: "", email: "", password: "", jabatan: "", noWa: "", nik: "",
      pendidikan: "", ponpes: "", alamat: "", dokumenUrl: "",
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      if (teacher) {
        form.reset({
          name: teacher.name,
          email: teacher.email,
          password: "",
          jabatan: teacher.jabatan || "",
          noWa: teacher.noWa || "",
          nik: teacher.nik || "",
          pendidikan: teacher.pendidikan || "",
          ponpes: teacher.ponpes || "",
          alamat: teacher.alamat || "",
          dokumenUrl: teacher.dokumenUrl || "",
        });
      } else {
        form.reset({
          name: "", email: "", password: "", jabatan: "", noWa: "", nik: "",
          pendidikan: "", ponpes: "", alamat: "", dokumenUrl: "",
        });
      }
    }
  }, [teacher, form, isOpen]);
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave({
      id: teacher?.id,
      ...values,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{teacher ? "Edit Guru" : "Tambah Guru"}</DialogTitle>
          <DialogDescription>
            {teacher ? "Ubah detail guru di bawah ini." : "Isi detail guru baru di bawah ini."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-96 pr-6">
              <div className="space-y-3 py-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} disabled={!!teacher} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" placeholder={teacher ? 'Isi untuk mengubah' : 'Wajib diisi'} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="jabatan" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jabatan</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value || ''} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih jabatan" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {jabatanOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                            {option}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="noWa" render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. WA</FormLabel>
                    <FormControl><Input type="tel" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nik" render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIK</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pendidikan" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pendidikan</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ponpes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latar Belakang Ponpes</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="alamat" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat</FormLabel>
                    <FormControl><Textarea className="h-24" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dokumenUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Dokumen</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="submit" size="sm">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
