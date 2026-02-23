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
  reportUrl: z.string().url({ message: "URL tidak valid." }).or(z.literal("")),
});

type ReportLinkFormData = z.infer<typeof formSchema>;

type ReportLinkFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  student: Student | null;
  onSave: (studentId: string, url: string) => void;
};

export function ReportLinkForm({ isOpen, setIsOpen, student, onSave }: ReportLinkFormProps) {
  const form = useForm<ReportLinkFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportUrl: "",
    },
  });
  
  useEffect(() => {
    if (student) {
      form.reset({ reportUrl: student.reportUrl || "" });
    }
  }, [student, form]);

  const onSubmit = (values: ReportLinkFormData) => {
    if (student) {
        onSave(student.id, values.reportUrl);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Link Rapor untuk {student?.name}</DialogTitle>
          <DialogDescription>
            Masukkan atau perbarui URL untuk rapor digital siswa ini.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="reportUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Rapor</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
