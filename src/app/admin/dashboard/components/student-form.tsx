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
import type { Student } from "@/types";

const formSchema = z.object({
  id: z.string().min(1, "NIS harus diisi"),
  name: z.string().min(1, "Nama harus diisi"),
  class: z.string().min(1, "Kelas harus diisi"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type StudentFormData = z.infer<typeof formSchema>;

type StudentFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  student: Student | null;
  onSave: (student: StudentFormData) => void;
};

export function StudentForm({ isOpen, setIsOpen, student, onSave }: StudentFormProps) {
  const form = useForm<StudentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { id: "", name: "", class: "", password: "" },
  });
  
  useEffect(() => {
    if (student) {
      form.reset({
        id: student.id,
        name: student.name,
        class: student.class,
        password: "", // Reset password on edit for security
      });
    } else {
      form.reset({ id: "", name: "", class: "", password: "" });
    }
  }, [student, form, isOpen]);
  
  const onSubmit = (values: StudentFormData) => {
    onSave(values);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{student ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
          <DialogDescription>
            {student ? "Ubah detail siswa di bawah ini." : "Isi detail siswa baru di bawah ini."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIS</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!!student}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="class"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelas</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (untuk Wali Murid)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={student ? 'Isi untuk mengubah' : ''} {...field} />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
