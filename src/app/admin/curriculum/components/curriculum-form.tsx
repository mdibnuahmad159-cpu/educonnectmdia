
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
import type { Curriculum } from "@/types";

const formSchema = z.object({
  subjectCode: z.string().min(1, "Kode Mapel harus diisi"),
  subjectName: z.string().min(1, "Nama Mapel harus diisi"),
  classLevel: z.coerce.number({invalid_type_error: "Kelas harus dipilih"}).min(0, "Kelas harus dipilih"),
  bookName: z.string().optional(),
});

type CurriculumFormData = z.infer<typeof formSchema>;

type CurriculumFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  curriculum: Curriculum | null;
  onSave: (data: CurriculumFormData) => void;
};

const defaultValues: CurriculumFormData = {
    subjectCode: "",
    subjectName: "",
    classLevel: 0,
    bookName: "",
}

export function CurriculumForm({ isOpen, setIsOpen, curriculum, onSave }: CurriculumFormProps) {
  const form = useForm<CurriculumFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    if (isOpen) {
        if (curriculum) {
          form.reset(curriculum);
        } else {
          form.reset(defaultValues);
        }
    }
  }, [curriculum, form, isOpen]);
  
  const onSubmit = (values: CurriculumFormData) => {
    onSave(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{curriculum ? "Edit Kurikulum" : "Tambah Kurikulum"}</DialogTitle>
          <DialogDescription>
            {curriculum ? "Ubah detail item kurikulum." : "Isi detail item kurikulum baru."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-3 py-4">
                <FormField
                  control={form.control}
                  name="subjectCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kode Mapel</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="subjectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Mapel</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="classLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kelas</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kelas" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {[...Array(7).keys()].map(i => (
                                <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bookName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Kitab (Opsional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" size="xs">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
