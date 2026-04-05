
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFirestore } from "@/firebase";
import { upsertCertificateTemplate } from "@/lib/firebase-helpers";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Loader2, CheckCircle2, Eye } from "lucide-react";
import type { CertificateCategory, CertificateTemplate } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TemplateUploadDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  existingTemplates: CertificateTemplate[] | null;
};

export function TemplateUploadDialog({ isOpen, setIsOpen, existingTemplates }: TemplateUploadDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleFileUpload = async (category: CertificateCategory, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    setLoading(category);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      const rawDataUrl = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        // Resolusi A4 Landscape standar untuk cetak yang cukup tajam
        const MAX_WIDTH = 1600; 
        
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
          // Kompres ke JPEG 70% untuk menjaga kualitas vs ukuran file (Firestore limit 1MB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          try {
            await upsertCertificateTemplate(firestore, { id: category, imageUrl: compressedDataUrl });
            toast({ title: "Template Berhasil Diunggah", description: `Template ${category} telah diperbarui.` });
          } catch (error) {
            console.error("Upload error:", error);
            toast({ 
              variant: "destructive", 
              title: "Gagal Mengunggah", 
              description: "Terjadi kesalahan saat menyimpan ke database. Pastikan ukuran gambar tidak terlalu besar." 
            });
          } finally {
            setLoading(null);
            // Reset input file agar bisa pilih file yang sama jika gagal
            e.target.value = '';
          }
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const getTemplate = (category: CertificateCategory) => {
    return existingTemplates?.find(t => t.id === category);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Template Sertifikat</DialogTitle>
          <DialogDescription>
            Unggah gambar latar belakang (JPEG/PNG). Gambar akan dioptimalkan otomatis agar aman disimpan di sistem.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {[
            { id: "lomba", label: "Sertifikat Lomba" },
            { id: "ranking", label: "Sertifikat Ranking" },
            { id: "bintang", label: "Sertifikat Bintang Pelajar" },
          ].map((item) => {
            const template = getTemplate(item.id as CertificateCategory);
            return (
              <div key={item.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {template ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-[10px] text-muted-foreground italic">
                        {template ? "Sudah diunggah" : "Belum ada template"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {template && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="xs" variant="ghost" className="h-7 w-7 p-0">
                            <Eye className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 overflow-hidden border-none shadow-xl">
                          <img 
                            src={template.imageUrl} 
                            alt={`Preview ${item.label}`}
                            className="w-full h-auto object-contain"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => handleFileUpload(item.id as CertificateCategory, e)}
                        disabled={!!loading}
                      />
                      <Button size="xs" variant="outline" className="h-7 font-normal" disabled={loading === item.id}>
                        {loading === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : template ? "Ganti" : "Pilih"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="font-normal">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
