
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
import type { Certificate, Student, CertificateRank, CertificateCategory } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  studentId: z.string().min(1, "Siswa harus dipilih"),
  category: z.enum(["lomba", "ranking", "bintang"], { required_error: "Kategori harus dipilih" }),
  rank: z.enum(["Pertama", "Kedua", "Ketiga"], { required_error: "Juara harus dipilih" }),
  competitionName: z.string().optional(),
  date: z.string().min(1, "Tanggal harus diisi"),
  academicYear: z.string().min(1, "Tahun ajaran harus diisi"),
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
  const form = useForm<CertificateFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      category: "lomba",
      rank: "Pertama",
      competitionName: "",
      date: new Date().toISOString().split('T')[0],
      academicYear: "",
    },
  });
  
  useEffect(() => {
    if (isOpen) {
        if (certificate) {
          form.reset({
            studentId: certificate.studentId,
            category: certificate.category || "lomba",
            rank: certificate.rank,
            competitionName: certificate.competitionName || "",
            date: certificate.date,
            academicYear: certificate.academicYear,
          });
        } else {
          form.reset({
            studentId: "",
            category: "lomba",
            rank: "Pertama",
            competitionName: "",
            date: new Date().toISOString().split('T')[0],
            academicYear: "",
          });
        }
    }
  }, [certificate, form, isOpen]);
  
  const onSubmit = (values: CertificateFormData) => {
    onSave(values as Omit<Certificate, 'id' | 'studentName'>);
    setIsOpen(false);
  };

  const category = form.watch("category");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{certificate ? "Edit Sertifikat" : "Tambah Sertifikat"}</DialogTitle>
          <DialogDescription>
            Isi detail prestasi siswa untuk sertifikat digital.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 py-4">
                    <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Pilih Siswa</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih siswa" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {students.map((student) => (
                                    <SelectItem key={student.id} value={student.id}>
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
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Kategori Sertifikat</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih kategori" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="lomba">Sertifikat Lomba</SelectItem>
                                <SelectItem value="ranking">Sertifikat Ranking</SelectItem>
                                <SelectItem value="bintang">Sertifikat Bintang Pelajar</SelectItem>
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
                        <FormLabel>Juara / Peringkat</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih juara" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Pertama">Pertama</SelectItem>
                                <SelectItem value="Kedua">Kedua</SelectItem>
                                <SelectItem value="Ketiga">Ketiga</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {category === "lomba" && (
                        <FormField
                        control={form.control}
                        name="competitionName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nama Lomba</FormLabel>
                            <FormControl>
                                <Input placeholder="Contoh: Lomba MTQ Nasional" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    )}
                    <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tanggal</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="academicYear"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tahun Ajaran</FormLabel>
                        <FormControl>
                            <Input placeholder="Contoh: 2023/2024" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
