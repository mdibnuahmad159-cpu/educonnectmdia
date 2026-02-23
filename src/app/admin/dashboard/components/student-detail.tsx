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
import type { Student } from "@/types";
import { Trash2, Edit, FileDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type StudentDetailProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  student: Student | null;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
};

export function StudentDetail({ isOpen, setIsOpen, student, onEdit, onDelete }: StudentDetailProps) {
  if (!student) return null;

  const handleEdit = () => {
    onEdit(student);
  };

  const handleDelete = () => {
    onDelete(student.id);
    setIsOpen(false);
  };

  const handleExportPdf = () => {
    if (!student) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Detail Siswa: ${student.name}`, 14, 22);

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
          ['Nama', student.name || "-"],
          ['NIS', student.nis || "-"],
          ['NIK', student.nik || "-"],
          ['Jenis Kelamin', student.gender || "-"],
          ['Tempat Lahir', student.tempatLahir || "-"],
          ['Tanggal Lahir', student.dateOfBirth || "-"],
          ['Nama Ayah', student.namaAyah || "-"],
          ['Nama Ibu', student.namaIbu || "-"],
          ['Alamat', student.address || "-"],
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

    if (student.avatarUrl) {
        const img = new Image();
        if (!student.avatarUrl.startsWith('data:image')) {
            img.crossOrigin = "Anonymous";
        }
        img.src = student.avatarUrl;
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
          <DialogTitle>Detail Siswa</DialogTitle>
          <DialogDescription>Informasi lengkap data siswa.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={student.avatarUrl || undefined} alt={student.name} className="object-cover" />
            <AvatarFallback className="text-3xl">{student.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="py-4 space-y-2 text-sm max-h-[50vh] overflow-y-auto">
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Nama</span>
            <span className="col-span-2 font-medium">{student.name || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">NIS</span>
            <span className="col-span-2">{student.nis || "-"}</span>
          </div>
           <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">NIK</span>
            <span className="col-span-2">{student.nik || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Jenis Kelamin</span>
            <span className="col-span-2">{student.gender || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Tempat Lahir</span>
            <span className="col-span-2">{student.tempatLahir || "-"}</span>
          </div>
           <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Tanggal Lahir</span>
            <span className="col-span-2">{student.dateOfBirth || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Nama Ayah</span>
            <span className="col-span-2">{student.namaAyah || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Nama Ibu</span>
            <span className="col-span-2">{student.namaIbu || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Alamat</span>
            <span className="col-span-2">{student.address || "-"}</span>
          </div>
          {student.dokumenUrl && (
            <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Dokumen</span>
                <span className="col-span-2">
                    <a href={student.dokumenUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
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
