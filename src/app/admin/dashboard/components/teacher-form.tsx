
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
  FormDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  nig: z.string().min(1, "NIG harus diisi"),
  name: z.string().min(1, "Nama harus diisi"),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "Password minimal 6 karakter jika diisi.",
  }),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
  avatar: z.any().optional(),
  dokumenUrl: z.string().optional().or(z.literal("")),
  jabatan: z.string().optional(),
  noWa: z.string().optional(),
  nik: z.string().optional(),
  pendidikan: z.string().optional(),
  ponpes: z.string().optional(),
  alamat: z.string().optional(),
  dokumen: z.any().optional(),
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
  onSave: (teacher: Omit<Teacher, 'id'> & { id?: string }) => void;
};

export function TeacherForm({ isOpen, setIsOpen, teacher, onSave }: TeacherFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nig: "", name: "", email: "", password: "", avatarUrl: "", jabatan: "", noWa: "", nik: "",
      pendidikan: "", ponpes: "", alamat: "", dokumenUrl: "",
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      if (teacher) {
        form.reset({
          nig: teacher.nig || "",
          name: teacher.name,
          email: teacher.email || "",
          password: "", // Do not pre-fill existing password
          avatarUrl: teacher.avatarUrl || "",
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
          nig: "", name: "", email: "", password: "", avatarUrl: "", jabatan: "", noWa: "", nik: "",
          pendidikan: "", ponpes: "", alamat: "", dokumenUrl: "",
        });
      }
    }
  }, [teacher, form, isOpen]);
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const { dokumen, avatar, ...teacherData } = values;

    // Only include password if it's not an empty string
    if (!teacherData.password) {
        delete (teacherData as Partial<typeof teacherData>).password;
    }

    onSave({
      id: teacher?.id,
      ...teacherData,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{teacher ? "Edit Guru" : "Tambah Guru"}</DialogTitle>
          <DialogDescription>
            {teacher ? "Ubah detail guru di bawah ini." : "Isi detail guru baru di bawah ini."}
          </DialogDescription>
        </DialogHeader>
        {teacher && (
          <div className="flex justify-center pt-2">
            <Avatar className="h-16 w-16">
              <AvatarImage src={form.watch('avatarUrl') || teacher.avatarUrl || undefined} alt={teacher.name} />
              <AvatarFallback className="text-xl">{teacher.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-80 pr-6">
              <div className="space-y-3 py-4">
                <FormField control={form.control} name="nig" render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIG (Nomor Induk Guru)</FormLabel>
                    <FormControl><Input {...field} placeholder="Contoh: MDIAGURU001" /></FormControl>
                    <FormDescription>Digunakan untuk ID Login.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Login</FormLabel>
                    <FormControl><Input type="password" placeholder="Isi untuk membuat/mengubah" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Minimal 6 karakter.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Avatar</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    const img = new Image();
                                    const imageUrl = event.target?.result as string;
                                    img.src = imageUrl;
                                    img.onload = () => {
                                        const canvas = document.createElement('canvas');
                                        const MAX_WIDTH = 512;
                                        
                                        if (img.width <= MAX_WIDTH) {
                                            form.setValue('avatarUrl', imageUrl);
                                            return;
                                        }

                                        const scale = MAX_WIDTH / img.width;
                                        canvas.width = MAX_WIDTH;
                                        canvas.height = img.height * scale;
                                        const ctx = canvas.getContext('2d');
                                        if (ctx) {
                                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                            form.setValue('avatarUrl', dataUrl);
                                        } else {
                                            form.setValue('avatarUrl', imageUrl);
                                        }
                                    };
                                    img.onerror = () => {
                                        form.setValue('avatarUrl', imageUrl);
                                    };
                                };
                                reader.readAsDataURL(file);
                            }
                            field.onChange(file ?? null);
                          }}
                        />
                      </FormControl>
                       <FormDescription>
                          Unggah gambar. Ukuran akan dioptimalkan.
                        </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Opsional)</FormLabel>
                    <FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl>
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
                    <FormControl><Input type="tel" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nik" render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIK</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pendidikan" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pendidikan</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ponpes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latar Belakang Ponpes</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="alamat" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat</FormLabel>
                    <FormControl><Textarea className="h-24" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="dokumen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Dokumen</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                form.setValue('dokumenUrl', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                            field.onChange(file ?? null)
                          }} 
                        />
                      </FormControl>
                      <FormDescription>
                          Unggah file seperti PDF, DOCX, atau gambar.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="submit" size="xs">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
