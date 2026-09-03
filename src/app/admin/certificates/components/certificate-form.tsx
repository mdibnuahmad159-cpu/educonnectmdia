
"use client";

import { useEffect } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Certificate, Student } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAcademicYear } from "@/context/academic-year-provider";
import { Award, X, Save } from "lucide-react";

const formSchema = z.object({
  studentId: z.string().min(1, "Siswa harus dipilih"),
  rank: z.enum(["Pertama", "Kedua", "Ketiga"], { required_error: "Juara harus dipilih" }),
  competitionName: z.string().min(1, "Nama lomba harus diisi"),
  date: z.string().min(1, "Tanggal harus diisi"),
});

type CertificateFormData = z.infer<typeof formSchema>;

type CertificateFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  certificate: Certificate | null;
  students: Student[];
  onSave: (data: Omit<Certificate, 'id' | 'studentName'>) => void;
};

export function CertificateForm({ isOpen, setIsOpen, certificate, students, onSave }: CertificateFormProps) {
  const { activeYear } = useAcademicYear();
  const form = useForm<CertificateFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      rank: "Pertama",
      competitionName: "",
      date: new Date().toISOString().split('T')[0],
    },
  });
  
  useEffect(() => {
    if (isOpen) {
        if (certificate) {
          form.reset({
            studentId: certificate.studentId,
            rank: certificate.rank,
            competitionName: certificate.competitionName || "",
            date: certificate.date,
          });
        } else {
          form.reset({
            studentId: "",
            rank: "Pertama",
            competitionName: "",
            date: new Date().toISOString().split('T')[0],
          });
        }
    }
  }, [certificate, form, isOpen]);
  
  const onSubmit = (values: CertificateFormData) => {
    onSave({
        ...values,
        category: "lomba",
        academicYear: activeYear,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                <DialogHeader className="sr-only">
                    <DialogTitle>{certificate ? "Edit Sertifikat" : "Tambah Sertifikat"}</DialogTitle>
                    <DialogDescription>Input prestasi lomba siswa secara manual.</DialogDescription>
                </DialogHeader>

                <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Award className="h-8 w-8 text-primary" />
                </div>

                <div className="w-full space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                        {certificate ? "Edit Prestasi Lomba" : "Tambah Prestasi Lomba"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Madrasah Diniyah Ibnu Ahmad</p>
                </div>
            </div>

            <div className="px-6 py-2">
                <ScrollArea className="h-[350px] pr-2">
                    <div className="space-y-4 py-4">
                        <FormField
                        control={form.control}
                        name="studentId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Pilih Siswa</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-9 text-xs bg-white">
                                    <SelectValue placeholder="Cari nama siswa" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {students.map((student) => (
                                        <SelectItem key={student.id} value={student.id} className="text-xs">
                                            {student.name} ({student.nis})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="rank"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Juara</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-9 text-xs bg-white">
                                    <SelectValue placeholder="Pilih tingkat juara" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Pertama">Juara Pertama</SelectItem>
                                    <SelectItem value="Kedua">Juara Kedua</SelectItem>
                                    <SelectItem value="Ketiga">Juara Ketiga</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="competitionName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nama Lomba / Kompetisi</FormLabel>
                            <FormControl>
                                <Input placeholder="Contoh: Lomba MTQ Tingkat Kecamatan" {...field} className="bg-white h-9" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Tanggal Pelaksanaan</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} className="bg-white h-9" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </ScrollArea>
            </div>

            <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3 mt-2">
                <Button type="button" variant="ghost" className="rounded-full px-6 text-xs font-bold uppercase tracking-widest h-10" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5 mr-2" /> Batal
                </Button>
                <Button type="submit" className="h-10 rounded-full px-8 bg-accent text-primary hover:bg-accent/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20">
                  <Save className="h-3.5 w-3.5 mr-2" /> Simpan Sertifikat
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
