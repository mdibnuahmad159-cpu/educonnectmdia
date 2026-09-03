"use client";

import { useState, useMemo, useRef } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore, query, orderBy } from "firebase/firestore";
import type { Certificate, Student, CertificateTemplate, Teacher } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
    PlusCircle, 
    Edit, 
    Trash2, 
    Loader2, 
    Search, 
    Upload, 
    Printer, 
    FileDown, 
    FileSpreadsheet, 
    FileText,
    CopyCheck,
    FileUp,
    Download,
    Trophy,
    SearchX
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { addCertificate, updateCertificate, deleteCertificate, addCertificatesBatch } from "@/lib/firebase-helpers";
import { CertificateForm } from "./components/certificate-form";
import { TemplateUploadDialog } from "./components/template-upload-dialog";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import { useAcademicYear } from "@/context/academic-year-provider";
import { useSchoolProfile } from "@/context/school-profile-provider";
import { safePrint } from "@/lib/utils";
import * as XLSX from 'xlsx';

export default function CertificatesPage() {
    const firestore = useFirestore() as Firestore;
    const { activeYear } = useAcademicYear();
    const { profile } = useSchoolProfile();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const certificatesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "certificates"), orderBy("date", "desc"));
    }, [firestore]);
    
    const { data: certificates, loading: loadingCertificates } = useCollection<Certificate>(certificatesQuery);
    
    const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsCollection);

    const templatesCollection = useMemoFirebase(() => firestore ? collection(firestore, "certificate_templates") : null, [firestore]);
    const { data: templates } = useCollection<CertificateTemplate>(templatesCollection);

    const teachersCollection = useMemoFirebase(() => firestore ? collection(firestore, "teachers") : null, [firestore]);
    const { data: teachers } = useCollection<Teacher>(teachersCollection);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isTemplateOpen, setIsTemplateOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCertificates = useMemo(() => {
        if (!certificates) return [];
        return certificates.filter(c => 
            c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.competitionName && c.competitionName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [certificates, searchTerm]);

    const handleAdd = () => {
        setSelectedCertificate(null);
        setIsFormOpen(true);
    };

    const handleEdit = (certificate: Certificate) => {
        setSelectedCertificate(certificate);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        setIdToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!firestore || !idToDelete) return;
        deleteCertificate(firestore, idToDelete);
        toast({ title: "Sertifikat Dihapus", description: "Data prestasi telah berhasil dihapus." });
        setIsDeleteDialogOpen(false);
        setIdToDelete(null);
    };

    const handleSave = (data: Omit<Certificate, 'id' | 'studentName'>) => {
        if (!firestore || !students) return;
        
        const student = students.find(s => s.id === data.studentId);
        const studentName = student ? student.name : "Siswa tidak dikenal";
        
        const certificateData = { ...data, studentName };

        if (selectedCertificate) {
            updateCertificate(firestore, selectedCertificate.id, certificateData);
            toast({ title: "Sertifikat Diperbarui", description: "Perubahan data prestasi berhasil disimpan." });
        } else {
            addCertificate(firestore, certificateData);
            toast({ title: "Sertifikat Ditambahkan", description: "Data prestasi baru berhasil dicatat." });
        }
        setIsFormOpen(false);
        setSelectedCertificate(null);
    };

    const handlePrintCertificate = (certificate: Certificate) => {
        const template = templates?.find(t => t.id === certificate.category);
        if (!template) {
            toast({ variant: "destructive", title: "Template Tidak Ditemukan", description: `Silakan unggah template untuk kategori ${certificate.category} terlebih dahulu.` });
            return;
        }

        const headName = teachers?.find(t => t.jabatan === 'Kepala Madrasah')?.name || "..........................";
        const dateFormatted = format(parseISO(certificate.date), "d MMMM yyyy", { locale: dfnsId });
        const schoolName = profile?.namaMadrasah || "MADRASAH DINIYAH IBNU AHMAD";
        
        const rankText = certificate.rank.toLowerCase();
        const competitionText = "lomba " + (certificate.competitionName || "").toLowerCase();

        const finalHtml = `
            <html>
                <head>
                    <title>Cetak Sertifikat - ${certificate.studentName}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Playfair+Display:wght@700;900&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet">
                    <style>
                        @page { size: landscape; margin: 0; }
                        body { 
                            margin: 0; 
                            padding: 0; 
                            font-family: 'PT Sans', sans-serif; 
                            background-color: white;
                            color: #333;
                            -webkit-print-color-adjust: exact;
                        }
                        .certificate-container {
                            position: relative;
                            width: 297mm;
                            height: 210mm;
                            background-image: url('${template.imageUrl}');
                            background-size: 100% 100%;
                            background-repeat: no-repeat;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            box-sizing: border-box;
                            overflow: hidden;
                            padding: 40px 60px;
                        }
                        .header-text {
                            margin-top: -140px;
                            margin-bottom: 20px;
                        }
                        .title-main {
                            font-family: 'Playfair Display', serif;
                            font-size: 68pt;
                            font-weight: 900;
                            color: #9c27b0;
                            margin: 0;
                            line-height: 1;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                        }
                        .title-sub {
                            font-family: 'Playfair Display', serif;
                            font-size: 32pt;
                            font-weight: 700;
                            color: #9c27b0;
                            margin: -5px 0 0 0;
                        }
                        .intro-text {
                            font-size: 16pt;
                            margin-bottom: 15px;
                            color: #000;
                        }
                        .name-container {
                            margin-bottom: 0px;
                            width: 80%;
                        }
                        .student-name {
                            font-family: 'Dancing Script', cursive;
                            font-size: 48pt;
                            color: #9c27b0;
                            display: inline-block;
                            padding: 0 50px;
                            border-bottom: 2px solid #000;
                            line-height: 1.1;
                            white-space: nowrap;
                            max-width: 100%;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        .description {
                            font-size: 18pt;
                            max-width: 85%;
                            line-height: 1.4;
                            color: #000;
                            margin-top: 5px;
                        }
                        .footer {
                            position: absolute;
                            bottom: 60px;
                            width: 85%;
                            display: flex;
                            justify-content: space-between;
                            align-items: end;
                            padding: 0 40px;
                        }
                        .signature {
                            text-align: center;
                        }
                        .sig-name {
                            font-weight: 700;
                            font-size: 18pt;
                            text-decoration: underline;
                            display: inline-block;
                            margin-bottom: 5px;
                        }
                        .sig-title {
                            font-size: 16pt;
                            color: #333;
                        }
                        .date-location {
                            text-align: center;
                            font-size: 18pt;
                            color: #000;
                            line-height: 1.3;
                        }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .certificate-container { width: 297mm; height: 210mm; }
                        }
                    </style>
                </head>
                <body>
                    <div class="certificate-container">
                        <div class="header-text">
                            <div class="title-main">SERTIFIKAT</div>
                            <div class="title-sub">Penghargaan</div>
                        </div>

                        <div class="intro-text">Sertifikat ini dipersembahkan kepada</div>
                        
                        <div class="name-container">
                            <div class="student-name">${certificate.studentName}</div>
                        </div>

                        <div class="description">
                            sebagai juara ${rankText} pada ${competitionText}<br>
                            Yang diselenggarakan di ${schoolName.toUpperCase()} pada tahun ajaran ${certificate.academicYear}.
                        </div>

                        <div class="footer">
                            <div class="signature">
                                <div class="sig-name">${headName}</div><br>
                                <div class="sig-title">Kepala Madrasah</div>
                            </div>

                            <div class="date-location">
                                Sampang,<br>
                                ${dateFormatted}
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `;
        safePrint(finalHtml);
    };

    const handleBulkPrint = () => {
        if (!filteredCertificates.length) {
            toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada sertifikat untuk dicetak." });
            return;
        }

        const uniqueCategories = new Set(filteredCertificates.map(c => c.category));
        const missingTemplates = Array.from(uniqueCategories).filter(cat => !templates?.find(t => t.id === cat));

        if (missingTemplates.length > 0) {
            toast({ 
                variant: "destructive", 
                title: "Template Belum Lengkap", 
                description: `Silakan unggah template untuk kategori: ${missingTemplates.join(', ')}` 
            });
            return;
        }

        const headName = teachers?.find(t => t.jabatan === 'Kepala Madrasah')?.name || "..........................";
        const schoolName = profile?.namaMadrasah || "MADRASAH DINIYAH IBNU AHMAD";

        let htmlContent = `
            <html>
                <head>
                    <title>Cetak Massal Sertifikat</title>
                    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Playfair+Display:wght@700;900&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet">
                    <style>
                        @page { size: landscape; margin: 0; }
                        body { 
                            margin: 0; 
                            padding: 0; 
                            font-family: 'PT Sans', sans-serif; 
                            background-color: white;
                            color: #333;
                            -webkit-print-color-adjust: exact;
                        }
                        .page-break { page-break-after: always; }
                        .certificate-container {
                            position: relative;
                            width: 297mm;
                            height: 210mm;
                            background-size: 100% 100%;
                            background-repeat: no-repeat;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            box-sizing: border-box;
                            overflow: hidden;
                            padding: 40px 60px;
                        }
                        .header-text {
                            margin-top: -140px;
                            margin-bottom: 20px;
                        }
                        .title-main {
                            font-family: 'Playfair Display', serif;
                            font-size: 68pt;
                            font-weight: 900;
                            color: #9c27b0;
                            margin: 0;
                            line-height: 1;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                        }
                        .title-sub {
                            font-family: 'Playfair Display', serif;
                            font-size: 32pt;
                            font-weight: 700;
                            color: #9c27b0;
                            margin: -5px 0 0 0;
                        }
                        .intro-text {
                            font-size: 16pt;
                            margin-bottom: 15px;
                            color: #000;
                        }
                        .name-container {
                            margin-bottom: 0px;
                            width: 80%;
                        }
                        .student-name {
                            font-family: 'Dancing Script', cursive;
                            font-size: 42pt;
                            color: #9c27b0;
                            display: inline-block;
                            padding: 0 50px;
                            border-bottom: 2px solid #000;
                            line-height: 1.1;
                            white-space: nowrap;
                            max-width: 100%;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        .description {
                            font-size: 18pt;
                            max-width: 85%;
                            line-height: 1.4;
                            color: #000;
                            margin-top: 5px;
                        }
                        .footer {
                            position: absolute;
                            bottom: 60px;
                            width: 85%;
                            display: flex;
                            justify-content: space-between;
                            align-items: end;
                            padding: 0 40px;
                        }
                        .signature {
                            text-align: center;
                        }
                        .sig-name {
                            font-weight: 700;
                            font-size: 18pt;
                            text-decoration: underline;
                            display: inline-block;
                            margin-bottom: 5px;
                        }
                        .sig-title {
                            font-size: 16pt;
                            color: #333;
                        }
                        .date-location {
                            text-align: center;
                            font-size: 18pt;
                            color: #000;
                            line-height: 1.3;
                        }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .certificate-container { width: 297mm; height: 210mm; }
                        }
                    </style>
                </head>
                <body>
        `;

        filteredCertificates.forEach((certificate, index) => {
            const template = templates!.find(t => t.id === certificate.category)!;
            const dateFormatted = format(parseISO(certificate.date), "d MMMM yyyy", { locale: dfnsId });
            const rankText = certificate.rank.toLowerCase();
            const competitionText = "lomba " + (certificate.competitionName || "").toLowerCase();

            htmlContent += `
                <div class="certificate-container ${index < filteredCertificates.length - 1 ? 'page-break' : ''}" style="background-image: url('${template.imageUrl}');">
                    <div class="header-text">
                        <div class="title-main">SERTIFIKAT</div>
                        <div class="title-sub">PENGHARGAAN</div>
                    </div>

                    <div class="intro-text">Sertifikat ini dipersembahkan kepada</div>
                    
                    <div class="name-container">
                        <div class="student-name">${certificate.studentName}</div>
                    </div>

                    <div class="description">
                        sebagai juara ${rankText} pada ${competitionText}<br>
                        Yang diselenggarakan di ${schoolName.toUpperCase()} pada tahun ajaran ${certificate.academicYear}.
                    </div>

                    <div class="footer">
                        <div class="signature">
                            <div class="sig-name">${headName}</div><br>
                            <div class="sig-title">Kepala Madrasah</div>
                        </div>

                        <div class="date-location">
                            Sampang,<br>
                            ${dateFormatted}
                        </div>
                    </div>
                </div>
            `;
        });

        htmlContent += `
                </body>
            </html>
        `;

        safePrint(htmlContent);
    };

    const handlePrintTable = () => {
        if (!filteredCertificates.length) {
            toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data prestasi untuk dicetak." });
            return;
        }

        const tableRows = filteredCertificates.map((c, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${c.studentName}</td>
                <td>${c.rank}</td>
                <td>${c.category === 'lomba' ? c.competitionName : `${c.category} (TA ${c.academicYear})`}</td>
            </tr>
        `).join('');

        const finalHtml = `
            <html>
                <head>
                    <title>Cetak Daftar Prestasi</title>
                    <style>
                        body { font-family: sans-serif; font-size: 12px; padding: 20px; }
                        h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>Daftar Prestasi Siswa - TA ${activeYear}</h1>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px;">No</th>
                                <th>Nama Siswa</th>
                                <th>Juara</th>
                                <th>Keterangan Lomba</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </body>
            </html>
        `;
        safePrint(finalHtml);
    };

    const getRankBadge = (rank: Certificate['rank']) => {
        switch (rank) {
            case 'Pertama': return <Badge className="bg-yellow-500 hover:bg-yellow-600 border-none font-bold text-[9px] uppercase tracking-tighter">Juara 1</Badge>;
            case 'Kedua': return <Badge className="bg-slate-400 hover:bg-slate-500 border-none font-bold text-[9px] uppercase tracking-tighter">Juara 2</Badge>;
            case 'Ketiga': return <Badge className="bg-amber-700 hover:bg-amber-800 border-none font-bold text-[9px] uppercase tracking-tighter">Juara 3</Badge>;
            default: return <Badge variant="outline" className="font-bold text-[9px] uppercase">{rank}</Badge>;
        }
    };

    const getCategoryLabel = (category: Certificate['category']) => {
        switch (category) {
            case 'lomba': return 'Lomba';
            case 'ranking': return 'Ranking';
            case 'bintang': return 'Bintang Pelajar';
            default: return category;
        }
    };

    const isLoading = loadingCertificates || loadingStudents;

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="p-4 flex flex-row flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-primary-foreground/50" />
                        <Input 
                            placeholder="Cari nama siswa atau lomba..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none">
                                    <FileUp className="h-3.5 w-3.5" />
                                    Impor
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                    const worksheet = XLSX.utils.json_to_sheet([{}], { header: ['NIS Siswa (Wajib)', 'Juara (Pertama/Kedua/Ketiga)', 'Nama Lomba', 'Tanggal (YYYY-MM-DD)'] });
                                    const workbook = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Sertifikat');
                                    XLSX.writeFile(workbook, 'template_impor_sertifikat.xlsx');
                                }}>
                                    <Download className="mr-2 h-3.5 w-3.5" />
                                    Unduh Template
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-3.5 w-3.5" />
                                    Unggah Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={async (event) => {
                                const file = event.target.files?.[0];
                                if (!file || !firestore || !students) return;
                                const reader = new FileReader();
                                reader.onload = async (e) => {
                                    try {
                                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                                        const workbook = XLSX.read(data, { type: 'array' });
                                        const sheetName = workbook.SheetNames[0];
                                        const worksheet = workbook.Sheets[sheetName];
                                        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                                        if (json.length === 0) return;
                                        toast({ title: "Mengimpor Data", description: "Memproses data sertifikat..." });
                                        const certsToImport: Omit<Certificate, 'id'>[] = [];
                                        const cols = { nis: 'NIS Siswa (Wajib)', rank: 'Juara (Pertama/Kedua/Ketiga)', competitionName: 'Nama Lomba', date: 'Tanggal (YYYY-MM-DD)' };
                                        for (const item of json) {
                                            const student = students.find(s => String(s.nis) === String(item[cols.nis]));
                                            if (student && item[cols.rank] && item[cols.competitionName]) {
                                                certsToImport.push({
                                                    studentId: student.id, studentName: student.name, category: 'lomba', rank: item[cols.rank] as any,
                                                    competitionName: item[cols.competitionName], date: String(item[cols.date]), academicYear: activeYear
                                                });
                                            }
                                        }
                                        if (certsToImport.length > 0) {
                                            await addCertificatesBatch(firestore, certsToImport);
                                            toast({ title: "Impor Selesai", description: `${certsToImport.length} sertifikat berhasil diimpor.` });
                                        }
                                    } catch (error) { toast({ variant: "destructive", title: "Gagal" }); }
                                };
                                reader.readAsArrayBuffer(file);
                            }}
                        />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none">
                                    <FileDown className="h-3.5 w-3.5" />
                                    Ekspor
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                    if (!filteredCertificates.length) return;
                                    const data = filteredCertificates.map((c, i) => ({ No: i + 1, 'Nama Siswa': c.studentName, 'Juara': c.rank, 'Kategori': c.category, 'Lomba': c.competitionName, 'Tanggal': c.date }));
                                    const worksheet = XLSX.utils.json_to_sheet(data);
                                    const workbook = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Prestasi");
                                    XLSX.writeFile(workbook, `Data_Prestasi_${activeYear.replace('/', '-')}.xlsx`);
                                }}>
                                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                                    Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePrintTable}>
                                    <Printer className="mr-2 h-3.5 w-3.5" />
                                    Cetak Tabel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none" onClick={handleBulkPrint}>
                            <CopyCheck className="h-3.5 w-3.5" />
                            Cetak Massal
                        </Button>

                        <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-white text-primary hover:bg-white/90 border-none" onClick={() => setIsTemplateOpen(true)}>
                            <Upload className="h-3.5 w-3.5" />
                            Template
                        </Button>
                        <Button size="xs" variant="secondary" className="gap-1.5 h-8 font-bold shadow-md bg-accent text-primary hover:bg-accent/90 border-none" onClick={handleAdd}>
                            <PlusCircle className="h-3.5 w-3.5" />
                            Tambah Lomba
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <div className="pt-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/40"/>
                        <span className="text-xs font-medium uppercase tracking-widest">Memuat data prestasi...</span>
                    </div>
                ) : filteredCertificates.length > 0 ? (
                    <div className="space-y-3">
                        {filteredCertificates.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-card border shadow-sm hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10 border-2 border-primary/5 group-hover:border-primary/20 transition-all">
                                        <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">{item.studentName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[12px] font-bold leading-tight uppercase text-foreground group-hover:text-primary transition-colors">{item.studentName}</p>
                                            {getRankBadge(item.rank)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase bg-muted/50 px-1.5 rounded">
                                                {item.category === 'lomba' ? item.competitionName : `${getCategoryLabel(item.category)}`}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground">•</span>
                                            <p className="text-[10px] text-primary/70 font-medium italic">TA {item.academicYear}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" title="Cetak Sertifikat" onClick={() => handlePrintCertificate(item)}>
                                        <Printer className="h-4 w-4" />
                                    </Button>
                                    {item.category === 'lomba' && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Edit Data" onClick={() => handleEdit(item)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/5" title="Hapus Data" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">
                        {searchTerm ? <SearchX className="h-10 w-10 mx-auto mb-3 opacity-10" /> : <Trophy className="h-10 w-10 mx-auto mb-3 opacity-10" />}
                        <p className="text-sm font-medium">{searchTerm ? "Tidak ada hasil pencarian." : "Belum ada data sertifikat yang dicatat."}</p>
                    </div>
                )}
            </div>

            <CertificateForm 
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                certificate={selectedCertificate}
                students={students || []}
                onSave={handleSave}
            />

            <TemplateUploadDialog
                isOpen={isTemplateOpen}
                setIsOpen={setIsTemplateOpen}
                existingTemplates={templates || []}
            />
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[28px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm font-bold uppercase tracking-tight">Hapus Sertifikat?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                        Tindakan ini akan menghapus catatan prestasi siswa secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full h-9 text-xs">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white rounded-full h-9 text-xs">Ya, Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
