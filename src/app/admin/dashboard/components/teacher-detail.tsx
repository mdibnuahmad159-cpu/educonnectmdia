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
import { useFirestore } from "@/firebase";
import { updateTeacher } from "@/lib/firebase-helpers";
import { useToast } from "@/hooks/use-toast";

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
  const firestore = useFirestore();
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
    if (teacher?.nig) {
        QRCode.toDataURL(teacher.nig, {
            width: 512,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        }).then(setQrDataUrl).catch(err => console.error(err));
        
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
    }
    setIsEditing(false);
  }, [teacher, form, isOpen]);

  if (!teacher) return null;

  const handleSave = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !teacher) return;
    setIsSaving(true);
    try {
      const { ...dataToUpdate } = values;
      if (!dataToUpdate.password) delete dataToUpdate.password;
      
      await updateTeacher(firestore, teacher.id, dataToUpdate);
      toast({ title: "Profil Diperbarui", description: "Data guru berhasil disimpan." });
      setIsEditing(false);
      // Refresh teacher data in parent state if needed, though useCollection handles it
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-[32px] border-none shadow-2xl animate-in zoom-in-95 duration-300">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <div className="flex flex-col bg-card">
              {/* Top Section */}
              <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                <DialogTitle className="sr-only">Profil {teacher.name}</DialogTitle>
                
                <div className="relative mb-4">
                    <Avatar className="h-28 w-28 border-4 border-white shadow-xl scale-110">
                        <AvatarImage src={form.watch('avatarUrl') || teacher.avatarUrl} className="object-cover" />
                        <AvatarFallback className="bg-primary/5 text-primary text-3xl font-bold">{teacher.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {isEditing && (
                       <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                          <Edit className="h-3 w-3" />
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
                    )}
                </div>

                {isEditing ? (
                  <div className="w-full space-y-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormControl><Input {...field} className="text-center font-bold" placeholder="Nama Lengkap" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="jabatan" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger></FormControl>
                          <SelectContent>{jabatanOptions.map(opt => <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                ) : (
                  <div className="space-y-1 mt-2">
                      <h3 className="text-lg font-bold leading-tight uppercase text-primary tracking-tight">{teacher.name}</h3>
                      <p className="text-xs font-semibold text-muted-foreground/80 tracking-wide">{teacher.jabatan || 'Guru Madrasah'}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-4">
                    <span className="text-[10px] font-bold bg-primary text-white px-4 py-1.5 rounded-full uppercase tracking-[0.1em] shadow-md shadow-primary/20">
                        NIG: {isEditing ? form.watch('nig') : teacher.nig}
                    </span>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="px-6 py-2">
                <ScrollArea className="h-[320px] pr-2">
                    <div className="py-2">
                        {isEditing ? (
                           <div className="space-y-4 py-2">
                              <FormField control={form.control} name="nig" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px]">NIG</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name="nik" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px]">NIK</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px]">Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name="noWa" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px]">No. WhatsApp</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name="pendidikan" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px]">Pendidikan</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name="ponpes" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px]">Latar Belakang Pondok</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name="alamat" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px]">Alamat Domisili</FormLabel><FormControl><Textarea {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px]">Password Baru (Opsional)</FormLabel><FormControl><Input type="password" {...field} value={field.value || ""} placeholder="Isi untuk mengubah" /></FormControl><FormDescription className="text-[9px]">Minimal 6 karakter.</FormDescription><FormMessage /></FormItem>
                              )} />
                           </div>
                        ) : (
                          <>
                            <InfoField label="Nomor Induk Kependudukan (NIK)" value={teacher.nik || ""} icon={UserCircle} />
                            <InfoField label="Alamat Email" value={teacher.email || ""} icon={Mail} />
                            <InfoField label="Nomor WhatsApp" value={teacher.noWa || ""} icon={Phone} />
                            <InfoField label="Pendidikan Terakhir" value={teacher.pendidikan || ""} icon={GraduationCap} />
                            <InfoField label="Latar Belakang Pondok" value={teacher.ponpes || ""} icon={BookOpen} />
                            <InfoField label="Alamat Domisili" value={teacher.alamat || ""} icon={MapPin} />
                            <InfoField label="Password Portal" value="••••••••" icon={Fingerprint} />
                          </>
                        )}
                    </div>
                    
                    {!isEditing && qrDataUrl && (
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
              {isEditing ? (
                <>
                  <Button type="button" variant="ghost" className="rounded-full px-6 text-xs font-bold uppercase tracking-widest" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="h-3.5 w-3.5 mr-2" /> Batal
                  </Button>
                  <Button type="submit" className="h-10 rounded-full px-8 bg-green-600 hover:bg-green-700 text-xs font-bold uppercase tracking-widest shadow-lg shadow-green-600/20" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                    Simpan Perubahan
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-10 w-10 rounded-full hover:bg-destructive/10" onClick={() => onDelete(teacher.id)}>
                        <Trash2 className="h-4.5 w-4.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 text-primary" onClick={handlePrint}>
                        <Printer className="h-4.5 w-4.5" />
                    </Button>
                  </div>
                  <Button 
                    type="button"
                    size="sm" 
                    className="h-10 rounded-full px-8 bg-primary hover:bg-primary/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-2" /> Edit Profil
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
