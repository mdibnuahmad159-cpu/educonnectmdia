
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
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      try {
        await upsertCertificateTemplate(firestore, { id: category, imageUrl });
        toast({ title: "Template Berhasil Diunggah", description: `Template ${category} telah diperbarui.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Gagal Mengunggah", description: "Terjadi kesalahan saat menyimpan template." });
      } finally {
        setLoading(null);
      }
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
            Unggah gambar latar belakang (JPEG/PNG) untuk setiap kategori sertifikat.
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
