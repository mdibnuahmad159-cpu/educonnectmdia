
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { ImageIcon, Loader2 } from "lucide-react";

const formSchema = z.object({
  namaYayasan: z.string().optional(),
  namaMadrasah: z.string().optional(),
  nsdt: z.string().optional(),
  alamat: z.string().optional(),
  visi: z.string().optional(),
  misi: z.string().optional(),
  sejarahSingkat: z.string().optional(),
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
  visi: "",
  misi: "",
  sejarahSingkat: "",
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
        // Kop surat butuh resolusi lebih tinggi (lebar), logo cukup kecil
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
          // Kompres ke JPEG dengan kualitas 75% untuk menghemat ruang Firestore
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          form.setValue(fieldName, dataUrl);
        } else {
          form.setValue(fieldName, imageUrl);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (values: ProfileFormData) => {
    const { logoYayasanFile, logoMadrasahFile, kopSuratFile, ...dataToSave } = values;
    onSave(dataToSave);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
            <div className="space-y-6 pb-10">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="namaYayasan" render={({ field }) => ( <FormItem> <FormLabel>Nama Yayasan</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="namaMadrasah" render={({ field }) => ( <FormItem> <FormLabel>Nama Madrasah</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                </div>
                <FormField control={form.control} name="nsdt" render={({ field }) => ( <FormItem> <FormLabel>NSDT (Nomor Statistik Diniyah Takmiliyah)</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="alamat" render={({ field }) => ( <FormItem> <FormLabel>Alamat Lengkap</FormLabel> <FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                
                <div className="grid gap-6 py-4 border-y">
                    <FormField
                    control={form.control}
                    name="logoYayasanFile"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Logo Yayasan</FormLabel>
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
                                className="h-9"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) compressAndSetImage(file, 'logoYayasanUrl');
                                    field.onChange(file ?? null);
                                }}
                                />
                            </FormControl>
                            <FormDescription className="text-[10px]">Format JPG/PNG, ukuran akan dioptimalkan otomatis.</FormDescription>
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
                        <FormLabel>Logo Madrasah</FormLabel>
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
                                className="h-9"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) compressAndSetImage(file, 'logoMadrasahUrl');
                                    field.onChange(file ?? null);
                                }}
                                />
                            </FormControl>
                            <FormDescription className="text-[10px]">Digunakan sebagai ikon aplikasi dan laporan.</FormDescription>
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
                        <FormLabel>Gambar Kop Surat</FormLabel>
                        <div className="space-y-3">
                            {form.watch('kopSuratUrl') && (
                                <div className="relative w-full aspect-[4/1] rounded-md border bg-muted/10 overflow-hidden">
                                    <img 
                                        src={form.watch('kopSuratUrl')!} 
                                        alt="Preview Kop Surat" 
                                        className="w-full h-full object-contain"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="destructive" 
                                        size="xs" 
                                        className="absolute top-1 right-1 h-6 text-[10px]"
                                        onClick={() => form.setValue('kopSuratUrl', '')}
                                    >
                                        Hapus
                                    </Button>
                                </div>
                            )}
                            <FormControl>
                                <Input
                                type="file"
                                accept="image/*"
                                className="h-9"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) compressAndSetImage(file, 'kopSuratUrl');
                                    field.onChange(file ?? null);
                                }}
                                />
                            </FormControl>
                            <FormDescription className="text-[10px]">Gambar memanjang untuk bagian atas surat resmi.</FormDescription>
                        </div>
                        </FormItem>
                    )}
                    />
                </div>

                <div className="space-y-4">
                    <FormField control={form.control} name="visi" render={({ field }) => ( <FormItem> <FormLabel>Visi</FormLabel> <FormControl><Textarea className="h-20" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="misi" render={({ field }) => ( <FormItem> <FormLabel>Misi</FormLabel> <FormControl><Textarea className="h-28" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="sejarahSingkat" render={({ field }) => ( <FormItem> <FormLabel>Sejarah Singkat</FormLabel> <FormControl><Textarea className="h-32" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                </div>
            </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
            <Button type="submit" className="w-full sm:w-auto px-10">Simpan Perubahan</Button>
        </div>
      </form>
    </Form>
  );
}
