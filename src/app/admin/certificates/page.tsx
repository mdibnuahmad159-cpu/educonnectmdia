
"use client";

import { useState, useMemo, useRef } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore, query, orderBy } from "firebase/firestore";
import type { Certificate, Student, CertificateTemplate, Teacher } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addCertificate, updateCertificate, deleteCertificate } from "@/lib/firebase-helpers";
import { CertificateForm } from "./components/certificate-form";
import { TemplateUploadDialog } from "./components/template-upload-dialog";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { useAcademicYear } from "@/context/academic-year-provider";
import { useSchoolProfile } from "@/context/school-profile-provider";
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

    const certificateImportColumns = {
        nis: 'NIS Siswa (Wajib)',
        rank: 'Juara (Pertama/Kedua/Ketiga)',
        competitionName: 'Nama Lomba',
        date: 'Tanggal (YYYY-MM-DD)'
    };

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([{}], { header: Object.values(certificateImportColumns) });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Sertifikat');
        XLSX.writeFile(workbook, 'template_impor_sertifikat.xlsx');
    };

    const handleImportCertificates = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

                if (json.length === 0) {
                    toast({ variant: "destructive", title: "File Kosong", description: "File Excel yang Anda unggah tidak berisi data." });
                    return;
                }

                toast({ title: "Mengimpor Data", description: `Mulai mengimpor ${json.length} data sertifikat...` });

                let successCount = 0;
                let errorCount = 0;

                for (const item of json) {
                    const certData: any = {};
                    const columnKeys = Object.keys(certificateImportColumns);
                    const columnValues = Object.values(certificateImportColumns);
                    
                    for(const key in item) {
                        const columnIndex = columnValues.indexOf(key);
                        if (columnIndex > -1) {
                             const dataKey = columnKeys[columnIndex];
                             certData[dataKey] = item[key] ?? '';
                        }
                    }

                    // Validation
                    const student = students.find(s => String(s.nis) === String(certData.nis));
                    const validRanks = ['Pertama', 'Kedua', 'Ketiga'];
                    
                    if (!student || !certData.rank || !certData.competitionName || !certData.date || !validRanks.includes(certData.rank)) {
                        errorCount++;
                        console.error("Skipping certificate item due to invalid data:", certData);
                        continue;
                    }

                    const finalData: Omit<Certificate, 'id'> = {
                        studentId: student.id,
                        studentName: student.name,
                        category: 'lomba',
                        rank: certData.rank as any,
                        competitionName: certData.competitionName,
                        date: String(certData.date),
                        academicYear: activeYear
                    };

                    addCertificate(firestore, finalData);
                    successCount++;
                }

                 toast({ title: "Impor Selesai", description: `${successCount} sertifikat berhasil diimpor. ${errorCount} gagal.` });

            } catch (error) {
                toast({ variant: "destructive", title: "Gagal Membaca File", description: "Tidak dapat memproses file Excel." });
                console.error(error);
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handlePrintCertificate = (certificate: Certificate) => {
        const template = templates?.find(t => t.id === certificate.category);
        if (!template) {
            toast({ variant: "destructive", title: "Template Tidak Ditemukan", description: `Silakan unggah template untuk kategori ${certificate.category} terlebih dahulu.` });
            return;
        }

        const headName = teachers?.find(t => t.jabatan === 'Kepala Madrasah')?.name || "..........................";

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: "destructive", title: "Gagal Membuka Jendela", description: "Mohon izinkan pop-up untuk mencetak sertifikat." });
            return;
        }

        const dateFormatted = format(parseISO(certificate.date), "d MMMM yyyy", { locale: dfnsId });
        const schoolName = profile?.namaMadrasah || "MADRASAH DINIYAH IBNU AHMAD";
        
        const rankText = certificate.rank.toLowerCase();
        const competitionText = "lomba " + (certificate.competitionName || "").toLowerCase();

        printWindow.document.write(`
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
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
        };
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

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: "destructive", title: "Gagal Membuka Jendela", description: "Mohon izinkan pop-up untuk mencetak sertifikat." });
            return;
        }

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
            `;
        });

        htmlContent += `
                </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
        };
    };

    const handleExportExcel = () => {
        if (!filteredCertificates.length) return;
        const data = filteredCertificates.map((c, i) => ({
            'No': i + 1,
            'Nama Siswa': c.studentName,
            'Juara': c.rank,
            'Kategori': c.category,
            'Lomba/Keterangan': c.category === 'lomba' ? c.competitionName : `Semester ${c.academicYear}`,
            'Tanggal': c.date
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Prestasi");
        XLSX.writeFile(workbook, `Data_Prestasi_Siswa_${activeYear.replace('/', '-')}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!filteredCertificates.length) return;
        const doc = new jsPDF();
        doc.text(`Data Prestasi Siswa - TA ${activeYear}`, 14, 15);
        (doc as any).autoTable({
            head: [['No', 'Nama', 'Juara', 'Lomba']],
            body: filteredCertificates.map((c, i) => [
                i + 1,
                c.studentName,
                c.rank,
                c.category === 'lomba' ? c.competitionName : `${c.category} (TA ${c.academicYear})`
            ]),
            startY: 20,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50] }
        });
        doc.save(`Data_Prestasi_Siswa_${activeYear.replace('/', '-')}.pdf`);
    };

    const handlePrintTable = () => {
        if (!filteredCertificates.length) {
            toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data prestasi untuk dicetak." });
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableRows = filteredCertificates.map((c, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${c.studentName}</td>
                <td>${c.rank}</td>
                <td>${c.category === 'lomba' ? c.competitionName : `${c.category} (TA ${c.academicYear})`}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
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
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    };

    const getRankBadge = (rank: Certificate['rank']) => {
        switch (rank) {
            case 'Pertama': return <Badge className="bg-yellow-500 hover:bg-yellow-600 border-none font-normal">Juara 1</Badge>;
            case 'Kedua': return <Badge className="bg-slate-400 hover:bg-slate-500 border-none font-normal">Juara 2</Badge>;
            case 'Ketiga': return <Badge className="bg-amber-700 hover:bg-amber-800 border-none font-normal">Juara 3</Badge>;
            default: return <Badge variant="outline" className="font-normal">{rank}</Badge>;
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-headline text-primary">Sertifikat & Prestasi</h1>
                    <p className="text-xs text-muted-foreground">Kelola catatan prestasi dan cetak sertifikat digital.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="xs" variant="outline" className="gap-2 border-primary/30 text-primary font-normal">
                                <FileUp className="h-3.5 w-3.5" />
                                Impor
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleDownloadTemplate}>
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
                        onChange={handleImportCertificates}
                    />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="xs" variant="outline" className="gap-2 border-primary/30 text-primary font-normal">
                                <FileDown className="h-3.5 w-3.5" />
                                Ekspor
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleExportExcel}>
                                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                                Ekspor ke Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPdf}>
                                <FileText className="mr-2 h-3.5 w-3.5" />
                                Ekspor ke PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handlePrintTable}>
                                <Printer className="mr-2 h-3.5 w-3.5" />
                                Cetak
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button size="xs" variant="outline" className="gap-2 border-primary/30 text-primary font-normal" onClick={handleBulkPrint}>
                        <CopyCheck className="h-3.5 w-3.5" />
                        Cetak Massal
                    </Button>

                    <Button size="xs" variant="outline" className="gap-2 border-primary/30 text-primary font-normal" onClick={() => setIsTemplateOpen(true)}>
                        <Upload className="h-3.5 w-3.5" />
                        Upload Template
                    </Button>
                    <Button size="xs" className="gap-2 font-normal" onClick={handleAdd}>
                        <PlusCircle className="h-3.5 w-3.5" />
                        Tambah Lomba
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader className="pb-3 px-4">
                    <div className="flex items-center gap-2 max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Cari nama siswa atau lomba..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 text-xs font-normal"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-[50px] font-normal px-4">No.</TableHead>
                                <TableHead className="font-normal">Nama</TableHead>
                                <TableHead className="font-normal">Juara</TableHead>
                                <TableHead className="font-normal">Lomba</TableHead>
                                <TableHead className="text-right w-[120px] font-normal px-4">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                            <span className="text-xs">Memuat data prestasi...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredCertificates.length > 0 ? (
                                filteredCertificates.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-muted/10">
                                    <TableCell className="text-xs px-4">{index + 1}</TableCell>
                                    <TableCell className="text-xs font-normal">{item.studentName}</TableCell>
                                    <TableCell>{getRankBadge(item.rank)}</TableCell>
                                    <TableCell className="text-xs font-normal">
                                        {item.category === 'lomba' ? item.competitionName : `${getCategoryLabel(item.category)} (TA ${item.academicYear})`}
                                    </TableCell>
                                    <TableCell className="text-right px-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => handlePrintCertificate(item)}>
                                                <Printer className="h-3.5 w-3.5" />
                                            </Button>
                                            {item.category === 'lomba' && (
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground italic">
                                        {searchTerm ? "Tidak ada hasil pencarian." : "Belum ada data sertifikat yang dicatat."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

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
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Sertifikat?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan menghapus catatan prestasi siswa secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="font-normal">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white font-normal">Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
