
"use client";

import { useEffect, useState } from "react";
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
import { Camera, Save, X, Loader2 } from "lucide-react";

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
  noWa: z.string().optional(),
  avatarUrl: z.string().optional().or(z.literal("")),
  kelas: z.coerce.number().min(0).max(6).optional(),
});

type StudentFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  student: Student | null;
  onSave: (student: any) => void;
};

export function StudentForm({ isOpen, setIsOpen, student, onSave }: StudentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nis: "", name: "", password: "", nik: "", gender: "Laki-laki", 
      tempatLahir: "", dateOfBirth: "", namaAyah: "", namaIbu: "", 
      address: "", noWa: "", avatarUrl: "", kelas: 0
    },
  });
  
  useEffect(() => {
    if (isOpen) {
        if (student) {
          form.reset({
            ...student,
            password: "",
            avatarUrl: student.avatarUrl || "",
          });
        } else {
          form.reset({
            nis: "", name: "", password: "", nik: "", gender: "Laki-laki", 
            tempatLahir: "", dateOfBirth: "", namaAyah: "", namaIbu: "", 
            address: "", noWa: "", avatarUrl: "", kelas: 0
          });
        }
    }
  }, [student, form, isOpen]);
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsProcessing(true);
    const studentData = { ...values };
    
    if (!studentData.password) {
        delete (studentData as any).password;
    }
    
    try {
      await onSave(studentData);
      setIsOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
              <DialogHeader className="sr-only">
                <DialogTitle>{student ? "Edit Profil Santri" : "Tambah Santri Baru"}</DialogTitle>
                <DialogDescription>Masukkan informasi identitas santri madrasah.</DialogDescription>
              </DialogHeader>
              
              <div className="relative mb-4">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-xl scale-110">
                      <AvatarImage src={form.watch('avatarUrl')} className="object-cover" />
                      <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
                        {form.watch('name') ? form.watch('name').charAt(0) : <Camera className="h-8 w-8 opacity-20" />}
                      </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform flex items-center justify-center">
                      <Camera className="h-3.5 w-3.5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    const img = new Image();
                                    img.src = event.target?.result as string;
                                    img.onload = () => {
                                        const canvas = document.createElement('canvas');
                                        const MAX_WIDTH = 512;
                                        const scale = MAX_WIDTH / img.width;
                                        canvas.width = MAX_WIDTH;
                                        canvas.height = img.height * scale;
                                        const ctx = canvas.getContext('2d');
                                        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                                        form.setValue('avatarUrl', canvas.toDataURL('image/jpeg', 0.8));
                                    };
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                      />
                  </label>
              </div>

              <div className="w-full space-y-1 mt-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                    {student ? "Pembaruan Profil Santri" : "Registrasi Santri Baru"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</p>
              </div>
            </div>

            <div className="px-6 py-2">
              <ScrollArea className="h-[350px] pr-2">
                  <div className="space-y-4 py-4">
                    <FormField control={form.control} name="nis" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">NIS (Nomor Induk Siswa)</FormLabel>
                        <FormControl><Input {...field} disabled={!!student} className="bg-white h-9" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nama Lengkap</FormLabel>
                        <FormControl><Input {...field} className="bg-white h-9 uppercase font-semibold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="kelas" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Kelas</FormLabel>
                        <Select onValueChange={field.onChange} value={String(field.value)}>
                          <FormControl><SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger></FormControl>
                          <SelectContent>{[...Array(7).keys()].map(i => <SelectItem key={i} value={String(i)} className="text-xs">Kelas {i}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Jenis Kelamin</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-9 text-xs bg-white"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="Laki-laki" className="text-xs">Laki-laki</SelectItem><SelectItem value="Perempuan" className="text-xs">Perempuan</SelectItem></SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="tempatLahir" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Tempat Lahir</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Tanggal Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="namaAyah" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nama Ayah</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="namaIbu" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nama Ibu</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="noWa" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">WhatsApp Wali</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Alamat Domisili</FormLabel><FormControl><Textarea {...field} value={field.value || ""} className="bg-white min-h-[80px]" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Password Portal</FormLabel>
                        <FormControl><Input type="password" {...field} value={field.value || ""} placeholder="Min. 6 karakter" className="bg-white h-9" /></FormControl>
                        <FormDescription className="text-[9px]">Password ini digunakan wali untuk login dengan NIS.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
              </ScrollArea>
            </div>

            <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3 mt-2">
                <Button type="button" variant="ghost" className="rounded-full px-6 text-xs font-bold uppercase tracking-widest h-10" onClick={() => setIsOpen(false)} disabled={isProcessing}>
                  <X className="h-3.5 w-3.5 mr-2" /> Batal
                </Button>
                <Button type="submit" className="h-10 rounded-full px-8 bg-accent text-primary hover:bg-accent/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                  Simpan Santri
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
