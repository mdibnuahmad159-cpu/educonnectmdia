
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
import { ImagePlus, Loader2, CheckCircle2 } from "lucide-react";
import type { CertificateCategory, CertificateTemplate } from "@/types";

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

  const getStatusIcon = (category: CertificateCategory) => {
    const exists = existingTemplates?.find(t => t.id === category);
    if (exists) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return <ImagePlus className="h-4 w-4 text-muted-foreground" />;
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
        <div className="grid gap-6 py-4">
          {[
            { id: "lomba", label: "Sertifikat Lomba" },
            { id: "ranking", label: "Sertifikat Ranking" },
            { id: "bintang", label: "Sertifikat Bintang Pelajar" },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                {getStatusIcon(item.id as CertificateCategory)}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground italic">Template kanvas kosong</span>
                </div>
              </div>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={(e) => handleFileUpload(item.id as CertificateCategory, e)}
                  disabled={!!loading}
                />
                <Button size="xs" variant="outline" disabled={loading === item.id}>
                  {loading === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Pilih Gambar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Input } from "@/components/ui/input";
