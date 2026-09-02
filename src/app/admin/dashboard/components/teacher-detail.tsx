
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
import { 
  Trash2, 
  Edit, 
  Printer, 
  FileDown, 
  QrCode, 
  Download, 
  UserCircle, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  BookOpen,
  Fingerprint,
  X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, safePrint } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { format } from "date-fns";
import { id as dfnsId } from "date-fns/locale";

type TeacherDetailProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  teacher: Teacher | null;
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
};

function InfoField({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
    return (
        <div className="flex items-center gap-4 py-3.5 border-b border-muted/60 last:border-0">
            <div className="p-2.5 bg-primary/5 rounded-xl text-primary shrink-0">
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-xs font-semibold text-foreground/80 leading-snug">{value || '-'}</p>
            </div>
        </div>
    );
}

export function TeacherDetail({ isOpen, setIsOpen, teacher, onEdit, onDelete }: TeacherDetailProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (teacher?.nig) {
        QRCode.toDataURL(teacher.nig, {
            width: 512,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        }).then(setQrDataUrl).catch(err => console.error(err));
    }
  }, [teacher]);

  if (!teacher) return null;

  const handleEdit = () => {
    onEdit(teacher);
  };

  const handleDelete = () => {
    onDelete(teacher.id);
  };
  
  const handleExportPdf = () => {
    if (!teacher) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Detail Guru`, 14, 22);
    const body = [
        ['NIG', teacher.nig || "-"],
        ['Nama', teacher.name || "-"],
        ['Jabatan', teacher.jabatan || "-"],
        ['No. WA', teacher.noWa || "-"],
        ['NIK', teacher.nik || "-"],
        ['Email', teacher.email || "-"],
        ['Pendidikan', teacher.pendidikan || "-"],
        ['Ponpes', teacher.ponpes || "-"],
        ['Alamat', teacher.alamat || "-"],
    ];
    (doc as any).autoTable({ startY: 30, body, theme: 'grid' });
    doc.save(`detail_guru_${teacher.nig}.pdf`);
  };

  const handlePrint = () => {
    if (!teacher) return;
    const dateNow = format(new Date(), "dd MMMM yyyy", { locale: dfnsId });
    const content = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; font-size: 12px; padding: 40px; }
            .header { display: flex; align-items: center; gap: 20px; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
            .avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; }
            .qr { width: 100px; height: 100px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 10px; border-bottom: 1px solid #f0f0f0; }
            .label { font-weight: bold; width: 150px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <img class="avatar" src="${teacher.avatarUrl || ''}" />
            <div style="flex: 1"><h1>${teacher.name}</h1><p>${teacher.jabatan}</p></div>
            <img class="qr" src="${qrDataUrl}" />
          </div>
          <table>
            <tr><td class="label">NIG</td><td>${teacher.nig}</td></tr>
            <tr><td class="label">NIK</td><td>${teacher.nik || '-'}</td></tr>
            <tr><td class="label">WhatsApp</td><td>${teacher.noWa || '-'}</td></tr>
            <tr><td class="label">Pendidikan</td><td>${teacher.pendidikan || '-'}</td></tr>
            <tr><td class="label">Ponpes</td><td>${teacher.ponpes || '-'}</td></tr>
            <tr><td class="label">Alamat</td><td>${teacher.alamat || '-'}</td></tr>
          </table>
          <p style="text-align: right; margin-top: 40px;">Dicetak pada: ${dateNow}</p>
        </body>
      </html>
    `;
    safePrint(content);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-[32px] border-none shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col bg-card">
          {/* Top Section: Identity Preview */}
          <div className="bg-primary/5 p-6 flex flex-col items-center text-center">
            <div className="flex w-full justify-between items-start mb-2">
                <DialogTitle className="sr-only">Profil {teacher.name}</DialogTitle>
                <div className="h-8" /> {/* Spacer */}
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/50">
                        <X className="h-4 w-4" />
                    </Button>
                </DialogClose>
            </div>
            
            <div className="relative mb-4">
                <Avatar className="h-28 w-28 border-4 border-white shadow-xl scale-110">
                    <AvatarImage src={teacher.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-primary/5 text-primary text-3xl font-bold">{teacher.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>

            <div className="space-y-1 mt-2">
                <h3 className="text-lg font-bold leading-tight uppercase text-primary tracking-tight">{teacher.name}</h3>
                <p className="text-xs font-semibold text-muted-foreground/80 tracking-wide">{teacher.jabatan || 'Guru Madrasah'}</p>
            </div>
            
            <div className="flex items-center gap-2 mt-4">
                <span className="text-[10px] font-bold bg-primary text-white px-4 py-1.5 rounded-full uppercase tracking-[0.1em] shadow-md shadow-primary/20">
                    NIG: {teacher.nig}
                </span>
            </div>
          </div>

          {/* Bottom Section: Detailed Info List */}
          <div className="px-6 py-2">
            <ScrollArea className="h-[320px] pr-2">
                <div className="py-2">
                    <InfoField label="Nomor Induk Kependudukan (NIK)" value={teacher.nik || ""} icon={UserCircle} />
                    <InfoField label="Alamat Email" value={teacher.email || ""} icon={Mail} />
                    <InfoField label="Nomor WhatsApp" value={teacher.noWa || ""} icon={Phone} />
                    <InfoField label="Pendidikan Terakhir" value={teacher.pendidikan || ""} icon={GraduationCap} />
                    <InfoField label="Latar Belakang Pondok" value={teacher.ponpes || ""} icon={BookOpen} />
                    <InfoField label="Alamat Domisili" value={teacher.alamat || ""} icon={MapPin} />
                </div>
                
                {qrDataUrl && (
                    <div className="mt-4 mb-6 p-5 rounded-[24px] bg-muted/20 border-2 border-dashed border-muted flex flex-col items-center gap-3">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID Barcode Absensi</p>
                        <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" />
                        <span className="text-[10px] font-mono font-bold text-primary/40 tracking-tighter">{teacher.nig}</span>
                    </div>
                )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer with actions */}
        <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 rounded-full hover:bg-destructive/10" onClick={handleDelete}>
                <Trash2 className="h-4.5 w-4.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 text-primary" onClick={handlePrint}>
                <Printer className="h-4.5 w-4.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
             <Button 
                size="sm" 
                className="h-10 rounded-full px-8 bg-primary hover:bg-primary/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20"
                onClick={handleEdit}
             >
                <Edit className="h-3.5 w-3.5 mr-2" /> Edit Profil
             </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

