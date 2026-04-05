
"use client";

import { useState, useMemo, useEffect } from "react";
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
    FileSignature,
    Users
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
    eventDate: string;
    eventTime: string;
    eventPlace: string;
    committeeName: string;
    chairmanName: string;
    committeeSecretaryName: string;
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
        committeeName: 'Panitia Pelaksana Haflatul Imtihan',
        chairmanName: '',
        committeeSecretaryName: '',
        eventDate: '',
        eventTime: '',
        eventPlace: '',
    });

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
            case 'undangan': return 'UNDANGAN';
            default: return '';
        }
    };

    const getDefaultContent = (type: LetterType) => {
        switch(type) {
            case 'keterangan': return 'Adalah benar-benar santri aktif di Madrasah Diniyah Takmiliyah Ula Ibnu Ahmad pada tahun ajaran aktif.';
            case 'pemberitahuan': return 'Dengan ini kami beritahukan kepada bapak/ibu wali murid bahwa sehubungan dengan datangnya bulan suci ramadhan, kegiatan belajar mengajar akan diliburkan sementara.';
            case 'izin': return 'Melalui surat ini kami bermaksud memohon izin untuk menggunakan sarana prasarana desa guna menunjang kegiatan panggung gembira santri.';
            case 'undangan': return 'Salam silaturrahim kami sampaikan teriring doa semoga Allah SWT. Senantiasa melimpahkan rahmat, taufik dan hidayahNya kepada kita, sehingga kita tetap diberi kenikmatan hidup dalam keadaan sehat walafiat Aamin.\n\nSehubungan akan dilaksanakannya HAFLATUL IMTIHAN Madrasah Diniyah IBNU AHMAD yang akan dilaksanakan pada :';
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
        let footerHtml = '';
        
        if (formData.type === 'keterangan' && selectedStudent) {
            dynamicContentHtml = `
                <p>Menerangkan dengan sebenarnya bahwa:</p>
                <table style="margin: 5px 40px; width: auto;">
                    <tbody>
                        <tr><td style="width: 120px;">Nama</td><td>: <strong>${selectedStudent.name}</strong></td></tr>
                        <tr><td>NIS</td><td>: ${selectedStudent.nis}</td></tr>
                        <tr><td>Kelas</td><td>: ${selectedStudent.kelas}</td></tr>
                        <tr><td>Alamat</td><td>: ${selectedStudent.address}</td></tr>
                    </tbody>
                </table>
                <p style="text-indent: 40px;">${formData.content.replace(/\n/g, '<br/>')}</p>
                <p>Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
            `;
            footerHtml = `
                <div class="footer">
                    <div class="sign-box">
                        <p>Kepala Madrasah,</p>
                        <div class="sign-space"></div>
                        <p class="sign-name">${kepalaMadrasah}</p>
                    </div>
                </div>
            `;
        } else if (formData.type === 'undangan') {
            const paragraphs = formData.content.split('\n\n');
            dynamicContentHtml = `
                <p style="text-indent: 40px; margin-bottom: 5px;">${paragraphs[0] || ''}</p>
                <p style="text-indent: 40px; margin-bottom: 5px;">${paragraphs[1] || ''}</p>
                <table style="margin: 5px 80px; width: auto;">
                    <tbody>
                        <tr><td style="width: 100px;">Hari</td><td>: ${formData.eventDate ? format(parseISO(formData.eventDate), "EEEE", { locale: dfnsId }) : '-'}</td></tr>
                        <tr><td>Tanggal</td><td>: ${formData.eventDate ? format(parseISO(formData.eventDate), "dd MMMM yyyy", { locale: dfnsId }) : '-'}</td></tr>
                        <tr><td>Jam</td><td>: ${formData.eventTime || '-'}</td></tr>
                        <tr><td>Tempat</td><td>: ${formData.eventPlace || '-'}</td></tr>
                    </tbody>
                </table>
                <p style="text-indent: 40px;">Demikian undangan ini kami buat. Atas perhatian Bapak/Ibu/Saudara(i) kami sampaikan banyak terimakasih.</p>
            `;
            footerHtml = `
                <div class="date-row">Sampang, ${dateFormatted}</div>
                <p style="text-align: center; margin-bottom: 10px; font-weight: bold;">${formData.committeeName || 'Panitia Pelaksana'}</p>
                <div class="sign-container">
                    <div class="sign-box">
                        <p>Ketua</p>
                        <div class="sign-space" style="height: 45px;"></div>
                        <p class="sign-name">${formData.chairmanName || '..........................'}</p>
                    </div>
                    <div class="sign-box">
                        <p>Sekretaris</p>
                        <div class="sign-space" style="height: 45px;"></div>
                        <p class="sign-name">${formData.committeeSecretaryName || '..........................'}</p>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 10px;">
                    <p>Mengetahui,</p>
                    <p>Kepala Madrasah</p>
                    <div class="sign-space" style="height: 45px;"></div>
                    <p class="sign-name">${kepalaMadrasah}</p>
                </div>
            `;
        } else {
            dynamicContentHtml = `
                <p style="text-indent: 40px; line-height: 1.2; margin-bottom: 8px;">${formData.content.replace(/\n/g, '<br/>')}</p>
                <p>Demikian surat ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>
            `;
            footerHtml = `
                <div class="footer">
                    <div class="sign-box">
                        <p>Kepala Madrasah,</p>
                        <div class="sign-space"></div>
                        <p class="sign-name">${kepalaMadrasah}</p>
                    </div>
                </div>
            `;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Surat - ${formData.subject}</title>
                    <style>
                        @page { size: A4; margin: 5mm; }
                        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.2; color: #000; margin: 0; padding: 10mm 15mm; }
                        .kop { text-align: center; margin-bottom: 5px; }
                        .kop img { width: 100%; max-height: 120px; object-fit: contain; }
                        
                        .meta-info { display: flex; justify-content: space-between; margin-bottom: 10px; }
                        .meta-left { width: 60%; }
                        .meta-right { text-align: right; }
                        
                        .title { text-align: center; text-decoration: underline; font-weight: bold; font-size: 14pt; margin-bottom: 3px; text-transform: uppercase; }
                        
                        .salutation { margin-bottom: 5px; font-weight: bold; }
                        .content { margin-bottom: 15px; text-align: justify; }
                        
                        .footer { display: flex; justify-content: flex-end; margin-top: 15px; }
                        .sign-container { display: flex; justify-content: space-between; text-align: center; }
                        .sign-box { text-align: center; width: 220px; }
                        .sign-space { height: 45px; }
                        .sign-name { font-weight: bold; text-decoration: underline; }
                        .date-row { text-align: right; margin-bottom: 3px; }
                    </style>
                </head>
                <body>
                    <div class="kop">
                        ${profile?.kopSuratUrl ? `<img src="${profile.kopSuratUrl}" />` : `
                            <h1 style="margin:0; font-size: 18pt; text-transform: uppercase;">${profile?.namaMadrasah || 'MADRASAH DINIYAH IBNU AHMAD'}</h1>
                            <p style="margin:2px 0; font-size: 10pt;">${profile?.alamat || 'Sampang, Jawa Timur'}</p>
                        `}
                    </div>

                    <div class="meta-info">
                        <div class="meta-left">
                            <table style="width: 100%;">
                                <tbody>
                                    <tr><td style="width: 80px; font-weight: bold; vertical-align: top;">Nomor</td><td style="vertical-align: top;">: ${formData.number || ''}</td></tr>
                                    <tr><td style="font-weight: bold; vertical-align: top;">Perihal</td><td style="vertical-align: top;">: <strong>${formData.subject || ''}</strong></td></tr>
                                </tbody>
                            </table>
                        </div>
                        ${formData.type !== 'undangan' ? `<div class="meta-right">Sampang, ${dateFormatted}</div>` : ''}
                    </div>

                    <div style="margin-bottom: 15px;">
                        Kepada Yth.<br/>
                        <strong>${formData.recipient || 'Bapak/Ibu/Saudara(i)'}</strong><br/>
                        Di_<br/>
                        Tempat
                    </div>

                    <div class="salutation">Assalamu'alaikum Warahmatullah Wabarakatuh.</div>

                    <div class="content">
                        ${dynamicContentHtml}
                    </div>

                    <div class="salutation">Wasalamu'alaikum Warahmatullah Wabarakatuh.</div>

                    ${footerHtml}
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
                                    <Input value={formData.number || ""} onChange={e => setFormData({...formData, number: e.target.value})} className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Tanggal Surat</label>
                                    <Input type="date" value={formData.date || ""} onChange={e => setFormData({...formData, date: e.target.value})} className="h-9" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Perihal</label>
                                <Input value={formData.subject || ""} onChange={e => setFormData({...formData, subject: e.target.value})} className="h-9" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Tujuan / Penerima</label>
                                <Input placeholder="Contoh: Bapak/Ibu/Saudara(i)" value={formData.recipient || ""} onChange={e => setFormData({...formData, recipient: e.target.value})} className="h-9" />
                            </div>

                            {formData.type === 'keterangan' && (
                                <div className="space-y-1.5 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                                    <label className="text-[10px] font-bold uppercase text-blue-700">Pilih Santri</label>
                                    <Select value={formData.studentId || ""} onValueChange={id => setFormData({...formData, studentId: id})}>
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
                                <div className="space-y-4 p-4 rounded-lg bg-green-50/50 border border-green-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-green-700">Tanggal Acara</label>
                                            <Input type="date" value={formData.eventDate || ""} onChange={e => setFormData({...formData, eventDate: e.target.value})} className="h-9 bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-green-700">Waktu</label>
                                            <Input placeholder="18:00 WIB (Ba'da Magrib)" value={formData.eventTime || ""} onChange={e => setFormData({...formData, eventTime: e.target.value})} className="h-9 bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-green-700">Tempat</label>
                                            <Input placeholder="Aula Madrasah" value={formData.eventPlace || ""} onChange={e => setFormData({...formData, eventPlace: e.target.value})} className="h-9 bg-white" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-green-700">Nama Panitia</label>
                                            <Input value={formData.committeeName || ""} onChange={e => setFormData({...formData, committeeName: e.target.value})} className="h-9 bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-green-700">Nama Ketua Panitia</label>
                                            <Input value={formData.chairmanName || ""} onChange={e => setFormData({...formData, chairmanName: e.target.value})} className="h-9 bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-green-700">Nama Sekretaris Panitia</label>
                                            <Input value={formData.committeeSecretaryName || ""} onChange={e => setFormData({...formData, committeeSecretaryName: e.target.value})} className="h-9 bg-white" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Narasi / Isi Utama</label>
                                <Textarea 
                                    rows={8} 
                                    value={formData.content || ""} 
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
                                <Users className="h-3 w-3" /> Info Tambahan
                            </h4>
                            <ul className="text-[11px] space-y-2 text-muted-foreground">
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                    Format surat undangan menggunakan tata letak panitia.
                                </li>
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                    Pastikan data hari dan tanggal acara sudah akurat.
                                </li>
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                    Ukuran font resmi adalah 12pt (Times New Roman).
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-6">
                    <Card className="max-w-[800px] mx-auto border shadow-lg overflow-hidden bg-white">
                        <div className="p-10 text-black text-[11px] leading-tight font-serif">
                            <div className="text-center mb-4">
                                {profile?.kopSuratUrl ? (
                                    <img src={profile.kopSuratUrl} className="w-full h-auto max-h-[100px] object-contain" alt="Kop Surat" />
                                ) : (
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-bold uppercase">{profile?.namaMadrasah || 'MADRASAH DINIYAH IBNU AHMAD'}</h2>
                                        <p className="text-[9px]">{profile?.alamat || 'Sampang, Jawa Timur'}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between mb-6">
                                <div className="space-y-0.5">
                                    <p><strong>Nomor</strong> : {formData.number}</p>
                                    <p><strong>Perihal</strong> : <strong>{formData.subject}</strong></p>
                                </div>
                                {formData.type !== 'undangan' && (
                                    <div>
                                        Sampang, {formData.date ? format(new Date(formData.date), "dd MMMM yyyy", { locale: dfnsId }) : '-'}
                                    </div>
                                )}
                            </div>

                            <div className="mb-6">
                                <p>Kepada Yth.</p>
                                <p><strong>{formData.recipient || 'Bapak/Ibu/Saudara(i)'}</strong></p>
                                <p>Di_</p>
                                <p>Tempat</p>
                            </div>

                            <p className="mb-4 font-bold">Assalamu'alaikum Warahmatullah Wabarakatuh.</p>

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
                                        <p>Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
                                    </>
                                ) : formData.type === 'undangan' ? (
                                    <>
                                        {formData.content.split('\n\n').map((p, i) => (
                                            <p key={i} className="text-justify indent-10">{p}</p>
                                        ))}
                                        <table className="ml-20">
                                            <tbody>
                                                <tr><td className="w-24">Hari</td><td>: {formData.eventDate ? format(parseISO(formData.eventDate), "EEEE", { locale: dfnsId }) : '-'}</td></tr>
                                                <tr><td>Tanggal</td><td>: {formData.eventDate ? format(parseISO(formData.eventDate), "dd MMMM yyyy", { locale: dfnsId }) : '-'}</td></tr>
                                                <tr><td>Jam</td><td>: {formData.eventTime || '-'}</td></tr>
                                                <tr><td>Tempat</td><td>: {formData.eventPlace || '-'}</td></tr>
                                            </tbody>
                                        </table>
                                        <p className="text-justify indent-10">Demikian undangan ini kami buat. Atas perhatian Bapak/Ibu/Saudara(i) kami sampaikan banyak terimakasih.</p>
                                    </>
                                ) : (
                                    <p className="text-justify indent-10">{formData.content}</p>
                                )}
                            </div>

                            <p className="mb-6 font-bold">Wasalamu'alaikum Warahmatullah Wabarakatuh.</p>

                            {formData.type === 'undangan' ? (
                                <div className="space-y-4">
                                    <div className="text-right">Sampang, {formData.date ? format(new Date(formData.date), "dd MMMM yyyy", { locale: dfnsId }) : '-'}</div>
                                    <p className="text-center font-bold">{formData.committeeName}</p>
                                    <div className="flex justify-between text-center">
                                        <div className="w-48">
                                            <p>Ketua</p>
                                            <div className="h-12"></div>
                                            <p className="font-bold underline">{formData.chairmanName || '..........................'}</p>
                                        </div>
                                        <div className="w-48">
                                            <p>Sekretaris</p>
                                            <div className="h-12"></div>
                                            <p className="font-bold underline">{formData.committeeSecretaryName || '..........................'}</p>
                                        </div>
                                    </div>
                                    <div className="text-center pt-4">
                                        <p>Mengetahui,</p>
                                        <p>Kepala Madrasah</p>
                                        <div className="h-12"></div>
                                        <p className="font-bold underline">{kepalaMadrasah}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-end">
                                    <div className="text-center w-48 space-y-12">
                                        <p>Kepala Madrasah,</p>
                                        <p className="font-bold underline">{kepalaMadrasah}</p>
                                    </div>
                                </div>
                            )}
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
