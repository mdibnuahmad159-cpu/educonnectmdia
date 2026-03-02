
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Firestore, query, orderBy } from "firebase/firestore";
import type { Certificate, Student, CertificateTemplate } from "@/types";
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
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, Award, Search, Upload, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { addCertificate, updateCertificate, deleteCertificate } from "@/lib/firebase-helpers";
import { CertificateForm } from "./components/certificate-form";
import { TemplateUploadDialog } from "./components/template-upload-dialog";
import { format, parseISO } from "date-fns";
import { id as dfnsId } from "date-fns/locale";
import jsPDF from "jspdf";

export default function CertificatesPage() {
    const firestore = useFirestore() as Firestore;
    const certificatesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "certificates"), orderBy("date", "desc"));
    }, [firestore]);
    
    const { data: certificates, loading: loadingCertificates } = useCollection<Certificate>(certificatesQuery);
    
    const studentsCollection = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore]);
    const { data: students, loading: loadingStudents } = useCollection<Student>(studentsCollection);

    const templatesCollection = useMemoFirebase(() => firestore ? collection(firestore, "certificate_templates") : null, [firestore]);
    const { data: templates } = useCollection<CertificateTemplate>(templatesCollection);
    
    const { toast } = useToast();

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

        const doc = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Render Background Template
        doc.addImage(template.imageUrl, "JPEG", 0, 0, pageWidth, pageHeight);

        // Render Dynamic Text
        // Catatan: Posisi X dan Y ini adalah estimasi umum, admin mungkin perlu menyesuaikan desain template-nya.
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.setTextColor(0, 0, 0);
        
        // Nama Siswa
        const nameText = certificate.studentName.toUpperCase();
        doc.text(nameText, pageWidth / 2, pageHeight / 2 - 20, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(18);
        
        // Keterangan Juara
        const rankText = `Sebagai Juara ${certificate.rank}`;
        doc.text(rankText, pageWidth / 2, pageHeight / 2 + 20, { align: "center" });

        // Keterangan Lomba/Prestasi
        if (certificate.category === 'lomba' && certificate.competitionName) {
            doc.text(`Dalam Kegiatan ${certificate.competitionName}`, pageWidth / 2, pageHeight / 2 + 50, { align: "center" });
        } else if (certificate.category === 'ranking') {
            doc.text(`Peringkat Kelas Semester ${certificate.academicYear}`, pageWidth / 2, pageHeight / 2 + 50, { align: "center" });
        } else if (certificate.category === 'bintang') {
            doc.text(`Bintang Pelajar Tahun Ajaran ${certificate.academicYear}`, pageWidth / 2, pageHeight / 2 + 50, { align: "center" });
        }

        // Tanggal
        const dateFormatted = format(parseISO(certificate.date), "d MMMM yyyy", { locale: dfnsId });
        doc.setFontSize(12);
        doc.text(dateFormatted, pageWidth - 60, pageHeight - 60, { align: "right" });

        doc.save(`Sertifikat_${certificate.studentName}_${certificate.category}.pdf`);
    };

    const getRankBadge = (rank: Certificate['rank']) => {
        switch (rank) {
            case 'Pertama': return <Badge className="bg-yellow-500 hover:bg-yellow-600 border-none">Juara 1</Badge>;
            case 'Kedua': return <Badge className="bg-slate-400 hover:bg-slate-500 border-none">Juara 2</Badge>;
            case 'Ketiga': return <Badge className="bg-amber-700 hover:bg-amber-800 border-none">Juara 3</Badge>;
            default: return <Badge variant="outline">{rank}</Badge>;
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
                    <h1 className="text-xl font-bold font-headline text-primary">Sertifikat & Prestasi</h1>
                    <p className="text-xs text-muted-foreground">Kelola catatan prestasi dan cetak sertifikat digital.</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-2 border-primary/30 text-primary" onClick={() => setIsTemplateOpen(true)}>
                        <Upload className="h-4 w-4" />
                        Upload Template
                    </Button>
                    <Button size="sm" className="gap-2" onClick={handleAdd}>
                        <PlusCircle className="h-4 w-4" />
                        Tambah Prestasi
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Cari nama siswa atau lomba..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">No.</TableHead>
                                <TableHead>Nama Siswa</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Juara</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="text-right w-[120px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                            <span className="text-xs">Memuat data prestasi...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredCertificates.length > 0 ? (
                                filteredCertificates.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell className="text-xs">{index + 1}</TableCell>
                                    <TableCell className="font-medium text-xs">{item.studentName}</TableCell>
                                    <TableCell className="text-[10px] uppercase text-muted-foreground">
                                        {getCategoryLabel(item.category)}
                                    </TableCell>
                                    <TableCell>{getRankBadge(item.rank)}</TableCell>
                                    <TableCell className="text-xs">
                                        {item.category === 'lomba' ? item.competitionName : `Semester ${item.academicYear}`}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => handlePrintCertificate(item)}>
                                                <Printer className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground italic">
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
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white">Hapus</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
