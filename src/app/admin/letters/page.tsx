
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, Firestore } from "firebase/firestore";
import type { Student, Teacher, SchoolProfile } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
    FileText, 
    Mail, 
    Bell, 
    CalendarCheck, 
    UserCheck, 
    Printer, 
    Loader2, 
    ArrowLeft,
    Send,
    Plus,
    FileSignature
} from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { cn } from "@/lib/utils";

type LetterType = 'keterangan' | 'pemberitahuan' | 'izin' | 'undangan';

interface LetterData {
    type: LetterType;
    number: string;
    date: string;
    subject: string;
    attachment: string;
    recipient: string;
    studentId?: string;
    content: string;
    // Specific fields for Invitation
    eventDate?: string;
    eventTime?: string;
    eventPlace?: string;
}

export default function LettersPage() {
    const firestore = useFirestore() as Firestore;
    const { profile } = useSchoolProfile();
    
    const [step, setStep] = useState<'selection' | 'form' | 'preview'>('selection');
    const [selectedType, setSelectedType] = useState<LetterType | null>(null);
    const [formData, setFormData] = useState<LetterData>({
        type: 'keterangan',
        number: `/MDTU-IA/${new Date().getFullYear()}`,
        date: new Date().toISOString().split('T')[0],
        subject: '',
        attachment: '-',
        recipient: '',
        content: '',
    });

    // Data fetching
    const studentsQuery = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsQuery);

    const teachersQuery = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
    const { data: teachers } = useCollection<Teacher>(teachersQuery);

    const kepalaMadrasah = useMemo(() => {
        return teachers?.find(t => t.jabatan === 'Kepala Madrasah')?.name || "..........................";
    }, [teachers]);

    const handleSelectType = (type: LetterType) => {
        setSelectedType(type);
        setFormData(prev => ({
            ...prev,
            type,
            subject: getDefaultSubject(type),
            content: getDefaultContent(type),
        }));
        setStep('form');
    };

    const getDefaultSubject = (type: LetterType) => {
        switch(type) {
            case 'keterangan': return 'Surat Keterangan Belajar';
            case 'pemberitahuan': return 'Pemberitahuan Kegiatan Madrasah';
            case 'izin': return 'Permohonan Izin Penggunaan Tempat';
            case 'undangan': return 'Undangan Wali Murid';
            default: return '';
        }
    };

    const getDefaultContent = (type: LetterType) => {
        switch(type) {
            case 'keterangan': return 'Adalah benar-benar santri aktif di Madrasah Diniyah Takmiliyah Ula Ibnu Ahmad pada tahun ajaran aktif.';
            case 'pemberitahuan': return 'Dengan ini kami beritahukan kepada bapak/ibu wali murid bahwa sehubungan dengan datangnya bulan suci ramadhan, kegiatan belajar mengajar akan diliburkan sementara.';
            case 'izin': return 'Melalui surat ini kami bermaksud memohon izin untuk menggunakan sarana prasarana desa guna menunjang kegiatan panggung gembira santri.';
            case 'undangan': return 'Kami mengharap kehadiran Bapak/Ibu pada acara rapat koordinasi wali murid yang akan dilaksanakan pada:';
            default: return '';
        }
    };

    const selectedStudent = useMemo(() => {
        return students?.find(s => s.id === formData.studentId);
    }, [students, formData.studentId]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const dateFormatted = format(parseISO(formData.date), "dd MMMM yyyy", { locale: dfnsId });
        
        let dynamicContentHtml = '';
        
        if (formData.type === 'keterangan' && selectedStudent) {
            dynamicContentHtml = `
                <p>Menerangkan dengan sebenarnya bahwa:</p>
                <table style="margin: 20px 40px; width: auto;">
                    <tbody>
                        <tr><td style="width: 120px;">Nama</td><td>: <strong>${selectedStudent.name}</strong></td></tr>
                        <tr><td>NIS</td><td>: ${selectedStudent.nis}</td></tr>
                        <tr><td>Kelas</td><td>: ${selectedStudent.kelas}</td></tr>
                        <tr><td>Alamat</td><td>: ${selectedStudent.address}</td></tr>
                    </tbody>
                </table>
                <p style="text-indent: 40px;">${formData.content}</p>
                <p>Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
            `;
        } else if (formData.type === 'undangan') {
            dynamicContentHtml = `
                <p style="text-indent: 40px;">${formData.content}</p>
                <table style="margin: 20px 40px; width: auto;">
                    <tbody>
                        <tr><td style="width: 120px;">Hari, Tanggal</td><td>: ${formData.eventDate ? format(parseISO(formData.eventDate), "EEEE, dd MMMM yyyy", { locale: dfnsId }) : '-'}</td></tr>
                        <tr><td>Waktu</td><td>: ${formData.eventTime || '-'}</td></tr>
                        <tr><td>Tempat</td><td>: ${formData.eventPlace || '-'}</td></tr>
                    </tbody>
                </table>
                <p>Demikian undangan ini kami sampaikan, atas perhatian dan kehadirannya kami ucapkan terima kasih.</p>
            `;
        } else {
            dynamicContentHtml = `
                <p style="text-indent: 40px; line-height: 1.6;">${formData.content}</p>
                <p>Demikian surat ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>
            `;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Surat - ${formData.subject}</title>
                    <style>
                        @page { size: A4; margin: 20mm; }
                        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000; }
                        .kop { text-align: center; margin-bottom: 20px; padding-bottom: 10px; }
                        .kop img { width: 100%; max-height: 120px; object-fit: contain; }
                        .kop h1 { margin: 0; font-size: 18pt; text-transform: uppercase; }
                        .kop p { margin: 2px 0; font-size: 10pt; }
                        
                        .meta-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
                        .meta-left { width: 60%; }
                        .meta-right { text-align: right; }
                        
                        .title { text-align: center; text-decoration: underline; font-weight: bold; font-size: 14pt; margin-bottom: 5px; text-transform: uppercase; }
                        .ref-number { text-align: center; margin-bottom: 30px; font-size: 11pt; }
                        
                        .salutation { margin-bottom: 15px; }
                        .content { margin-bottom: 40px; text-align: justify; }
                        
                        .footer { display: flex; justify-content: flex-end; margin-top: 50px; }
                        .sign-box { text-align: center; width: 250px; }
                        .sign-space { height: 80px; }
                        .sign-name { font-weight: bold; text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <div class="kop">
                        ${profile?.kopSuratUrl ? `<img src="${profile.kopSuratUrl}" />` : `
                            <h1>${profile?.namaMadrasah || 'MADRASAH DINIYAH IBNU AHMAD'}</h1>
                            <p>${profile?.alamat || 'Sampang, Jawa Timur'}</p>
                        `}
                    </div>

                    <div class="meta-info">
                        <div class="meta-left">
                            <table>
                                <tbody>
                                    <tr><td>Nomor</td><td>: ${formData.number}</td></tr>
                                    <tr><td>Lampiran</td><td>: ${formData.attachment}</td></tr>
                                    <tr><td>Perihal</td><td>: <strong>${formData.subject}</strong></td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="meta-right">
                            Sampang, ${dateFormatted}
                        </div>
                    </div>

                    ${formData.recipient ? `<div style="margin-bottom: 25px;">Kepada Yth.<br/><strong>${formData.recipient}</strong><br/>di Tempat</div>` : ''}

                    <div class="salutation">Assalamu'alaikum Wr. Wb.</div>

                    <div class="content">
                        ${dynamicContentHtml}
                    </div>

                    <div class="salutation">Wassalamu'alaikum Wr. Wb.</div>

                    <div class="footer">
                        <div class="sign-box">
                            <p>Kepala Madrasah,</p>
                            <div class="sign-space"></div>
                            <p class="sign-name">${kepalaMadrasah}</p>
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-headline text-primary font-bold">Layanan Surat</h1>
                    <p className="text-xs text-muted-foreground">Pembuatan surat keluar resmi madrasah secara otomatis.</p>
                </div>
                {step !== 'selection' && (
                    <Button variant="outline" size="sm" onClick={() => setStep('selection')} className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Kembali
                    </Button>
                )}
            </div>

            {step === 'selection' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { id: 'keterangan', title: 'Surat Keterangan', desc: 'Surat aktif belajar untuk santri.', icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { id: 'pemberitahuan', title: 'Pemberitahuan', desc: 'Informasi pengumuman sekolah.', icon: Bell, color: 'text-orange-600', bg: 'bg-orange-50' },
                        { id: 'izin', title: 'Permohonan Izin', desc: 'Surat permohonan delegasi/tempat.', icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { id: 'undangan', title: 'Surat Undangan', desc: 'Undangan rapat atau kegiatan.', icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-50' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleSelectType(item.id as LetterType)}
                            className="flex flex-col text-left p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
                        >
                            <div className={cn("p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform", item.bg)}>
                                <item.icon className={cn("h-6 w-6", item.color)} />
                            </div>
                            <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                            <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                        </button>
                    ))}
                </div>
            )}

            {step === 'form' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-none shadow-sm">
                        <CardHeader className="border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="h-5 w-5 text-primary" /> Detail Isi Surat
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Nomor Surat</label>
                                    <Input value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Tanggal Surat</label>
                                    <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-9" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Perihal</label>
                                <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="h-9" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Tujuan / Penerima</label>
                                <Input placeholder="Contoh: Orang Tua Santri / Bapak Kepala Desa" value={formData.recipient} onChange={e => setFormData({...formData, recipient: e.target.value})} className="h-9" />
                            </div>

                            {formData.type === 'keterangan' && (
                                <div className="space-y-1.5 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                                    <label className="text-[10px] font-bold uppercase text-blue-700">Pilih Santri</label>
                                    <Select value={formData.studentId} onValueChange={id => setFormData({...formData, studentId: id})}>
                                        <SelectTrigger className="h-10 bg-white">
                                            <SelectValue placeholder="Cari nama santri..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {students?.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.nis})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {formData.type === 'undangan' && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-green-50/50 border border-green-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-green-700">Tanggal Acara</label>
                                        <Input type="date" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} className="h-9 bg-white" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-green-700">Waktu</label>
                                        <Input placeholder="08:00 - Selesai" value={formData.eventTime} onChange={e => setFormData({...formData, eventTime: e.target.value})} className="h-9 bg-white" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-green-700">Tempat</label>
                                        <Input placeholder="Aula Madrasah" value={formData.eventPlace} onChange={e => setFormData({...formData, eventPlace: e.target.value})} className="h-9 bg-white" />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Narasi / Isi Utama</label>
                                <Textarea 
                                    rows={6} 
                                    value={formData.content} 
                                    onChange={e => setFormData({...formData, content: e.target.value})} 
                                    className="resize-none"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4 bg-muted/5 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setStep('selection')} className="text-xs">Batal</Button>
                            <Button onClick={() => setStep('preview')} className="text-xs gap-2">
                                <ArrowLeft className="h-3.5 w-3.5 rotate-180" /> Pratinjau Surat
                            </Button>
                        </CardFooter>
                    </Card>

                    <div className="space-y-4">
                        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <FileSignature className="h-4 w-4" /> Penandatangan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="space-y-1">
                                    <p className="text-xs opacity-80">Kepala Madrasah Saat Ini:</p>
                                    <p className="font-bold">{kepalaMadrasah}</p>
                                </div>
                                <p className="text-[10px] mt-4 opacity-70 italic leading-relaxed">
                                    Nama ini akan muncul otomatis di bagian bawah surat sebagai pihak yang bertanggung jawab.
                                </p>
                            </CardContent>
                        </Card>

                        <div className="p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                <Plus className="h-3 w-3" /> Tips Pembuatan
                            </h4>
                            <ul className="text-[11px] space-y-2 text-muted-foreground">
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                    Pastikan nomor surat sudah sesuai dengan buku agenda surat keluar.
                                </li>
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                    Gunakan bahasa yang baku dan sopan.
                                </li>
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                    Pratinjau sebelum mencetak untuk memastikan tata letak sudah pas.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-6">
                    <Card className="max-w-[800px] mx-auto border shadow-lg overflow-hidden bg-white">
                        <div className="p-10 text-black text-xs leading-relaxed font-serif">
                            {/* Kop Surat */}
                            <div className="text-center mb-6 pb-4">
                                {profile?.kopSuratUrl ? (
                                    <img src={profile.kopSuratUrl} className="w-full h-auto max-h-[100px] object-contain" alt="Kop Surat" />
                                ) : (
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-bold uppercase">{profile?.namaMadrasah || 'MADRASAH DINIYAH IBNU AHMAD'}</h2>
                                        <p className="text-[9px]">{profile?.alamat || 'Sampang, Jawa Timur'}</p>
                                    </div>
                                )}
                            </div>

                            {/* Meta Info */}
                            <div className="flex justify-between mb-8">
                                <div className="space-y-0.5">
                                    <p>Nomor : {formData.number}</p>
                                    <p>Lamp. : {formData.attachment}</p>
                                    <p>Hal : <strong>{formData.subject}</strong></p>
                                </div>
                                <div>
                                    Sampang, {formData.date ? format(new Date(formData.date), "dd MMMM yyyy", { locale: dfnsId }) : '-'}
                                </div>
                            </div>

                            {/* Recipient */}
                            <div className="mb-6">
                                <p>Kepada Yth.</p>
                                <p><strong>{formData.recipient || '..........................'}</strong></p>
                                <p>di Tempat</p>
                            </div>

                            {/* Salutation */}
                            <p className="mb-4">Assalamu'alaikum Wr. Wb.</p>

                            {/* Dynamic Content */}
                            <div className="mb-8 space-y-4">
                                {formData.type === 'keterangan' && selectedStudent ? (
                                    <>
                                        <p>Menerangkan dengan sebenarnya bahwa:</p>
                                        <table className="ml-10">
                                            <tbody>
                                                <tr><td className="w-24">Nama</td><td>: <strong>{selectedStudent.name}</strong></td></tr>
                                                <tr><td>NIS</td><td>: {selectedStudent.nis}</td></tr>
                                                <tr><td>Kelas</td><td>: {selectedStudent.kelas}</td></tr>
                                            </tbody>
                                        </table>
                                        <p className="text-justify indent-10">{formData.content}</p>
                                    </>
                                ) : formData.type === 'undangan' ? (
                                    <>
                                        <p className="text-justify indent-10">{formData.content}</p>
                                        <table className="ml-10">
                                            <tbody>
                                                <tr><td className="w-24">Hari, Tanggal</td><td>: {formData.eventDate ? format(new Date(formData.eventDate), "EEEE, dd MMMM yyyy", { locale: dfnsId }) : '-'}</td></tr>
                                                <tr><td>Waktu</td><td>: {formData.eventTime || '-'}</td></tr>
                                                <tr><td>Tempat</td><td>: {formData.eventPlace || '-'}</td></tr>
                                            </tbody>
                                        </table>
                                    </>
                                ) : (
                                    <p className="text-justify indent-10">{formData.content}</p>
                                )}
                                <p>Demikian surat ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>
                            </div>

                            <p className="mb-10">Wassalamu'alaikum Wr. Wb.</p>

                            {/* Footer Sign */}
                            <div className="flex justify-end">
                                <div className="text-center w-48 space-y-16">
                                    <p>Kepala Madrasah,</p>
                                    <p className="font-bold underline">{kepalaMadrasah}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => setStep('form')} className="gap-2">
                            <ArrowLeft className="h-4 w-4" /> Edit Kembali
                        </Button>
                        <Button onClick={handlePrint} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                            <Printer className="h-4 w-4" /> Cetak Sekarang
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
