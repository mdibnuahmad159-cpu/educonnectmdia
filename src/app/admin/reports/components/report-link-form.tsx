
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, X, Save } from "lucide-react";
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
            <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                <DialogHeader className="sr-only">
                    <DialogTitle>Update Link Rapor</DialogTitle>
                    <DialogDescription>Simpan tautan berkas rapor digital santri.</DialogDescription>
                </DialogHeader>

                <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                </div>

                <div className="w-full space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                        Link Rapor Digital
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase truncate px-4">
                        {student?.name || "Pilih Santri"}
                    </p>
                </div>
            </div>

            <div className="px-6 py-2">
                <ScrollArea className="h-auto max-h-[200px] pr-2">
                    <div className="space-y-4 py-6">
                        <FormField
                          control={form.control}
                          name="reportUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">URL Dokumen (PDF/Drive)</FormLabel>
                              <FormControl>
                                <Input placeholder="https://drive.google.com/..." {...field} className="bg-white h-10 font-normal" />
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
                  <Save className="h-3.5 w-3.5 mr-2" /> Simpan Link
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
