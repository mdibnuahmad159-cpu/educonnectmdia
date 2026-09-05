"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Teacher } from "@/types";
import { 
  Trash2, 
  Edit, 
  Printer, 
  UserCircle, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  BookOpen,
  Fingerprint,
  Loader2,
  Save,
  X,
  Camera,
  FileDown,
  Contact
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, safePrint } from "@/lib/utils";
import QRCode from 'qrcode';
import { format } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { useFirestore } from "@/firebase";
import { updateTeacher } from "@/lib/firebase-helpers";
import { useToast } from "@/hooks/use-toast";
import { useSchoolProfile } from "@/context/school-profile-provider";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const jabatanOptions = [
  "Pengasuh",
  "Pengawas",
  "Kepala Madrasah",
  "Wakil Kepala Madrasah",
  "Sekretaris",
  "Bendahara",
  ...Array.from({ length: 7 }, (_, i) => `Wali Kelas ${i}`),
  "Guru",
];

const formSchema = z.object({
  nig: z.string().min(1, "NIG harus diisi"),
  name: z.string().min(1, "Nama harus diisi"),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "Password minimal 6 karakter jika diisi.",
  }),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
  jabatan: z.string().optional(),
  noWa: z.string().optional(),
  nik: z.string().optional(),
  pendidikan: z.string().optional(),
  ponpes: z.string().optional(),
  alamat: z.string().optional(),
  dokumenUrl: z.string().optional().or(z.literal("")),
});

type TeacherDetailProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  teacher: Teacher | null;
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
};

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.87 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

function formatWaLink(phone?: string) {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, "");
    const final = cleaned.startsWith("0") ? "62" + cleaned.slice(1) : cleaned;
    return `https://wa.me/${final}`;
}

function InfoField({ label, value, icon: Icon, isWA = false }: { label: string; value: string; icon: any; isWA?: boolean }) {
    const waLink = isWA ? formatWaLink(value) : null;

    return (
        <div className="flex items-center gap-4 py-3.5 border-b border-muted/60 last:border-0">
            <div className="p-2.5 bg-primary/5 rounded-xl text-primary shrink-0">
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
                {waLink ? (
                    <a 
                        href={waLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700 transition-colors uppercase"
                    >
                        <WhatsAppIcon />
                        {value || '-'}
                    </a>
                ) : (
                    <p className="text-xs font-semibold text-foreground/80 leading-snug">{value || '-'}</p>
                )}
            </div>
        </div>
    );
}

export function TeacherDetail({ isOpen, setIsOpen, teacher, onEdit, onDelete }: TeacherDetailProps) {
  const firestore = useFirestore();
  const { profile } = useSchoolProfile();
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nig: "", name: "", email: "", password: "", avatarUrl: "", jabatan: "", noWa: "", nik: "",
      pendidikan: "", ponpes: "", alamat: "", dokumenUrl: "",
    },
  });

  useEffect(() => {
    if (isOpen && teacher && !isEditing) {
      form.reset({
        nig: teacher.nig || "",
        name: teacher.name,
        email: teacher.email || "",
        password: "",
        avatarUrl: teacher.avatarUrl || "",
        jabatan: teacher.jabatan || "",
        noWa: teacher.noWa || "",
        nik: teacher.nik || "",
        pendidikan: teacher.pendidikan || "",
        ponpes: teacher.ponpes || "",
        alamat: teacher.alamat || "",
        dokumenUrl: teacher.dokumenUrl || "",
      });

      if (teacher.nig) {
        QRCode.toDataURL(teacher.nig, {
          width: 512,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        }).then(setQrDataUrl).catch(err => console.error(err));
      }
    }
  }, [isOpen, teacher, form, isEditing]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  if (!teacher) return null;

  const handleSaveSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !teacher) return;
    setIsSaving(true);
    try {
      const dataToUpdate = { ...values };
      if (!dataToUpdate.password) delete dataToUpdate.password;
      
      await updateTeacher(firestore, teacher.id, dataToUpdate);
      toast({ title: "Profil Diperbarui", description: "Data guru berhasil disimpan." });
      setIsEditing(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Memperbarui", description: error.message });
    } finally {
      setIsSaving(false);
    }
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

  const handlePrintIDCard = () => {
      if (!teacher) return;
      const schoolName = profile?.namaMadrasah || "MADRASAH DINIYAH IBNU AHMAD";
      
      // Pembersihan gelar Ust. atau Ustzh. dari tampilan cetak
      const cleanedName = teacher.name.replace(/Ust\.\s*/i, '').replace(/Ustzh\.\s*/i, '').trim();

      const idCardHtml = `
          <html>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    @page { 
                        size: A4 portrait; 
                        margin: 0; 
                    }
                    html, body {
                        height: 100%;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                    }
                    body { 
                        font-family: 'PT Sans', sans-serif; 
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: white;
                        -webkit-print-color-adjust: exact;
                    }
                    .card {
                        width: 54mm;
                        height: 86mm;
                        position: relative;
                        background: #ffffff;
                        display: flex;
                        flex-direction: column;
                        border: 0.2mm solid #ddd;
                        border-radius: 2mm;
                        overflow: hidden;
                        box-sizing: border-box;
                    }
                    .top-section {
                        height: 62mm;
                        background: #004D40; 
                        color: #ffffff;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding-top: 6mm;
                        position: relative;
                    }
                    .school-name {
                        font-size: 7.5pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.5pt;
                        text-align: center;
                        margin-bottom: 1mm;
                        width: 90%;
                        line-height: 1.1;
                    }
                    .card-title {
                        font-size: 6pt;
                        opacity: 0.7;
                        text-transform: uppercase;
                        margin-bottom: 5mm;
                        letter-spacing: 1pt;
                    }
                    .photo-container {
                        width: 18mm;
                        height: 18mm;
                        background: #fff;
                        border: 0.8mm solid #ffffff;
                        border-radius: 50%;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 4mm;
                    }
                    .photo-container img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    .info-area {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        width: 90%;
                        margin-top: 1mm;
                    }
                    .name {
                        font-size: 9.5pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        line-height: 1.2;
                        margin-bottom: 1mm;
                    }
                    .nig-main {
                        font-size: 8pt;
                        font-family: monospace;
                        opacity: 0.9;
                        margin-bottom: 2mm;
                        font-weight: normal;
                    }
                    .jabatan {
                        font-size: 7pt;
                        opacity: 0.8;
                        text-transform: uppercase;
                        letter-spacing: 0.5pt;
                        background: rgba(255,255,255,0.1);
                        padding: 0.6mm 3mm;
                        border-radius: 1mm;
                    }
                    .bottom-section {
                        flex: 1;
                        background: #ffffff;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 2mm;
                    }
                    .qr-container {
                        width: 18mm;
                        height: 18mm;
                        margin-bottom: 1mm;
                    }
                    .qr-container img {
                        width: 100%;
                        height: 100%;
                    }
                    .barcode-label {
                        font-size: 6pt;
                        font-weight: 700;
                        color: #004D40;
                        opacity: 0.4;
                        text-transform: uppercase;
                        letter-spacing: 0.5pt;
                    }
                    @media print {
                        body { height: 100vh; width: 100vw; }
                        .card { border: 0.2mm solid #004D40; }
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="top-section">
                        <div class="school-name">${schoolName}</div>
                        <div class="card-title">Kartu Identitas Guru</div>
                        
                        <div class="photo-container">
                            <img src="${teacher.avatarUrl || 'https://placehold.co/400x400?text=FOTO'}" />
                        </div>
                        
                        <div class="info-area">
                            <div class="name">${cleanedName}</div>
                            <div class="nig-main">${teacher.nig}</div>
                            <div class="jabatan">${teacher.jabatan || 'Pendidik'}</div>
                        </div>
                    </div>
                    <div class="bottom-section">
                        <div class="qr-container">
                            ${qrDataUrl ? `<img src="${qrDataUrl}" />` : ''}
                        </div>
                        <div class="barcode-label">Barcode Absensi</div>
                    </div>
                </div>
            </body>
          </html>
      `;
      safePrint(idCardHtml);
  };

  const handleExportPdf = () => {
    if (!teacher) return;
    const doc = new jsPDF();
    const dateNow = format(new Date(), "dd MMMM yyyy", { locale: dfnsId });

    doc.setFontSize(18);
    doc.setTextColor(22, 101, 52); // primary color
    doc.text("BIODATA GURU MADRASAH", 105, 20, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Dicetak pada: ${dateNow}`, 195, 10, { align: 'right' });

    (doc as any).autoTable({
      startY: 30,
      head: [['Informasi', 'Detail Data']],
      body: [
        ['NIG (ID Login)', teacher.nig],
        ['Nama Lengkap', teacher.name],
        ['NIK', teacher.nik || '-'],
        ['Jabatan', teacher.jabatan || '-'],
        ['Email', teacher.email || '-'],
        ['WhatsApp', teacher.noWa || '-'],
        ['Pendidikan Terakhir', teacher.pendidikan || '-'],
        ['Asal Ponpes', teacher.ponpes || '-'],
        ['Alamat Domisili', teacher.alamat || '-'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [22, 101, 52] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
    });

    if (qrDataUrl) {
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.addImage(qrDataUrl, 'PNG', 85, finalY, 40, 40);
      doc.setFontSize(9);
      doc.text("ID Absensi (Scan Barcode)", 105, finalY + 45, { align: 'center' });
    }

    doc.save(`Biodata_Guru_${teacher.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-[32px] border-none shadow-2xl animate-in zoom-in-95 duration-300">
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveSubmit)} className="flex flex-col bg-card">
              <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                <DialogTitle className="sr-only">Edit Profil {teacher.name}</DialogTitle>
                
                <div className="relative mb-4">
                    <Avatar className="h-28 w-28 border-4 border-white shadow-xl scale-110">
                        <AvatarImage src={form.watch('avatarUrl') || teacher.avatarUrl} className="object-cover" />
                        <AvatarFallback className="bg-primary/5 text-primary text-3xl font-bold">{teacher.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform flex items-center justify-center">
                        <Camera className="h-3.5 w-3.5" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                      const img = new Image();
                                      img.src = event.target?.result as string;
                                      img.onload = () => {
                                          const canvas = document.createElement('canvas');
                                          const MAX_WIDTH = 512;
                                          const scale = MAX_WIDTH / img.width;
                                          canvas.width = MAX_WIDTH;
                                          canvas.height = img.height * scale;
                                          const ctx = canvas.getContext('2d');
                                          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                                          form.setValue('avatarUrl', canvas.toDataURL('image/jpeg', 0.8));
                                      };
                                  };
                                  reader.readAsDataURL(file);
                              }
                          }}
                        />
                    </label>
                </div>

                <div className="w-full space-y-2 px-6">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormControl><Input {...field} className="text-center font-bold bg-white h-9" placeholder="Nama Lengkap" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="jabatan" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger></FormControl>
                        <SelectContent>{jabatanOptions.map(opt => <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                    <span className="text-[10px] font-bold bg-primary text-white px-4 py-1.5 rounded-full uppercase tracking-[0.1em] shadow-md shadow-primary/20">
                        NIG: {form.watch('nig')}
                    </span>
                </div>
              </div>

              <div className="px-6 py-2">
                <ScrollArea className="h-[320px] pr-2">
                    <div className="space-y-4 py-4">
                        <FormField control={form.control} name="nig" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">NIG (Nomor Induk Guru)</FormLabel><FormControl><Input {...field} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="nik" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nomor Induk Kependudukan (NIK)</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Alamat Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="noWa" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nomor WhatsApp</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="pendidikan" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Pendidikan Terakhir</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="ponpes" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Latar Belakang Pondok</FormLabel><FormControl><Input {...field} value={field.value || ""} className="bg-white h-9" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="alamat" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Alamat Domisili</FormLabel><FormControl><Textarea {...field} value={field.value || ""} className="bg-white min-h-[80px]" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="password" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Password Baru (Opsional)</FormLabel><FormControl><Input type="password" {...field} value={field.value || ""} placeholder="Isi untuk mengubah password" className="bg-white h-9" /></FormControl><FormDescription className="text-[9px]">Minimal 6 karakter jika ingin mengganti.</FormDescription><FormMessage /></FormItem>
                        )} />
                    </div>
                </ScrollArea>
              </div>

              <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3">
                  <Button type="button" variant="ghost" className="rounded-full px-6 text-xs font-bold uppercase tracking-widest h-10" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="h-3.5 w-3.5 mr-2" /> Batal
                  </Button>
                  <Button type="submit" className="h-10 rounded-full px-8 bg-green-600 hover:bg-green-700 text-xs font-bold uppercase tracking-widest shadow-lg shadow-green-600/20 text-white" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                    Simpan Perubahan
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
              <DialogTitle className="sr-only">Profil {teacher.name}</DialogTitle>
              
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

            <div className="px-6 py-2">
              <ScrollArea className="h-[320px] pr-2">
                  <div className="py-2">
                      <InfoField label="Nomor Induk Kependudukan (NIK)" value={teacher.nik || ""} icon={UserCircle} />
                      <InfoField label="Alamat Email" value={teacher.email || ""} icon={Mail} />
                      <InfoField label="Nomor WhatsApp" value={teacher.noWa || ""} icon={Phone} isWA={true} />
                      <InfoField label="Pendidikan Terakhir" value={teacher.pendidikan || ""} icon={GraduationCap} />
                      <InfoField label="Latar Belakang Pondok" value={teacher.ponpes || ""} icon={BookOpen} />
                      <InfoField label="Alamat Domisili" value={teacher.alamat || ""} icon={MapPin} />
                      <InfoField label="Password Portal" value="••••••••" icon={Fingerprint} />
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

            <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3">
                <div className="flex flex-wrap gap-1">
                  <Button type="button" variant="ghost" size="icon" className="text-destructive h-10 w-10 rounded-full hover:bg-destructive/10" title="Hapus Guru" onClick={() => onDelete(teacher.id)}>
                      <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 text-primary" title="Cetak Bio" onClick={handlePrint}>
                      <Printer className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 text-primary" title="Cetak ID Card" onClick={handlePrintIDCard}>
                      <Contact className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 text-primary" title="Export PDF" onClick={handleExportPdf}>
                      <FileDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  type="button"
                  size="sm" 
                  className="h-10 rounded-full px-8 bg-primary hover:bg-primary/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 text-white"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3.5 w-3.5 mr-2" /> Edit Profil
                </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
