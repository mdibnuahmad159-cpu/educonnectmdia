
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
import { Camera, Save, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [isProcessing, setIsProcessing] = useState(false);
  
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
          ...teacher,
          password: "", 
          avatarUrl: teacher.avatarUrl || "",
        });
      } else {
        form.reset({
          nig: "", name: "", email: "", password: "", avatarUrl: "", jabatan: "", noWa: "", nik: "",
          pendidikan: "", ponpes: "", alamat: "", dokumenUrl: "",
        });
      }
    }
  }, [teacher, form, isOpen]);
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsProcessing(true);
    const { dokumen, avatar, ...teacherData } = values;

    if (!teacherData.password) {
        delete (teacherData as any).password;
    }

    try {
      await onSave({
        id: teacher?.id,
        ...teacherData,
      });
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
                <DialogTitle>{teacher ? "Edit Guru" : "Tambah Guru Baru"}</DialogTitle>
                <DialogDescription>Masukkan informasi data guru madrasah.</DialogDescription>
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
                    {teacher ? "Pembaruan Data Guru" : "Registrasi Guru Baru"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</p>
              </div>
            </div>

            <div className="px-6 py-2">
              <ScrollArea className="h-[350px] pr-2">
                  <div className="space-y-4 py-4">
                    <FormField control={form.control} name="nig" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">NIG (Nomor Induk Guru)</FormLabel>
                        <FormControl><Input {...field} placeholder="Gunakan untuk ID Login" className="bg-white h-9" /></FormControl>
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
                    <FormField control={form.control} name="jabatan" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Jabatan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl><SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger></FormControl>
                            <SelectContent>{jabatanOptions.map(opt => <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={form.control} name="nik" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">NIK (KTP)</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="noWa" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">No. WhatsApp</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="pendidikan" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Pendidikan Terakhir</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="ponpes" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Latar Belakang Pondok</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="alamat" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Alamat Lengkap</FormLabel><FormControl><Textarea {...field} value={field.value || ""} className="bg-white min-h-[80px]" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Password Login</FormLabel>
                        <FormControl><Input type="password" {...field} value={field.value || ""} placeholder="Min. 6 karakter" className="bg-white h-9" /></FormControl>
                        <FormDescription className="text-[9px]">Akan digunakan untuk login ke portal guru.</FormDescription>
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
                  Simpan Data
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
