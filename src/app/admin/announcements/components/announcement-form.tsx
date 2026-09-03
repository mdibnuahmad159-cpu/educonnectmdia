
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Announcement } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, X, Save, Camera } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Judul harus diisi"),
  content: z.string().min(1, "Isi pengumuman harus diisi"),
  imageUrl: z.string().optional().or(z.literal("")),
  linkUrl: z.string().url("URL tidak valid").optional().or(z.literal("")),
  target: z.enum(["Semua", "Guru", "Wali Murid"]),
});

type AnnouncementFormData = z.infer<typeof formSchema>;

type AnnouncementFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  announcement: Announcement | null;
  onSave: (data: Omit<Announcement, 'id' | 'createdAt'>) => void;
};

export function AnnouncementForm({ isOpen, setIsOpen, announcement, onSave }: AnnouncementFormProps) {
  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      imageUrl: "",
      linkUrl: "",
      target: "Semua",
    },
  });
  
  useEffect(() => {
    if (isOpen) {
        if (announcement) {
          form.reset(announcement);
        } else {
          form.reset({
            title: "",
            content: "",
            imageUrl: "",
            linkUrl: "",
            target: "Semua",
          });
        }
    }
  }, [announcement, form, isOpen]);
  
  const onSubmit = (values: AnnouncementFormData) => {
    onSave(values);
    setIsOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        const imageUrl = event.target?.result as string;
        img.src = imageUrl;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          
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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            form.setValue('imageUrl', dataUrl);
          } else {
            form.setValue('imageUrl', imageUrl);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                <DialogHeader className="sr-only">
                    <DialogTitle>{announcement ? "Edit Pengumuman" : "Buat Pengumuman"}</DialogTitle>
                    <DialogDescription>Publikasikan informasi penting ke warga madrasah.</DialogDescription>
                </DialogHeader>

                <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Megaphone className="h-8 w-8 text-primary" />
                </div>

                <div className="w-full space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                        {announcement ? "Pembaruan Pengumuman" : "Buat Pengumuman Baru"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</p>
                </div>
            </div>

            <div className="px-6 py-2">
                <ScrollArea className="h-[350px] pr-2">
                    <div className="space-y-4 py-4">
                        <FormField
                        control={form.control}
                        name="target"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Target Audiens</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-9 text-xs bg-white">
                                    <SelectValue placeholder="Pilih target" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Semua">Semua</SelectItem>
                                    <SelectItem value="Guru">Guru</SelectItem>
                                    <SelectItem value="Wali Murid">Wali Murid</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Judul Pengumuman</FormLabel>
                            <FormControl>
                                <Input placeholder="Judul singkat..." {...field} className="bg-white h-9 font-semibold" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Isi Pengumuman</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Tulis pengumuman di sini..." className="min-h-[120px] bg-white" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <div className="space-y-2">
                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Gambar (Opsional)</FormLabel>
                            <div className="flex items-center gap-2">
                                <Input type="file" accept="image/*" onChange={handleImageChange} className="bg-white h-9" />
                            </div>
                            {form.watch("imageUrl") && (
                                <div className="mt-2 relative w-full rounded-xl overflow-hidden border bg-muted/30">
                                    <img 
                                        src={form.watch("imageUrl")!} 
                                        alt="Preview" 
                                        className="w-full h-auto max-h-[200px] object-contain" 
                                    />
                                    <Button 
                                        type="button" 
                                        variant="destructive" 
                                        size="xs" 
                                        className="absolute top-2 right-2 h-6 px-2 rounded-full"
                                        onClick={() => form.setValue("imageUrl", "")}
                                    >
                                        Hapus
                                    </Button>
                                </div>
                            )}
                        </div>
                        <FormField
                        control={form.control}
                        name="linkUrl"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Link Terkait (Opsional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://..." {...field} className="bg-white h-9" />
                            </FormControl>
                            <FormDescription className="text-[9px]">Tautan ke dokumen eksternal.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </ScrollArea>
            </div>
            
            <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3 mt-2">
                <Button type="button" variant="ghost" className="rounded-full px-6 text-xs font-bold uppercase tracking-widest h-10" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5 mr-2" /> Batal
                </Button>
                <Button type="submit" className="h-10 rounded-full px-8 bg-accent text-primary hover:bg-accent/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20">
                  <Save className="h-3.5 w-3.5 mr-2" /> {announcement ? "Simpan Perubahan" : "Publikasikan"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
