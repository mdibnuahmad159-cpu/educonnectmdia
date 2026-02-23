"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Teacher } from "@/types";
import { Trash2, Edit, FileDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type TeacherDetailProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  teacher: Teacher | null;
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
};

export function TeacherDetail({ isOpen, setIsOpen, teacher, onEdit, onDelete }: TeacherDetailProps) {
  if (!teacher) return null;

  const handleEdit = () => {
    onEdit(teacher);
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete(teacher.id);
    setIsOpen(false);
  };

  const handleExportPdf = () => {
    if (!teacher) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Detail Guru: ${teacher.name}`, 14, 22);

    const createPdf = (avatarData: {img: HTMLImageElement, width: number, height: number} | null) => {
        let startY = 30;
        if (avatarData) {
            try {
                doc.addImage(avatarData.img, 'JPEG', 14, 30, avatarData.width, avatarData.height);
                startY = 30 + avatarData.height + 10;
            } catch (e) {
                console.error("Error adding image to PDF:", e);
            }
        }
        
        const tableData = [
          ['Nama', teacher.name || "-"],
          ['Jabatan', teacher.jabatan || "-"],
          ['No. WA', teacher.noWa || "-"],
          ['NIK', teacher.nik || "-"],
          ['Email', teacher.email || "-"],
          ['Pendidikan', teacher.pendidikan || "-"],
          ['Ponpes', teacher.ponpes || "-"],
          ['Alamat', teacher.alamat || "-"],
        ];

        (doc as any).autoTable({
          startY: startY,
          head: [['Keterangan', 'Data']],
          body: tableData,
          theme: 'grid',
          styles: { cellPadding: 2, fontSize: 10 },
          headStyles: { fillColor: [34, 119, 74], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { fontStyle: 'bold' } },
        });

        doc.output('dataurlnewwindow');
    }

    if (teacher.avatarUrl) {
        const img = new Image();
        if (!teacher.avatarUrl.startsWith('data:image')) {
            img.crossOrigin = "Anonymous";
        }
        img.src = teacher.avatarUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                const finalImg = new Image();
                finalImg.src = dataUrl;
                finalImg.onload = () => {
                    const ratio = finalImg.width / finalImg.height;
                    let pdfImgWidth = 40;
                    let pdfImgHeight = 40;

                    if (ratio > 1) { // landscape
                        pdfImgHeight = pdfImgWidth / ratio;
                    } else { // portrait or square
                        pdfImgWidth = pdfImgHeight * ratio;
                    }
                    createPdf({img: finalImg, width: pdfImgWidth, height: pdfImgHeight});
                }
                finalImg.onerror = () => {
                    createPdf(null);
                }
            } else {
               createPdf(null);
            }
        };
        img.onerror = () => {
            createPdf(null);
        };
    } else {
        createPdf(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Detail Guru</DialogTitle>
          <DialogDescription>Informasi lengkap data guru.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={teacher.avatarUrl || undefined} alt={teacher.name} className="object-cover" />
            <AvatarFallback className="text-3xl">{teacher.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="py-4 space-y-2 text-sm">
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Nama</span>
            <span className="col-span-2">{teacher.name || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Jabatan</span>
            <span className="col-span-2">{teacher.jabatan || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">No. WA</span>
            <span className="col-span-2">{teacher.noWa || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">NIK</span>
            <span className="col-span-2">{teacher.nik || "-"}</span>
          </div>
           <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Email</span>
            <span className="col-span-2">{teacher.email || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Pendidikan</span>
            <span className="col-span-2">{teacher.pendidikan || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Ponpes</span>
            <span className="col-span-2">{teacher.ponpes || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Alamat</span>
            <span className="col-span-2">{teacher.alamat || "-"}</span>
          </div>
          {teacher.dokumenUrl && (
            <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Dokumen</span>
                <span className="col-span-2">
                    <a href={teacher.dokumenUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                        Lihat Dokumen
                    </a>
                </span>
            </div>
           )}
        </div>
        <DialogFooter>
           <Button variant="outline" size="xs" onClick={handleExportPdf} className="gap-1">
            <FileDown /> Ekspor PDF
          </Button>
          <DialogClose asChild>
            <Button variant="outline" size="xs">Tutup</Button>
          </DialogClose>
          <Button variant="destructive" size="xs" onClick={handleDelete} className="gap-1">
            <Trash2 /> Hapus
          </Button>
          <Button size="xs" onClick={handleEdit} className="gap-1">
            <Edit /> Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
