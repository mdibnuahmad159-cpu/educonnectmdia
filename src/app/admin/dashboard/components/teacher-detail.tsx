
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
import type { Teacher } from "@/types";
import { Trash2, Edit, Printer, FileDown, QrCode, Download } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

type TeacherDetailProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  teacher: Teacher | null;
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
};

export function TeacherDetail({ isOpen, setIsOpen, teacher, onEdit, onDelete }: TeacherDetailProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (teacher?.nig) {
        QRCode.toDataURL(teacher.nig, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        }).then(setQrDataUrl).catch(err => console.error(err));
    }
  }, [teacher]);

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
    
    doc.setFontSize(16);
    doc.text(`Detail Guru`, 14, 22);
    doc.setFontSize(11);

    const getTableBody = () => [
        ['NIG', teacher.nig || "-"],
        ['Nama', teacher.name || "-"],
        ['Jabatan', teacher.jabatan || "-"],
        ['No. WA', teacher.noWa || "-"],
        ['NIK', teacher.nik || "-"],
        ['Email', teacher.email || "-"],
        ['Pendidikan', teacher.pendidikan || "-"],
        ['Ponpes', teacher.ponpes || "-"],
        ['Alamat', teacher.alamat || "-"],
        ['Dokumen', teacher.dokumenUrl ? 'Tersedia' : '-'],
    ];

    let startY = 30;

    if (teacher.avatarUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const aspect = img.width / img.height;
            let width = 40;
            let height = 40;
            if(aspect > 1) {
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
            doc.save(`detail_guru_${teacher.id}.pdf`);
        };
        img.onerror = () => {
            (doc as any).autoTable({
                startY: startY,
                body: getTableBody(),
                theme: 'grid',
            });
            doc.save(`detail_guru_${teacher.id}.pdf`);
        };
        img.src = teacher.avatarUrl;
      } catch (e) {
        console.error("Could not add image to PDF", e);
        (doc as any).autoTable({
            startY: startY,
            body: getTableBody(),
            theme: 'grid',
        });
        doc.save(`detail_guru_${teacher.id}.pdf`);
      }
    } else {
        (doc as any).autoTable({
            startY: startY,
            body: getTableBody(),
            theme: 'grid',
        });
        doc.save(`detail_guru_${teacher.id}.pdf`);
    }
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
      { label: 'NIG', value: teacher.nig || "-" },
      { label: 'Nama', value: teacher.name || "-" },
      { label: 'Jabatan', value: teacher.jabatan || "-" },
      { label: 'No. WA', value: teacher.noWa || "-" },
      { label: 'NIK', value: teacher.nik || "-" },
      { label: 'Email', value: teacher.email || "-" },
      { label: 'Password', value: teacher.password || "Sudah diatur" },
      { label: 'Pendidikan', value: teacher.pendidikan || "-" },
      { label: 'Ponpes', value: teacher.ponpes || "-" },
      { label: 'Alamat', value: teacher.alamat || "-" },
    ];
     if (teacher.dokumenUrl) {
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
          <title>Cetak Detail Guru - ${name}</title>
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
            .header-flex { display: flex; gap: 20px; margin-bottom: 20px; align-items: center; }
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
            <h1>Detail Guru</h1>
            <div class="header-flex">
                ${avatarSrc ? `<img class="avatar" src="${avatarSrc}" alt="${name}" />` : ''}
                ${qrDataUrl ? `<div style="text-align: center;"><img class="qr" src="${qrDataUrl}" alt="QR" /><p style="font-size: 8px; font-family: monospace; margin: 2px 0;">${teacher.nig}</p></div>` : ''}
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
    link.download = `QR_Guru_${teacher.nig}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Guru</DialogTitle>
          <DialogDescription>Informasi lengkap data guru.</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-4">
            <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={teacher.avatarUrl || undefined} alt={teacher.name} className="object-cover" />
                    <AvatarFallback className="text-3xl">{teacher.name.charAt(0)}</AvatarFallback>
                </Avatar>
                
                {qrDataUrl && (
                    <div className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                        <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" />
                        <span className="text-[10px] font-mono font-bold">{teacher.nig}</span>
                        <Button size="xs" variant="outline" className="h-7 gap-1 px-3" onClick={downloadQr}>
                            <Download className="h-3 w-3" /> Unduh QR
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 w-full space-y-2 text-xs">
                <div className="grid grid-cols-3 items-center">
                    <span className="text-muted-foreground">NIG</span>
                    <span className="col-span-2 font-bold">{teacher.nig || "-"}</span>
                </div>
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
        </div>

        <DialogFooter className="mt-4 gap-2">
           <Button variant="outline" size="xs" onClick={handleExportPdf} className="gap-1">
            <FileDown className="h-3 w-3" /> PDF
          </Button>
           <Button variant="outline" size="xs" onClick={handlePrint} className="gap-1">
            <Printer className="h-3 w-3" /> Cetak
          </Button>
          <DialogClose asChild>
            <Button variant="outline" size="xs">Tutup</Button>
          </DialogClose>
          <Button variant="destructive" size="xs" onClick={handleDelete} className="gap-1">
            <Trash2 className="h-3 w-3" /> Hapus
          </Button>
          <Button size="xs" onClick={handleEdit} className="gap-1">
            <Edit className="h-3 w-3" /> Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
