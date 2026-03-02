
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
          const MAX_WIDTH = 800; // Lebar maksimal untuk efisiensi penyimpanan
          
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
            // Kompres gambar ke format JPEG dengan kualitas 70%
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{announcement ? "Edit Pengumuman" : "Buat Pengumuman"}</DialogTitle>
          <DialogDescription>
            Isi detail pengumuman yang akan dipublikasikan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4 py-4">
                    <FormField
                    control={form.control}
                    name="target"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Target Audiens</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
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
                        <FormLabel>Judul</FormLabel>
                        <FormControl>
                            <Input placeholder="Contoh: Libur Sekolah" {...field} />
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
                        <FormLabel>Isi Pengumuman</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Tulis pengumuman di sini..." className="min-h-[120px]" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="space-y-2">
                        <FormLabel>Gambar (Opsional)</FormLabel>
                        <Input type="file" accept="image/*" onChange={handleImageChange} />
                        <p className="text-[10px] text-muted-foreground italic">Gambar akan dioptimalkan secara otomatis untuk pengiriman yang lebih cepat.</p>
                        {form.watch("imageUrl") && (
                            <div className="mt-2 relative w-full rounded-md overflow-hidden border bg-muted/30">
                                <img 
                                    src={form.watch("imageUrl")!} 
                                    alt="Preview" 
                                    className="w-full h-auto max-h-[300px] object-contain" 
                                />
                                <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="xs" 
                                    className="absolute top-1 right-1 h-6 px-2"
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
                        <FormLabel>Link Terkait (Opsional)</FormLabel>
                        <FormControl>
                            <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormDescription>Tautan ke dokumen atau info lebih lanjut.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="submit">{announcement ? "Perbarui" : "Publikasikan"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
