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
import { Trash2, Edit, Printer, FileDown } from "lucide-react";
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
    
    doc.setFontSize(16);
    doc.text(`Detail Siswa`, 14, 22);
    doc.setFontSize(11);

    const getTableBody = () => [
        ['Nama', student.name || "-"],
        ['NIS', student.nis || "-"],
        ['Kelas', student.kelas !== undefined ? `Kelas ${student.kelas}` : "Belum diatur"],
        ['NIK', student.nik || "-"],
        ['Jenis Kelamin', student.gender || "-"],
        ['Tempat Lahir', student.tempatLahir || "-"],
        ['Tanggal Lahir', student.dateOfBirth || "-"],
        ['Nama Ayah', student.namaAyah || "-"],
        ['Nama Ibu', student.namaIbu || "-"],
        ['Alamat', student.address || "-"],
        ['No. WA', student.noWa || "-"],
        ['Dokumen', student.dokumenUrl ? 'Tersedia' : '-'],
    ];

    let startY = 30;

    if (student.avatarUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const aspect = img.width / img.height;
            let width = 40;
            let height = 40;
            if (aspect > 1) {
                height = width / aspect;
            } else {
                width = height * aspect;
            }
            
            doc.addImage(img, 'JPEG', 15, startY, width, height);
            
            (doc as any).autoTable({
              startY: startY + height + 10,
              body: getTableBody(),
              theme: 'grid',
            });

            doc.save(`detail_siswa_${student.nis}.pdf`);
        };
        img.onerror = () => {
          (doc as any).autoTable({
            startY: startY,
            body: getTableBody(),
            theme: 'grid',
          });
          doc.save(`detail_siswa_${student.nis}.pdf`);
        }
        img.src = student.avatarUrl;
      } catch (e) {
        console.error("Could not add image to PDF", e);
        (doc as any).autoTable({
          startY: startY,
          body: getTableBody(),
          theme: 'grid',
        });
        doc.save(`detail_siswa_${student.nis}.pdf`);
      }
    } else {
        (doc as any).autoTable({
            startY: startY,
            body: getTableBody(),
            theme: 'grid',
        });
        doc.save(`detail_siswa_${student.nis}.pdf`);
    }
  };

  const handlePrint = () => {
    if (!student) return;

    const printWindow = window.open('', '_blank', 'height=800,width=600');
    if (!printWindow) {
        alert('Tidak dapat membuka jendela cetak. Mohon izinkan pop-up untuk situs ini.');
        return;
    }

    const avatarSrc = student.avatarUrl || '';
    const name = student.name || "-";
    const data = [
      { label: 'Nama', value: student.name || "-" },
      { label: 'NIS', value: student.nis || "-" },
      { label: 'Password Wali', value: student.password || "Belum diatur" },
      { label: 'Kelas', value: student.kelas !== undefined ? `Kelas ${student.kelas}` : "Belum diatur"},
      { label: 'NIK', value: student.nik || "-" },
      { label: 'Jenis Kelamin', value: student.gender || "-" },
      { label: 'Tempat Lahir', value: student.tempatLahir || "-" },
      { label: 'Tanggal Lahir', value: student.dateOfBirth || "-" },
      { label: 'Nama Ayah', value: student.namaAyah || "-" },
      { label: 'Nama Ibu', value: student.namaIbu || "-" },
      { label: 'Alamat', value: student.address || "-" },
      { label: 'No. WA', value: student.noWa || "-" },
    ];
    if (student.dokumenUrl) {
        data.push({ label: 'Dokumen', value: `Tersedia (tidak ditampilkan)` });
    }

    const tableRows = data.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px; font-weight: 600; width: 120px; vertical-align: top;">${item.label}</td>
            <td style="padding: 8px; vertical-align: top;">${item.value}</td>
        </tr>
    `).join('');

    const content = `
      <html>
        <head>
          <title>Cetak Detail Siswa - ${name}</title>
          <style>
            body { 
                font-family: "PT Sans", sans-serif; 
                margin: 0;
                color: #333;
                font-size: 12px;
            }
            .container {
                padding: 20px;
            }
            h1 { 
                font-size: 18px; 
                margin-bottom: 15px; 
                font-weight: 700;
                color: #111;
            }
            img.avatar { 
                width: 80px; 
                height: 80px;
                border-radius: 50%;
                object-fit: cover;
                margin-bottom: 15px; 
                border: 2px solid #eee;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
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
            <h1>Detail Siswa</h1>
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
        printWindow.focus();
        printWindow.print();
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Detail Siswa</DialogTitle>
          <DialogDescription>Informasi lengkap data siswa.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={student.avatarUrl || undefined} alt={student.name} className="object-cover" />
            <AvatarFallback className="text-2xl">{student.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="py-4 space-y-2 text-xs max-h-[50vh] overflow-y-auto">
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Nama</span>
            <span className="col-span-2 font-medium">{student.name || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">NIS</span>
            <span className="col-span-2">{student.nis || "-"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Password Wali</span>
            <span className="col-span-2">{student.password || "Belum diatur"}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">Kelas</span>
            <span className="col-span-2 font-medium">{student.kelas !== undefined ? `Kelas ${student.kelas}` : 'Belum diatur'}</span>
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
          <div className="grid grid-cols-3 items-center">
            <span className="text-muted-foreground">No. WA</span>
            <span className="col-span-2">{student.noWa || "-"}</span>
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
            <FileDown /> PDF
          </Button>
          <Button variant="outline" size="xs" onClick={handlePrint} className="gap-1">
            <Printer /> Cetak
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
