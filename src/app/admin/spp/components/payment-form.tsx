
"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SPPPayment } from "@/types";
import { CreditCard, Trash2, Loader2, X, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  paymentDate: z.string().min(1, "Wajib diisi"),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof formSchema>;

type PaymentFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  month: { id: number; name: string };
  studentName: string;
  existingData: SPPPayment | undefined;
  defaultAmount: number;
  onSave: (data: PaymentFormData) => void;
  onDelete: (monthId: number, paymentId?: string) => Promise<void>;
};

export function PaymentForm({ 
    isOpen, 
    setIsOpen, 
    month, 
    studentName, 
    existingData, 
    defaultAmount, 
    onSave, 
    onDelete 
}: PaymentFormProps) {
  const [showDeleteConfirm, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentDate: existingData?.paymentDate || new Date().toISOString().split('T')[0],
      notes: existingData?.notes || "",
    },
  });
  
  useEffect(() => {
    if (isOpen) {
        if (existingData) {
          form.reset({
            paymentDate: existingData.paymentDate,
            notes: existingData.notes || "",
          });
        } else {
          form.reset({
            paymentDate: new Date().toISOString().split('T')[0],
            notes: "",
          });
        }
    }
  }, [existingData, form, isOpen]);
  
  const onSubmit = (values: PaymentFormData) => {
    onSave(values);
    setIsOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!existingData) return;
    setIsDeleting(true);
    try {
        await onDelete(month.id, existingData.id);
        setShowConfirmDelete(false);
        setTimeout(() => {
            setIsOpen(false);
            document.body.style.pointerEvents = 'auto';
        }, 150);
    } catch (e) {
        console.error("Deletion failed:", e);
        setIsDeleting(false);
    }
  };

  return (
    <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col bg-card">
                        <div className="bg-primary/5 p-6 pt-8 flex flex-col items-center text-center relative">
                            <DialogHeader className="sr-only">
                                <DialogTitle>Pembayaran SPP</DialogTitle>
                                <DialogDescription>Pencatatan iuran bulanan santri.</DialogDescription>
                            </DialogHeader>

                            <div className="p-3 bg-primary/10 rounded-full mb-4">
                                <CreditCard className="h-8 w-8 text-primary" />
                            </div>

                            <div className="w-full space-y-1">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                                    Input Pelunasan SPP
                                </h3>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase px-4 truncate">
                                    {studentName} • Bulan {month.name}
                                </p>
                            </div>
                        </div>

                        <div className="px-6 py-2">
                            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center justify-between mb-4 mt-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-full">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-green-700 tracking-wider">Tagihan Lunas</p>
                                        <p className="text-sm font-bold text-green-800">Rp {defaultAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <ScrollArea className="h-auto max-h-[300px] pr-2">
                                <div className="space-y-4 py-2">
                                    <FormField
                                    control={form.control}
                                    name="paymentDate"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Tanggal Pembayaran</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} className="h-10 bg-white" />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Catatan / Keterangan</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Misal: Pembayaran via Transfer" {...field} value={field.value ?? ""} className="bg-white min-h-[80px]" />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                </div>
                            </ScrollArea>
                        </div>

                        <DialogFooter className="bg-muted/30 p-4 px-6 border-t flex flex-row items-center justify-between sm:justify-between gap-3 mt-2">
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" className="rounded-full px-4 text-xs font-bold uppercase tracking-widest h-10" onClick={() => setIsOpen(false)}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                                {existingData && (
                                    <Button 
                                        type="button" 
                                        variant="destructive" 
                                        className="rounded-full px-4 h-10 shadow-lg shadow-destructive/20"
                                        onClick={() => setShowConfirmDelete(true)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                            <Button type="submit" className="h-10 rounded-full px-8 bg-accent text-primary hover:bg-accent/90 text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20">
                                <Save className="h-3.5 w-3.5 mr-2" /> Simpan Lunas
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowConfirmDelete}>
            <AlertDialogContent className="rounded-[28px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm font-bold uppercase tracking-tight">Hapus Data Pembayaran?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                        Catatan bulan {month.name} akan dihapus secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full h-9 text-xs" disabled={isDeleting}>Batal</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleConfirmDelete} 
                        className="bg-destructive hover:bg-destructive/90 text-white rounded-full h-9 text-xs"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus Data"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
