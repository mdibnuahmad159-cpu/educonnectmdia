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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Student } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  nis: z.string().min(1, "NIS harus diisi"),
  name: z.string().min(1, "Nama harus diisi"),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "Password minimal 6 karakter jika diisi.",
  }),
  nik: z.string().optional(),
  gender: z.enum(["Laki-laki", "Perempuan"], { required_error: "Jenis kelamin harus dipilih" }),
  tempatLahir: z.string().optional(),
  dateOfBirth: z.string().min(1, "Tanggal lahir harus diisi"),
  namaAyah: z.string().optional(),
  namaIbu: z.string().optional(),
  address: z.string().min(1, "Alamat harus diisi"),
  avatarUrl: z.string().optional().or(z.literal("")),
  avatar: z.any().optional(),
  dokumenUrl: z.string().optional().or(z.literal("")),
  dokumen: z.any().optional(),
});

type StudentFormData = z.infer<typeof formSchema>;

type StudentFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  student: Student | null;
  onSave: (student: any) => void;
};

const defaultValues = {
    nis: "",
    name: "",
    password: "",
    nik: "",
    gender: "Laki-laki" as "Laki-laki" | "Perempuan",
    tempatLahir: "",
    dateOfBirth: "",
    namaAyah: "",
    namaIbu: "",
    address: "",
    avatarUrl: "",
    dokumenUrl: "",
}

export function StudentForm({ isOpen, setIsOpen, student, onSave }: StudentFormProps) {
  const form = useForm<StudentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    if (isOpen) {
        if (student) {
          form.reset({
            ...student,
            password: "", // Do not pre-fill existing password
            nik: student.nik || "",
            tempatLahir: student.tempatLahir || "",
            namaAyah: student.namaAyah || "",
            namaIbu: student.namaIbu || "",
            avatarUrl: student.avatarUrl || "",
            dokumenUrl: student.dokumenUrl || "",
          });
        } else {
          form.reset(defaultValues);
        }
    }
  }, [student, form, isOpen]);
  
  const onSubmit = (values: StudentFormData) => {
    const { avatar, dokumen, ...studentData } = values;
    
    // Only include password if it's not an empty string
    if (!studentData.password) {
        delete (studentData as Partial<typeof studentData>).password;
    }
    
    onSave(studentData);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{student ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
          <DialogDescription>
            {student ? "Ubah detail siswa di bawah ini." : "Isi detail siswa baru di bawah ini."}
          </DialogDescription>
        </DialogHeader>
        {student && (
          <div className="flex justify-center pt-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={form.watch('avatarUrl') || student.avatarUrl || undefined} alt={student.name} className="object-cover" />
              <AvatarFallback className="text-2xl">{student.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[65vh] pr-6">
              <div className="space-y-3 py-4">
                <FormField
                  control={form.control}
                  name="nis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIS</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!!student}/>
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Wali Murid</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Isi untuk membuat/mengubah" {...field} value={field.value ?? ""} />
                      </FormControl>
                       <FormDescription>
                          Password ini digunakan wali murid untuk login dengan NIS.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          Unggah foto siswa. Ukuran akan dioptimalkan.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="nik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIK</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Kelamin</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis kelamin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                          <SelectItem value="Perempuan">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tempatLahir"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempat Lahir</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Lahir</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: 11-05-2000" {...field} />
                      </FormControl>
                      <FormDescription>
                        Masukkan tanggal dengan format DD-MM-YYYY.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="namaAyah"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Ayah</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="namaIbu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Ibu</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
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
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="dokumen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload File</FormLabel>
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
                          Unggah berkas seperti Akta, KK, dll.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
