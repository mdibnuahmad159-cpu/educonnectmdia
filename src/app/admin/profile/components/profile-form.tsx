"use client";

import { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import type { SchoolProfile } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageIcon, Calendar } from "lucide-react";
import { AcademicYearSelector } from "@/components/shared/academic-year-selector";

const formSchema = z.object({
  namaYayasan: z.string().optional(),
  namaMadrasah: z.string().optional(),
  nsdt: z.string().optional(),
  alamat: z.string().optional(),
  logoYayasanUrl: z.string().optional().or(z.literal("")),
  logoMadrasahUrl: z.string().optional().or(z.literal("")),
  kopSuratUrl: z.string().optional().or(z.literal("")),
  logoYayasanFile: z.any().optional(),
  logoMadrasahFile: z.any().optional(),
  kopSuratFile: z.any().optional(),
});

type ProfileFormData = z.infer<typeof formSchema>;

type ProfileFormProps = {
  profile: SchoolProfile | null;
  onSave: (data: Partial<Omit<SchoolProfile, 'id'>>) => void;
};

const defaultValues = {
  namaYayasan: "",
  namaMadrasah: "",
  nsdt: "",
  alamat: "",
  logoYayasanUrl: "",
  logoMadrasahUrl: "",
  kopSuratUrl: "",
};

export function ProfileForm({ profile, onSave }: ProfileFormProps) {
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: profile || defaultValues,
  });

  useEffect(() => {
    if (profile) {
      form.reset(profile);
    }
  }, [profile, form]);

  const compressAndSetImage = (file: File, fieldName: 'logoYayasanUrl' | 'logoMadrasahUrl' | 'kopSuratUrl') => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      const imageUrl = event.target?.result as string;
      img.src = imageUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = fieldName === 'kopSuratUrl' ? 1200 : 400;
        
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          form.setValue(fieldName, dataUrl);
        } else {
          form.setValue(fieldName, imageUrl);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = useCallback((values: ProfileFormData) => {
    const { logoYayasanFile, logoMadrasahFile, kopSuratFile, ...dataToSave } = values;
    onSave(dataToSave);
  }, [onSave]);

  // Listen for global save-profile event from layout header
  useEffect(() => {
    const handleGlobalSave = () => {
      form.handleSubmit(onSubmit)();
    };
    window.addEventListener('save-profile', handleGlobalSave);
    return () => window.removeEventListener('save-profile', handleGlobalSave);
  }, [form, onSubmit]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[calc(100vh-14rem)] pr-4">
            <div className="space-y-6 pb-10">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="namaYayasan" render={({ field }) => ( <FormItem> <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Nama Yayasan</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} className="bg-white" /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="namaMadrasah" render={({ field }) => ( <FormItem> <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Nama Madrasah</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} className="bg-white" /></FormControl> <FormMessage /> </FormItem> )}/>
                </div>
                <FormField control={form.control} name="nsdt" render={({ field }) => ( <FormItem> <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">NSDT (Nomor Statistik)</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} className="bg-white" /></FormControl> <FormMessage /> </FormItem> )}/>
                
                <div className="p-4 rounded-xl border bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Tahun Ajaran Aktif</span>
                  </div>
                  <AcademicYearSelector />
                  <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                    Mengubah tahun ajaran di sini akan mengubah periode aktif untuk seluruh sistem (jadwal, nilai, SPP).
                  </p>
                </div>

                <FormField control={form.control} name="alamat" render={({ field }) => ( <FormItem> <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Alamat Lengkap</FormLabel> <FormControl><Textarea {...field} value={field.value ?? ""} className="bg-white" /></FormControl> <FormMessage /> </FormItem> )}/>
                
                <div className="grid gap-6 py-4 border-y">
                    <FormField
                    control={form.control}
                    name="logoYayasanFile"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Logo Yayasan</FormLabel>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 rounded-md border bg-muted/20">
                            <AvatarImage src={form.watch('logoYayasanUrl') || undefined} className="object-contain" />
                            <AvatarFallback className="rounded-md"><ImageIcon className="h-6 w-6 text-muted-foreground/40" /></AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                            <FormControl>
                                <Input
                                type="file"
                                accept="image/*"
                                className="h-9 bg-white"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) compressAndSetImage(file, 'logoYayasanUrl');
                                    field.onChange(file ?? null);
                                }}
                                />
                            </FormControl>
                            </div>
                        </div>
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="logoMadrasahFile"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Logo Madrasah</FormLabel>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 rounded-md border bg-muted/20">
                            <AvatarImage src={form.watch('logoMadrasahUrl') || undefined} className="object-contain" />
                            <AvatarFallback className="rounded-md"><ImageIcon className="h-6 w-6 text-muted-foreground/40" /></AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                            <FormControl>
                                <Input
                                type="file"
                                accept="image/*"
                                className="h-9 bg-white"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) compressAndSetImage(file, 'logoMadrasahUrl');
                                    field.onChange(file ?? null);
                                }}
                                />
                            </FormControl>
                            </div>
                        </div>
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="kopSuratFile"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Gambar Kop Surat</FormLabel>
                        <div className="space-y-3">
                            {form.watch('kopSuratUrl') && (
                                <div className="relative w-full aspect-[4/1] rounded-md border bg-muted/10 overflow-hidden">
                                    <img 
                                        src={form.watch('kopSuratUrl')!} 
                                        alt="Preview Kop Surat" 
                                        className="w-full h-full object-contain"
                                    />
                                    <button 
                                        type="button" 
                                        className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full"
                                        onClick={() => form.setValue('kopSuratUrl', '')}
                                    >
                                        <ImageIcon className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            <FormControl>
                                <Input
                                type="file"
                                accept="image/*"
                                className="h-9 bg-white"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) compressAndSetImage(file, 'kopSuratUrl');
                                    field.onChange(file ?? null);
                                }}
                                />
                            </FormControl>
                        </div>
                        </FormItem>
                    )}
                    />
                </div>
            </div>
        </ScrollArea>
      </form>
    </Form>
  );
}
