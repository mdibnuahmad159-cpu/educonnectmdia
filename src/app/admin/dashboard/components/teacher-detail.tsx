
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
        <div className="space-y-1">
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Icon className="h-3 w-3 opacity-50" />
                {label}
            </label>
            <p className="text-xs font-semibold text-foreground/80 leading-relaxed pl-4.5 border-l border-primary/5 ml-1.5">{value || '-'}</p>
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
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[28px] border-none shadow-2xl">
        <div className="flex flex-col md:flex-row h-full min-h-[500px]">
          {/* Left Column: Detailed Info */}
          <div className="flex-1 p-8 bg-card">
            <div className="mb-6">
                <h2 className="text-xl font-bold font-headline text-primary">Detail Profil Guru</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Data Administrasi & Personalia</p>
            </div>
            
            <ScrollArea className="h-[360px] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    <InfoField label="NIG (ID Login)" value={teacher.nig} icon={Fingerprint} />
                    <InfoField label="NIK" value={teacher.nik || ""} icon={UserCircle} />
                    <InfoField label="Email" value={teacher.email || ""} icon={Mail} />
                    <InfoField label="WhatsApp" value={teacher.noWa || ""} icon={Phone} />
                    <InfoField label="Pendidikan Terakhir" value={teacher.pendidikan || ""} icon={GraduationCap} />
                    <InfoField label="Latar Belakang Ponpes" value={teacher.ponpes || ""} icon={BookOpen} />
                    <div className="sm:col-span-2">
                        <InfoField label="Alamat Lengkap" value={teacher.alamat || ""} icon={MapPin} />
                    </div>
                </div>
                {teacher.dokumenUrl && (
                    <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="text-[11px] font-bold text-primary uppercase">Dokumen Kepegawaian</span>
                        </div>
                        <a href={teacher.dokumenUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary underline">LIHAT FILE</a>
                    </div>
                )}
            </ScrollArea>
          </div>

          {/* Dashed Divider */}
          <div className="hidden md:block w-px border-l border-dashed border-muted h-[400px] my-auto" />

          {/* Right Column: Identity Preview */}
          <div className="w-full md:w-[260px] bg-muted/20 p-8 flex flex-col items-center text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-8">Pratinjau</p>
            
            <div className="relative mb-6">
                <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
                    <AvatarImage src={teacher.avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-primary/5 text-primary text-3xl font-bold">{teacher.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>

            <div className="space-y-1">
                <h3 className="text-base font-bold leading-tight uppercase text-primary">{teacher.name}</h3>
                <p className="text-xs font-medium text-muted-foreground">{teacher.jabatan || 'Guru Madrasah'}</p>
            </div>

            {/* QR Code Section */}
            <div className="mt-8 p-3 bg-white rounded-2xl shadow-sm border border-border flex flex-col items-center gap-2 group transition-all hover:shadow-md">
                {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-24 h-24" />
                ) : (
                    <div className="w-24 h-24 bg-muted animate-pulse rounded-lg" />
                )}
                <span className="text-[9px] font-mono font-bold opacity-40 group-hover:opacity-100 transition-opacity">{teacher.nig}</span>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <DialogFooter className="bg-muted/30 p-4 px-8 border-t flex flex-row items-center justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button 
                variant="ghost" 
                size="xs" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 px-4 font-bold text-[10px] uppercase"
                onClick={handleDelete}
            >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Hapus
            </Button>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex gap-2 mr-2">
                <Button variant="outline" size="xs" className="h-9 w-9 rounded-full" onClick={handleExportPdf}>
                    <FileDown className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="xs" className="h-9 w-9 rounded-full" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                </Button>
             </div>
             <DialogClose asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-full px-6 text-[11px] font-bold uppercase tracking-tight">Batal</Button>
             </DialogClose>
             <Button 
                size="sm" 
                className="h-9 rounded-full px-8 bg-primary hover:bg-primary/90 text-[11px] font-bold uppercase tracking-tight shadow-lg shadow-primary/20"
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
