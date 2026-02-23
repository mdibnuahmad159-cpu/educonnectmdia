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
import { Trash2, Edit, Printer } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

 const handlePrint = () => {
    if (!teacher) return;

    const printWindow = window.open('', '_blank', 'height=800,width=600');
    if (!printWindow) {
        alert('Tidak dapat membuka jendela cetak. Mohon izinkan pop-up untuk situs ini.');
        return;
    }

    const avatarSrc = teacher.avatarUrl || '';
    const name = teacher.name || "-";
    const data = [
      { label: 'Nama', value: teacher.name || "-" },
      { label: 'Jabatan', value: teacher.jabatan || "-" },
      { label: 'No. WA', value: teacher.noWa || "-" },
      { label: 'NIK', value: teacher.nik || "-" },
      { label: 'Email', value: teacher.email || "-" },
      { label: 'Pendidikan', value: teacher.pendidikan || "-" },
      { label: 'Ponpes', value: teacher.ponpes || "-" },
      { label: 'Alamat', value: teacher.alamat || "-" },
    ];
     if (teacher.dokumenUrl) {
        data.push({ label: 'Dokumen', value: `Tersedia (tidak ditampilkan)` });
    }

    const tableRows = data.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: 600; width: 150px; vertical-align: top;">${item.label}</td>
            <td style="padding: 10px; vertical-align: top;">${item.value}</td>
        </tr>
    `).join('');

    const content = `
      <html>
        <head>
          <title>Cetak Detail Guru - ${name}</title>
          <style>
            body { 
                font-family: "PT Sans", sans-serif; 
                margin: 0;
                color: #333;
            }
            .container {
                padding: 30px;
            }
            h1 { 
                font-size: 22px; 
                margin-bottom: 20px; 
                font-weight: 700;
                color: #111;
            }
            img.avatar { 
                width: 120px; 
                height: 120px;
                border-radius: 50%;
                object-fit: cover;
                margin-bottom: 20px; 
                border: 2px solid #eee;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 14px;
            }
            @media print {
              @page {
                  size: A4;
                  margin: 25mm;
              }
              body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Detail Guru</h1>
            ${avatarSrc ? `<img class="avatar" src="${avatarSrc}" alt="${name}" />` : ''}
            <table>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
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
           <Button variant="outline" size="xs" onClick={handlePrint} className="gap-1">
            <Printer /> Cetak Detail
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
