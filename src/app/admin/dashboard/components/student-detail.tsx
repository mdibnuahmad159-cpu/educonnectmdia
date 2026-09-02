
"use client";

import { useState, useEffect } from "react";
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
import { Trash2, Edit, Printer, FileDown, Download, QrCode } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

type StudentDetailProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  student: Student | null;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
};

export function StudentDetail({ isOpen, setIsOpen, student, onEdit, onDelete }: StudentDetailProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (student?.nis) {
        QRCode.toDataURL(student.nis, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        }).then(setQrDataUrl).catch(err => console.error(err));
    }
  }, [student]);

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
            .header-flex { display: flex; gap: 20px; margin-bottom: 20px; align-items: center; }
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
                border: 2px solid #eee;
            }
            img.qr { width: 100px; height: 100px; border: 1px solid #ddd; padding: 5px; }
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
            <div class="header-flex">
                ${avatarSrc ? `<img class="avatar" src="${avatarSrc}" alt="${name}" />` : ''}
                ${qrDataUrl ? `<div style="text-align: center;"><img class="qr" src="${qrDataUrl}" alt="QR" /><p style="font-size: 8px; font-family: monospace; margin: 2px 0;">${student.nis}</p></div>` : ''}
            </div>
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

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_Siswa_${student.nis}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Siswa</DialogTitle>
          <DialogDescription>Informasi lengkap data siswa.</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-4">
            <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-2 border-primary/10 shadow-sm">
                    <AvatarImage src={student.avatarUrl || undefined} alt={student.name} className="object-cover" />
                    <AvatarFallback className="text-3xl">{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                
                {qrDataUrl && (
                    <div className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                        <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" />
                        <span className="text-[10px] font-mono font-bold">{student.nis}</span>
                        <Button size="xs" variant="outline" className="h-7 gap-1 px-3" onClick={downloadQr}>
                            <Download className="h-3 w-3" /> Unduh QR
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 w-full space-y-2 text-xs max-h-[40vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">Nama</span>
                    <span className="col-span-2 font-bold">{student.name || "-"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">NIS</span>
                    <span className="col-span-2">{student.nis || "-"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">Kelas</span>
                    <span className="col-span-2 font-bold">{student.kelas !== undefined ? `Kelas ${student.kelas}` : 'Belum diatur'}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">Password Wali</span>
                    <span className="col-span-2 font-mono">{student.password || "Belum diatur"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">NIK</span>
                    <span className="col-span-2">{student.nik || "-"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">L/P</span>
                    <span className="col-span-2">{student.gender || "-"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">Tempat Lahir</span>
                    <span className="col-span-2">{student.tempatLahir || "-"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">Tgl Lahir</span>
                    <span className="col-span-2">{student.dateOfBirth || "-"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">Nama Ayah</span>
                    <span className="col-span-2">{student.namaAyah || "-"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">Nama Ibu</span>
                    <span className="col-span-2">{student.namaIbu || "-"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">Alamat</span>
                    <span className="col-span-2">{student.address || "-"}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground font-medium">No. WA</span>
                    <span className="col-span-2">{student.noWa || "-"}</span>
                </div>
            </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
           <Button variant="outline" size="xs" onClick={handleExportPdf} className="gap-1.5 h-8">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
           <Button variant="outline" size="xs" onClick={handlePrint} className="gap-1.5 h-8">
            <Printer className="h-3.5 w-3.5" /> Cetak
          </Button>
          <DialogClose asChild>
            <Button variant="outline" size="xs" className="h-8">Tutup</Button>
          </DialogClose>
          <Button variant="destructive" size="xs" onClick={handleDelete} className="gap-1.5 h-8">
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </Button>
          <Button size="xs" onClick={handleEdit} className="gap-1.5 h-8">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
