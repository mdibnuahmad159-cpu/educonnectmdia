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
import { ImageIcon } from "lucide-react";

const formSchema = z.object({
  namaYayasan: z.string().optional(),
  namaMadrasah: z.string().optional(),
  nsdt: z.string().optional(),
  alamat: z.string().optional(),
  visi: z.string().optional(),
  misi: z.string().optional(),
  sejarahSingkat: z.string().optional(),
  logoYayasanUrl: z.string().optional().or(z.literal("")),
  logoYayasanFile: z.any().optional(),
  logoMadrasahUrl: z.string().optional().or(z.literal("")),
  logoMadrasahFile: z.any().optional(),
  kopSuratUrl: z.string().optional().or(z.literal("")),
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

const handleFileRead = (file: File, callback: (result: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        callback(reader.result as string);
    };
    reader.readAsDataURL(file);
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

  const onSubmit = (values: ProfileFormData) => {
    const { logoYayasanFile, logoMadrasahFile, kopSuratFile, ...dataToSave } = values;
    onSave(dataToSave);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ScrollArea className="h-[calc(100vh-25rem)] pr-4">
            <div className="space-y-6">
                <FormField control={form.control} name="namaYayasan" render={({ field }) => ( <FormItem> <FormLabel>Nama Yayasan</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="namaMadrasah" render={({ field }) => ( <FormItem> <FormLabel>Nama Madrasah</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="nsdt" render={({ field }) => ( <FormItem> <FormLabel>NSDT</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="alamat" render={({ field }) => ( <FormItem> <FormLabel>Alamat</FormLabel> <FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="visi" render={({ field }) => ( <FormItem> <FormLabel>Visi</FormLabel> <FormControl><Textarea className="h-24" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="misi" render={({ field }) => ( <FormItem> <FormLabel>Misi</FormLabel> <FormControl><Textarea className="h-32" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="sejarahSingkat" render={({ field }) => ( <FormItem> <FormLabel>Sejarah Singkat</FormLabel> <FormControl><Textarea className="h-40" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                
                <FormField
                  control={form.control}
                  name="logoYayasanFile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo Yayasan</FormLabel>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-20 w-20 rounded-md border">
                          <AvatarImage src={form.watch('logoYayasanUrl') || undefined} className="object-contain" />
                          <AvatarFallback className="rounded-md bg-muted"><ImageIcon className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <FormControl>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileRead(file, (result) => form.setValue('logoYayasanUrl', result));
                                }
                                field.onChange(file ?? null);
                              }}
                            />
                          </FormControl>
                          <FormDescription>Unggah logo yayasan.</FormDescription>
                          <FormMessage />
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
                      <div className="flex items-start gap-4">
                        <Avatar className="h-20 w-20 rounded-md border">
                          <AvatarImage src={form.watch('logoMadrasahUrl') || undefined} className="object-contain" />
                          <AvatarFallback className="rounded-md bg-muted"><ImageIcon className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <FormControl>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                   handleFileRead(file, (result) => form.setValue('logoMadrasahUrl', result));
                                }
                                field.onChange(file ?? null);
                              }}
                            />
                          </FormControl>
                          <FormDescription>Unggah logo madrasah.</FormDescription>
                          <FormMessage />
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
                      <div className="flex items-start gap-4">
                        <Avatar className="h-20 w-auto rounded-md border aspect-[2/1]">
                          <AvatarImage src={form.watch('kopSuratUrl') || undefined} className="object-contain" />
                          <AvatarFallback className="rounded-md bg-muted"><ImageIcon className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <FormControl>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileRead(file, (result) => form.setValue('kopSuratUrl', result));
                                }
                                field.onChange(file ?? null);
                              }}
                            />
                          </FormControl>
                          <FormDescription>Unggah gambar untuk kop surat.</FormDescription>
                          <FormMessage />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
            </div>
        </ScrollArea>

        <Button type="submit">Simpan Perubahan</Button>
      </form>
    </Form>
  );
}
