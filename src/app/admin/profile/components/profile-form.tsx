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
import { ImageIcon, Calendar, School, Shield, MapPin, UploadCloud } from "lucide-react";
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

  useEffect(() => {
    const handleGlobalSave = () => {
      form.handleSubmit(onSubmit)();
    };
    window.addEventListener('save-profile', handleGlobalSave);
    return () => window.removeEventListener('save-profile', handleGlobalSave);
  }, [form, onSubmit]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
            <div className="space-y-10 pb-10">
                {/* Section 1: Identity */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary/60 mb-2">
                    <School className="h-4 w-4" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Identitas Lembaga</h3>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 bg-muted/20 p-6 rounded-[24px] border border-muted/50">
                      <FormField control={form.control} name="namaYayasan" render={({ field }) => ( 
                        <FormItem> 
                          <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Nama Yayasan</FormLabel> 
                          <FormControl><Input {...field} value={field.value ?? ""} className="bg-white rounded-xl h-10" placeholder="Masukkan nama yayasan..." /></FormControl> 
                          <FormMessage /> 
                        </FormItem> 
                      )}/>
                      <FormField control={form.control} name="namaMadrasah" render={({ field }) => ( 
                        <FormItem> 
                          <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Nama Madrasah</FormLabel> 
                          <FormControl><Input {...field} value={field.value ?? ""} className="bg-white rounded-xl h-10" placeholder="Masukkan nama madrasah..." /></FormControl> 
                          <FormMessage /> 
                        </FormItem> 
                      )}/>
                      <FormField control={form.control} name="nsdt" render={({ field }) => ( 
                        <FormItem className="sm:col-span-2"> 
                          <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">NSDT / Nomor Statistik</FormLabel> 
                          <div className="relative">
                            <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                            <FormControl><Input {...field} value={field.value ?? ""} className="bg-white rounded-xl h-10 pl-10" placeholder="Contoh: 111232010045" /></FormControl> 
                          </div>
                          <FormMessage /> 
                        </FormItem> 
                      )}/>
                      <FormField control={form.control} name="alamat" render={({ field }) => ( 
                        <FormItem className="sm:col-span-2"> 
                          <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Alamat Lengkap</FormLabel> 
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                            <FormControl><Textarea {...field} value={field.value ?? ""} className="bg-white rounded-xl min-h-[80px] pl-10 pt-2.5" placeholder="Jl. Raya Nomor, Desa, Kecamatan, Kabupaten..." /></FormControl> 
                          </div>
                          <FormMessage /> 
                        </FormItem> 
                      )}/>
                  </div>
                </div>

                {/* Section 2: Active Period */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary/60 mb-2">
                    <Calendar className="h-4 w-4" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Periode Aktif</h3>
                  </div>
                  <div className="p-6 rounded-[24px] border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="text-sm font-bold text-primary">Tahun Ajaran Aktif</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Tahun ajaran ini berlaku secara global untuk seluruh<br/>modul akademik, keuangan, dan laporan.
                      </p>
                    </div>
                    <div className="bg-white p-1 rounded-full shadow-sm">
                      <AcademicYearSelector />
                    </div>
                  </div>
                </div>
                
                {/* Section 3: Visuals */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary/60 mb-2">
                    <ImageIcon className="h-4 w-4" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Atribut Visual</h3>
                  </div>
                  
                  <div className="grid gap-6 sm:grid-cols-2">
                      {/* Logo Yayasan */}
                      <div className="bg-card p-6 rounded-[24px] border border-muted/50 shadow-sm flex flex-col items-center gap-4 text-center">
                          <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Logo Yayasan</FormLabel>
                          <Avatar className="h-24 w-24 rounded-2xl border-4 border-white shadow-xl bg-muted/20">
                            <AvatarImage src={form.watch('logoYayasanUrl') || undefined} className="object-contain p-2" />
                            <AvatarFallback className="rounded-2xl bg-muted/10"><ImageIcon className="h-8 w-8 text-muted-foreground/20" /></AvatarFallback>
                          </Avatar>
                          <div className="relative w-full">
                            <Input
                                type="file"
                                accept="image/*"
                                className="opacity-0 absolute inset-0 cursor-pointer h-9"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) compressAndSetImage(file, 'logoYayasanUrl');
                                }}
                            />
                            <Button type="button" variant="outline" size="sm" className="w-full h-9 rounded-xl gap-2 text-[10px] font-bold uppercase border-muted/50">
                              <UploadCloud className="h-3.5 w-3.5" /> Ganti Logo
                            </Button>
                          </div>
                      </div>

                      {/* Logo Madrasah */}
                      <div className="bg-card p-6 rounded-[24px] border border-muted/50 shadow-sm flex flex-col items-center gap-4 text-center">
                          <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Logo Madrasah</FormLabel>
                          <Avatar className="h-24 w-24 rounded-2xl border-4 border-white shadow-xl bg-muted/20">
                            <AvatarImage src={form.watch('logoMadrasahUrl') || undefined} className="object-contain p-2" />
                            <AvatarFallback className="rounded-2xl bg-muted/10"><ImageIcon className="h-8 w-8 text-muted-foreground/20" /></AvatarFallback>
                          </Avatar>
                          <div className="relative w-full">
                            <Input
                                type="file"
                                accept="image/*"
                                className="opacity-0 absolute inset-0 cursor-pointer h-9"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) compressAndSetImage(file, 'logoMadrasahUrl');
                                }}
                            />
                            <Button type="button" variant="outline" size="sm" className="w-full h-9 rounded-xl gap-2 text-[10px] font-bold uppercase border-muted/50">
                              <UploadCloud className="h-3.5 w-3.5" /> Ganti Logo
                            </Button>
                          </div>
                      </div>

                      {/* Kop Surat */}
                      <div className="sm:col-span-2 bg-card p-6 rounded-[24px] border border-muted/50 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Gambar Kop Surat Resmi</FormLabel>
                            {form.watch('kopSuratUrl') && (
                              <button 
                                type="button" 
                                className="text-[9px] font-bold text-destructive uppercase hover:underline"
                                onClick={() => form.setValue('kopSuratUrl', '')}
                              >
                                Hapus Kop
                              </button>
                            )}
                          </div>
                          
                          <div className="relative group">
                              <div className={cn(
                                "relative w-full aspect-[5/1] rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden",
                                form.watch('kopSuratUrl') ? "border-muted bg-white" : "border-muted-foreground/20 bg-muted/5"
                              )}>
                                  {form.watch('kopSuratUrl') ? (
                                      <img 
                                          src={form.watch('kopSuratUrl')!} 
                                          alt="Preview Kop Surat" 
                                          className="w-full h-full object-contain p-4"
                                      />
                                  ) : (
                                      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                                          <ImageIcon className="h-10 w-10" />
                                          <p className="text-[10px] font-medium italic">Klik untuk unggah desain kop surat</p>
                                      </div>
                                  )}
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    className="opacity-0 absolute inset-0 cursor-pointer h-full"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) compressAndSetImage(file, 'kopSuratUrl');
                                    }}
                                  />
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <InfoIcon className="h-3 w-3 text-muted-foreground" />
                                <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                                  Gunakan gambar landscape dengan rasio minimal 4:1. Disarankan resolusi 1200x300 px.
                                </p>
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
            </div>
        </ScrollArea>
      </form>
    </Form>
  );
}

function InfoIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
    )
}
