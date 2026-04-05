
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore } from "firebase/firestore";
import type { Student, Teacher } from "@/types";
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
    Mail, 
    Bell, 
    CalendarCheck, 
    UserCheck, 
    Printer, 
    ArrowLeft,
    Plus,
    FileSignature,
    ListTodo,
    Info
} from "lucide-react";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAcademicYear } from "@/context/academic-year-provider";

type LetterType = 'keterangan' | 'pemberitahuan' | 'izin' | 'undangan';

interface LetterData {
    type: LetterType;
    number: string;
    date: string;
    subject: string;
    attachment: string;
    recipient: string;
    studentId: string;
    content: string;
    footerNote: string; 
    studentList: string; 
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
    const { activeYear } = useAcademicYear();
    
    const [step, setStep] = useState<'selection' | 'form' | 'preview'>('selection');
    const [selectedType, setSelectedType] = useState<LetterType | null>(null);
    
    const schoolName = profile?.namaMadrasah || "Madrasah Diniyah Takmiliyah Ula Ibnu Ahmad";
    const formalSchoolName = "Madrasah Diniyah Takmiliyah Ula Ibnu Ahmad";
    
    const [formData, setFormData] = useState<LetterData>({
        type: 'keterangan',
        number: `/MDT-ULA-IA/${new Date().getFullYear()}`,
        date: new Date().toISOString().split('T')[0],
        subject: '',
        attachment: '-',
        recipient: '',
        studentId: '',
        content: '',
        footerNote: '',
        studentList: '',
        committeeName: 'Panitia Pelaksana Haflatul Imtihan',
        chairmanName: '',
        committeeSecretaryName: '',
        eventDate: '',
        eventTime: '',
        eventPlace: '',
    });

    const dateFormatted = useMemo(() => {
        if (!formData.date) return "";
        try {
            return format(parseISO(formData.date), "d MMMM yyyy", { locale: dfnsId });
        } catch (e) {
            return "";
        }
    }, [formData.date]);

    const studentsQuery = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
    const { data: students } = useCollection<Student>(studentsQuery);

    const teachersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, "teachers");
    }, [firestore]);
    const { data: teachers } = useCollection<Teacher>(teachersQuery);

    const kepalaMadrasah = useMemo(() => {
        return teachers?.find(t => t.jabatan === 'Kepala Madrasah')?.name || "..........................";
    }, [teachers]);

    const handleSelectType = (type: LetterType) => {
        setSelectedType(type);
        setFormData({
            type,
            number: `/MDT-ULA-IA/${new Date().getFullYear()}`,
            date: new Date().toISOString().split('T')[0],
            subject: getDefaultSubject(type),
            content: getDefaultContent(type),
            attachment: '-',
            recipient: type === 'pemberitahuan' ? 'Orang Tua/Wali Murid' : type === 'keterangan' ? 'Bapak/Ibu/Saudara(i)' : '',
            studentId: '',
            footerNote: type === 'pemberitahuan' ? 'kepada siswa siswi yang memiliki tanggungan administrasi(spp,ujian,kitab dll) dimohon untuk segera melunasi.' : '',
            studentList: type === 'izin' ? "1. Nama Siswa 1\tKelas : 5 (Lima)\n2. Nama Siswa 2\tKelas : 4 (Empat)" : "",
            committeeName: 'Panitia Pelaksana Haflatul Imtihan',
            chairmanName: "",
            committeeSecretaryName: "",
            eventDate: "",
            eventTime: "",
            eventPlace: "",
        });
        setStep('form');
    };

    const getDefaultSubject = (type: LetterType) => {
        switch(type) {
            case 'keterangan': return 'Surat Keterangan Siswa Aktif';
            case 'pemberitahuan': return 'PEMBERITAHUAN';
            case 'izin': return 'PERMOHONAN IZIN';
            case 'undangan': return 'UNDANGAN';
            default: return '';
        }
    };

    const getDefaultContent = (type: LetterType) => {
        switch(type) {
            case 'keterangan': return `Adalah benar Santri Madrasah Diniyah Takmiliyah Ula Ibnu Ahmad dan tercatat sebagai Santri Aktif pada Tahun Ajaran aktif.`;
            case 'pemberitahuan': return 'Salam silaturrahim kami sampaikan teriring doa semoga Allah SWT. Senantiasa melimpahkan rahmat, taufik dan hidayahNya kepada kita, sehingga kita tetap diberi kenikmatan hidup dalam keadaan sehat walafiat Aamin.\n\nBerdasarkan hasil rapat pada tanggal 3 Januari 2025 tentang pembiayaan semester akhir ( IMDA AKHIR ) and Haflatul Imtihan, kami memberitahukan bahwa biaya tersebut sebesar Rp.150.000,00- ( seratus lima puluh rupiah )/murid.\n\nDemi kelancaran kegiatan tersebut kami mohon agar wali murid secepatnya melunasi paling lambatnya tanggal 20 Januari 2025.';
            case 'izin': return 'Sehubungan dengan adanya kegiatan Musabaqoh Antar Madrasah (MUSAMMA), dengan ini kami sampaikan bahwa siswa :';
            case 'undangan': return 'Salam silaturrahim kami sampaikan teriring doa semoga Allah SWT. Senantiasa melimpahkan rahmat, taufik dan hidayahNya kepada kita, sehingga kita tetap diberi kenikmatan hidup dalam keadaan sehat walafiat Aamin.\n\nSehubungan akan dilaksanakannya HAFLATUL IMTIHAN Madrasah Diniyah Takmiliyah Ula IBNU AHMAD yang akan dilaksanakan pada :';
            default: return '';
        }
    };

    const selectedStudent = useMemo(() => {
        return students?.find(s => s.id === formData.studentId);
    }, [students, formData.studentId]);

    const getRomanClass = (num: number) => {
        const textNames = ["-", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam"];
        return `${num} (${textNames[num] || String(num)})`;
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Proporsional margin: 20mm for all types to look professional
        const printMargin = '20mm';

        let headerHtml = `
            <div class="kop" style="text-align: center; margin-bottom: 10px;">
                ${profile?.kopSuratUrl ? `<img src="${profile.kopSuratUrl}" style="width: 100%; max-height: 110px; object-fit: contain;" />` : `
                    <h1 style="margin:0; font-size: 18pt; text-transform: uppercase;">${formalSchoolName}</h1>
                    <p style="margin:2px 0; font-size: 10pt;">${profile?.alamat || 'Sampang, Jawa Timur'}</p>
                `}
            </div>
        `;

        let bodyContent = '';
        
        if (formData.type === 'keterangan' && selectedStudent) {
            bodyContent = `
                <div style="text-align: center; margin-bottom: 25px;">
                    <p style="font-weight: bold; text-decoration: underline; font-size: 14pt; margin: 0; text-transform: uppercase;">SURAT KETERANGAN SISWA AKTIF</p>
                    <p style="margin: 0; font-weight: bold; font-size: 11pt;">NOMOR : ${formData.number || ''}</p>
                </div>
                <p style="margin-bottom: 15px; line-height: 1.5;">Yang bertanda tangan dibawah ini Kepala Madrasah Diniyah Takmiliyah Ula Ibnu Ahmad menerangkan bahwa :</p>
                <table style="margin: 15px 0 15px 80px; width: auto; border-collapse: collapse; line-height: 1.8;">
                    <tbody>
                        <tr><td style="width: 160px; padding: 2px 0; vertical-align: top;">Nama</td><td style="padding: 2px 0;">: <strong style="text-transform: uppercase;">${selectedStudent.name}</strong></td></tr>
                        <tr><td style="padding: 2px 0; vertical-align: top;">Tempat, Tgl Lahir</td><td style="padding: 2px 0;">: ${selectedStudent.tempatLahir || '-'}, ${selectedStudent.dateOfBirth}</td></tr>
                        <tr><td style="padding: 2px 0; vertical-align: top;">Jenis Kelamin</td><td style="padding: 2px 0;">: ${selectedStudent.gender}</td></tr>
                        <tr><td style="padding: 2px 0; vertical-align: top;">Kelas</td><td style="padding: 2px 0;">: ${getRomanClass(selectedStudent.kelas || 0)}</td></tr>
                        <tr><td style="padding: 2px 0; vertical-align: top;">NIS</td><td style="padding: 2px 0;">: ${selectedStudent.nis.replace('MDIA', '')}</td></tr>
                        <tr><td style="padding: 2px 0; vertical-align: top;">NIK</td><td style="padding: 2px 0;">: ${selectedStudent.nik || '-'}</td></tr>
                    </tbody>
                </table>
                <p style="margin-top: 20px; margin-bottom: 15px; line-height: 1.6; text-align: justify;">Adalah benar Santri Madrasah Diniyah Takmiliyah Ula Ibnu Ahmad dan tercatat sebagai Santri Aktif pada Tahun Ajaran ${activeYear}.</p>
                <p style="margin-top: 15px; line-height: 1.6; text-align: justify;">Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya, dan kepada yang berkepentingan mohon mengetahuinya.</p>
                
                <div class="footer" style="display: flex; justify-content: flex-end; margin-top: 50px;">
                    <div class="sign-box" style="text-align: center; width: 260px;">
                        <p>Sampang, ${dateFormatted}</p>
                        <p style="font-weight: bold;">Kepala Madrasah</p>
                        <div class="sign-space" style="height: 45px;"></div>
                        <p class="sign-name" style="font-weight: bold; text-decoration: underline;">${kepalaMadrasah}</p>
                    </div>
                </div>
            `;
        } else {
            let metaHtml = `
                <div class="meta-info" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div class="meta-left" style="width: 60%;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tbody>
                                <tr><td style="width: 80px; font-weight: bold; vertical-align: top;">Nomor</td><td style="vertical-align: top;">: ${formData.number || ''}</td></tr>
                                <tr><td style="font-weight: bold; vertical-align: top;">Perihal</td><td style="vertical-align: top;">: <strong>${formData.subject || ''}</strong></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            let recipientHtml = `
                <div style="margin-bottom: 20px;">
                    Kepada Yth.<br/>
                    <strong>${formData.recipient || 'Bapak/Ibu/Saudara(i)'}</strong><br/>
                    Di_<br/>
                    Tempat
                </div>
            `;

            let dynamicContentHtml = '';
            let footerHtml = '';

            if (formData.type === 'undangan') {
                const paragraphs = formData.content.split('\n\n');
                dynamicContentHtml = `
                    <p style="text-indent: 40px; margin-bottom: 10px;">${paragraphs[0] || ''}</p>
                    <p style="text-indent: 40px; margin-bottom: 10px;">${paragraphs[1] || ''}</p>
                    <table style="margin: 10px 80px; width: auto; border-collapse: collapse;">
                        <tbody>
                            <tr><td style="width: 100px; padding: 2px 0;">Hari</td><td style="padding: 2px 0;">: ${formData.eventDate ? format(parseISO(formData.eventDate), "EEEE", { locale: dfnsId }) : '-'}</td></tr>
                            <tr><td style="padding: 2px 0;">Tanggal</td><td style="padding: 2px 0;">: ${formData.eventDate ? format(parseISO(formData.eventDate), "d MMMM yyyy", { locale: dfnsId }) : '-'}</td></tr>
                            <tr><td style="padding: 2px 0;">Jam</td><td style="padding: 2px 0;">: ${formData.eventTime || '-'}</td></tr>
                            <tr><td style="padding: 2px 0;">Tempat</td><td style="padding: 2px 0;">: ${formData.eventPlace || '-'}</td></tr>
                        </tbody>
                    </table>
                    <p style="text-indent: 40px; margin-top: 10px;">Demikian undangan ini kami buat. Atas perhatian Bapak/Ibu/Saudara(i) kami sampaikan banyak terimakasih.</p>
                `;
                footerHtml = `
                    <div class="date-row" style="text-align: right; margin-bottom: 5px;">Sampang, ${dateFormatted}</div>
                    <p style="text-align: center; margin-bottom: 10px; font-weight: bold; text-transform: uppercase;">${formData.committeeName || 'Panitia Pelaksana'}</p>
                    <div class="sign-container" style="display: flex; justify-content: space-between; text-align: center;">
                        <div class="sign-box" style="text-align: center; width: 220px;">
                            <p>Ketua</p>
                            <div class="sign-space" style="height: 45px;"></div>
                            <p class="sign-name" style="font-weight: bold; text-decoration: underline;">${formData.chairmanName || '..........................'}</p>
                        </div>
                        <div class="sign-box" style="text-align: center; width: 220px;">
                            <p>Sekretaris</p>
                            <div class="sign-space" style="height: 45px;"></div>
                            <p class="sign-name" style="font-weight: bold; text-decoration: underline;">${formData.committeeSecretaryName || '..........................'}</p>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 15px;">
                        <p>Mengetahui,</p>
                        <p style="font-weight: bold;">Kepala Madrasah</p>
                        <div class="sign-space" style="height: 45px;"></div>
                        <p class="sign-name" style="font-weight: bold; text-decoration: underline;">${kepalaMadrasah}</p>
                    </div>
                `;
            } else if (formData.type === 'izin') {
                const studentListItems = formData.studentList ? formData.studentList.split('\n').map(line => `<li>${line}</li>`).join('') : '';
                dynamicContentHtml = `
                    <p style="margin-bottom: 10px;">Salam silaturrahim kami sampaikan teriring doa semoga Allah SWT. Senantiasa melimpahkan rahmat, taufik dan hidayahNya kepada kita, sehingga kita tetap diberi kenikmatan hidup dalam keadaan sehat walafiat Aamin.</p>
                    <p style="margin-bottom: 10px;">${formData.content}</p>
                    <ul style="list-style: none; padding-left: 80px; margin-bottom: 15px; line-height: 1.5;">
                        ${studentListItems}
                    </ul>
                    <p style="margin-bottom: 10px;">Mohon untuk diberikan dispensasi (tidak mengikuti proses kegiatan belajar mengajar di sekolah), yang insyaAllah akan dilaksanakan pada :</p>
                    <table style="margin: 10px 80px; width: auto; margin-bottom: 15px; border-collapse: collapse;">
                        <tbody>
                            <tr><td style="width: 100px; padding: 2px 0;">Hari</td><td style="padding: 2px 0;">: ${formData.eventDate ? format(parseISO(formData.eventDate), "EEEE", { locale: dfnsId }) : '-'}</td></tr>
                            <tr><td style="padding: 2px 0;">Tanggal</td><td style="padding: 2px 0;">: ${formData.eventDate ? format(parseISO(formData.eventDate), "d MMMM yyyy", { locale: dfnsId }) : '-'}</td></tr>
                        </tbody>
                    </table>
                    <p>Demikian surat permohonan izin ini kami sampaikan, atas perhatiannya kami ucapkan terima kasih.</p>
                `;
                footerHtml = `
                    <div class="footer" style="display: flex; justify-content: flex-end; margin-top: 40px;">
                        <div class="sign-box" style="text-align: center; width: 220px;">
                            <p>Sampang, ${dateFormatted}</p>
                            <p style="font-weight: bold;">Kepala Madrasah</p>
                            <div class="sign-space" style="height: 50px;"></div>
                            <p class="sign-name" style="font-weight: bold; text-decoration: underline;">${kepalaMadrasah}</p>
                        </div>
                    </div>
                `;
            } else if (formData.type === 'pemberitahuan') {
                dynamicContentHtml = formData.content.split('\n\n').map(p => 
                    `<p style="text-indent: 40px; text-align: justify; margin-bottom: 12px;">${p.replace(/\n/g, '<br/>')}</p>`
                ).join('');
                
                dynamicContentHtml += `<p style="text-indent: 40px; margin-top: 10px;">Demikian surat pemberitahuan ini kami sampaikan, atas perhatiannya kami ucapkan terima kasih.</p>`;

                footerHtml = `
                    <div class="footer" style="display: flex; justify-content: flex-end; margin-top: 40px;">
                        <div class="sign-box" style="text-align: center; width: 220px;">
                            <p>Sampang, ${dateFormatted}</p>
                            <p style="font-weight: bold;">Kepala Madrasah</p>
                            <div class="sign-space" style="height: 55px;"></div>
                            <p class="sign-name" style="font-weight: bold; text-decoration: underline;">${kepalaMadrasah}</p>
                        </div>
                    </div>
                    ${formData.footerNote ? `
                        <div class="nb-footer" style="position: absolute; bottom: ${printMargin}; left: ${printMargin}; right: ${printMargin}; border-top: 1.2px dashed #000; padding-top: 5px;">
                            <p style="font-style: italic; font-size: 11pt; margin: 0;"><strong>Nb:</strong> ${formData.footerNote}</p>
                        </div>
                    ` : ''}
                `;
            }

            bodyContent = `
                ${metaHtml}
                ${recipientHtml}
                <div class="salutation" style="margin-bottom: 10px; font-weight: bold;">Assalamu'alaikum Wr.Wb.</div>
                <div class="content" style="margin-bottom: 15px; text-align: justify;">${dynamicContentHtml}</div>
                <div class="salutation" style="margin-bottom: 10px; font-weight: bold;">Wassalamu'alaikum Wr.Wb.</div>
                ${footerHtml}
            `;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Surat</title>
                    <style>
                        @page { size: A4; margin: ${printMargin}; }
                        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.2; color: #000; margin: 0; padding: 0; position: relative; }
                        ul { margin: 0; }
                        p { margin: 0 0 8px 0; }
                    </style>
                </head>
                <body>
                    ${headerHtml}
                    ${bodyContent}
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

    // Proporsional margin for all types to look official
    const printMargin = '20mm';

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
                        { id: 'izin', title: 'Permohonan Izin', desc: 'Surat permohonan dispensasi siswa.', icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
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
                                <Input placeholder="Contoh: Orang Tua/Wali Murid" value={formData.recipient || ""} onChange={e => setFormData({...formData, recipient: e.target.value})} className="h-9 font-bold" />
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
                                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.nis.replace('MDIA', '')})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {formData.type === 'izin' && (
                                <div className="space-y-4 p-4 rounded-lg bg-purple-50/50 border border-purple-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-purple-700 flex items-center gap-2">
                                            <ListTodo className="h-3 w-3" /> Daftar Siswa (Satu baris per siswa)
                                        </label>
                                        <Textarea 
                                            placeholder="Contoh:&#10;1. Hirzul Fahmi Akbar\tKelas : 5 (Lima)&#10;2. Ahmad Nofal Mubarok\tKelas : 5 (Lima)"
                                            rows={5} 
                                            value={formData.studentList || ""} 
                                            onChange={e => setFormData({...formData, studentList: e.target.value})} 
                                            className="resize-none bg-white text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-purple-700">Tanggal Pelaksanaan</label>
                                            <Input type="date" value={formData.eventDate || ""} onChange={e => setFormData({...formData, eventDate: e.target.value})} className="h-9 bg-white" />
                                        </div>
                                    </div>
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
                                    rows={formData.type === 'izin' ? 3 : 8} 
                                    value={formData.content || ""} 
                                    onChange={e => setFormData({...formData, content: e.target.value})} 
                                    className="resize-none"
                                />
                            </div>

                            {formData.type === 'pemberitahuan' && (
                                <div className="space-y-1.5 p-4 rounded-lg bg-orange-50/50 border border-orange-100">
                                    <label className="text-[10px] font-bold uppercase text-orange-700 flex items-center gap-2">
                                        <Info className="h-3 w-3" /> Nb: (Catatan Bawah)
                                    </label>
                                    <Textarea 
                                        placeholder="Catatan tambahan di bagian bawah surat..."
                                        rows={2} 
                                        value={formData.footerNote || ""} 
                                        onChange={e => setFormData({...formData, footerNote: e.target.value})} 
                                        className="resize-none bg-white text-xs italic"
                                    />
                                </div>
                            )}
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
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-6">
                    {/* A4 Paper Preview Container */}
                    <div className="bg-muted/20 p-4 sm:p-8 rounded-xl overflow-auto flex justify-center border-2 border-dashed border-muted">
                        <div 
                            className="bg-white shadow-2xl relative transition-all"
                            style={{
                                width: '210mm',
                                minHeight: '297mm',
                                padding: printMargin,
                                fontFamily: "'Times New Roman', serif",
                                fontSize: '12pt',
                                color: 'black',
                                lineHeight: '1.2'
                            }}
                        >
                            {/* Kop Surat */}
                            <div className="text-center mb-6">
                                {profile?.kopSuratUrl ? (
                                    <img src={profile.kopSuratUrl} className="w-full h-auto max-h-[110px] object-contain" alt="Kop Surat" />
                                ) : (
                                    <div className="space-y-1 border-b-2 border-black pb-2">
                                        <h2 className="text-xl font-bold uppercase">{formalSchoolName}</h2>
                                        <p className="text-xs">{profile?.alamat || 'Sampang, Jawa Timur'}</p>
                                    </div>
                                )}
                            </div>

                            {formData.type === 'keterangan' && selectedStudent ? (
                                <div className="flex flex-col h-full">
                                    <div className="text-center mb-8">
                                        <p className="font-bold underline text-lg uppercase mb-0">SURAT KETERANGAN SISWA AKTIF</p>
                                        <p className="font-bold text-sm">NOMOR : {formData.number || ''}</p>
                                    </div>
                                    <p className="mb-4">Yang bertanda tangan dibawah ini Kepala Madrasah Diniyah Takmiliyah Ula Ibnu Ahmad menerangkan bahwa :</p>
                                    <table className="ml-20 my-6 border-collapse" style={{ lineHeight: '2.0' }}>
                                        <tbody>
                                            <tr><td className="w-40 py-0.5">Nama</td><td className="py-0.5">: <strong className="uppercase">{selectedStudent.name}</strong></td></tr>
                                            <tr><td className="py-0.5">Tempat, Tgl Lahir</td><td className="py-0.5">: {selectedStudent.tempatLahir || '-'}, {selectedStudent.dateOfBirth}</td></tr>
                                            <tr><td className="py-0.5">Jenis Kelamin</td><td className="py-0.5">: {selectedStudent.gender}</td></tr>
                                            <tr><td className="py-0.5">Kelas</td><td className="py-0.5">: {getRomanClass(selectedStudent.kelas || 0)}</td></tr>
                                            <tr><td className="py-0.5">NIS</td><td className="py-0.5">: {selectedStudent.nis.replace('MDIA', '')}</td></tr>
                                            <tr><td className="py-0.5">NIK</td><td className="py-0.5">: {selectedStudent.nik || '-'}</td></tr>
                                        </tbody>
                                    </table>
                                    <p className="mt-6 text-justify leading-relaxed">
                                        Adalah benar Santri Madrasah Diniyah Takmiliyah Ula Ibnu Ahmad dan tercatat sebagai Santri Aktif pada Tahun Ajaran {activeYear}.
                                    </p>
                                    <p className="mt-4 text-justify leading-relaxed">
                                        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya, dan kepada yang berkepentingan mohon mengetahuinya.
                                    </p>
                                    
                                    <div className="mt-16 flex justify-end">
                                        <div className="text-center w-64">
                                            <p>Sampang, {dateFormatted}</p>
                                            <p className="font-bold">Kepala Madrasah</p>
                                            <div className="h-16"></div>
                                            <p className="font-bold underline">{kepalaMadrasah}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    <div className="flex justify-between mb-6">
                                        <div className="space-y-0.5">
                                            <p><strong>Nomor</strong> : {formData.number}</p>
                                            <p><strong>Perihal</strong> : <strong>{formData.subject}</strong></p>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <p>Kepada Yth.</p>
                                        <p><strong>{formData.recipient || 'Bapak/Ibu/Saudara(i)'}</strong></p>
                                        <p>Di_</p>
                                        <p>Tempat</p>
                                    </div>

                                    <p className="mb-4 font-bold">Assalamu'alaikum Wr.Wb.</p>

                                    <div className="mb-8 space-y-4">
                                        {formData.type === 'undangan' ? (
                                            <div className="space-y-4">
                                                {formData.content.split('\n\n').map((p, i) => (
                                                    <p key={i} className="text-justify indent-10">{p}</p>
                                                ))}
                                                <table className="ml-20">
                                                    <tbody>
                                                        <tr><td className="w-24">Hari</td><td>: {formData.eventDate ? format(parseISO(formData.eventDate), "EEEE", { locale: dfnsId }) : '-'}</td></tr>
                                                        <tr><td>Tanggal</td><td>: {formData.eventDate ? format(parseISO(formData.eventDate), "d MMMM yyyy", { locale: dfnsId }) : '-'}</td></tr>
                                                        <tr><td>Jam</td><td>: {formData.eventTime || '-'}</td></tr>
                                                        <tr><td>Tempat</td><td>: {formData.eventPlace || '-'}</td></tr>
                                                    </tbody>
                                                </table>
                                                <p className="text-justify indent-10">Demikian undangan ini kami buat. Atas perhatian Bapak/Ibu/Saudara(i) kami sampaikan banyak terimakasih.</p>
                                            </div>
                                        ) : formData.type === 'izin' ? (
                                            <div className="space-y-4">
                                                <p>Salam silaturrahim kami sampaikan teriring doa semoga Allah SWT. Senantiasa melimpahkan rahmat, taufik dan hidayahNya kepada kita, sehingga kita tetap diberi kenikmatan hidup dalam keadaan sehat walafiat Aamin.</p>
                                                <p>{formData.content}</p>
                                                <ul className="list-none pl-20 space-y-1">
                                                    {formData.studentList?.split('\n').map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                                <p>Mohon untuk diberikan dispensasi (tidak mengikuti proses kegiatan belajar mengajar di sekolah), yang insyaAllah akan dilaksanakan pada :</p>
                                                <table className="ml-20">
                                                    <tbody>
                                                        <tr><td className="w-24">Hari</td><td>: {formData.eventDate ? format(parseISO(formData.eventDate), "EEEE", { locale: dfnsId }) : '-'}</td></tr>
                                                        <tr><td>Tanggal</td><td>: {formData.eventDate ? format(parseISO(formData.eventDate), "d MMMM yyyy", { locale: dfnsId }) : '-'}</td></tr>
                                                    </tbody>
                                                </table>
                                                <p>Demikian surat permohonan izin ini kami sampaikan, atas perhatiannya kami ucapkan terima kasih.</p>
                                            </div>
                                        ) : formData.type === 'pemberitahuan' ? (
                                            <div className="space-y-4">
                                                {formData.content.split('\n\n').map((p, i) => (
                                                    <p key={i} className="text-justify indent-10">{p}</p>
                                                ))}
                                                <p className="text-justify indent-10">Demikian surat pemberitahuan ini kami sampaikan, atas perhatiannya kami ucapkan terima kasih.</p>
                                            </div>
                                        ) : (
                                            <p className="text-justify indent-10">{formData.content}</p>
                                        )}
                                    </div>

                                    <p className="mb-6 font-bold">Wassalamu'alaikum Wr.Wb.</p>

                                    <div className="mt-auto flex flex-col relative pb-16">
                                        {formData.type === 'undangan' ? (
                                            <div className="space-y-4">
                                                <div className="text-right">Sampang, {dateFormatted}</div>
                                                <p className="text-center font-bold uppercase">{formData.committeeName}</p>
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
                                                    <p className="font-bold">Kepala Madrasah</p>
                                                    <div className="h-12"></div>
                                                    <p className="font-bold underline">{kepalaMadrasah}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end">
                                                <div className="text-center w-60">
                                                    <p>Sampang, {dateFormatted}</p>
                                                    <p className="font-bold">Kepala Madrasah</p>
                                                    <div className="h-12"></div>
                                                    <p><strong><span className="underline">{kepalaMadrasah}</span></strong></p>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* NB Footer for Pemberitahuan */}
                                        {formData.type === 'pemberitahuan' && formData.footerNote && (
                                            <div className="absolute bottom-0 left-0 right-0 pt-2 border-t border-dashed border-black">
                                                <p className="italic text-[11pt]"><strong>Nb:</strong> {formData.footerNote}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => setStep('form')} className="gap-2">
                            <ArrowLeft className="h-4 w-4" /> Edit Kembali
                        </Button>
                        <Button onClick={handlePrint} className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg">
                            <Printer className="h-4 w-4" /> Cetak Sekarang (A4)
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
