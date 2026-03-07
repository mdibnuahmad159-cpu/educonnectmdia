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
import { Textarea } from "@/components/ui/textarea";
import type { SPPPayment } from "@/types";
import { CreditCard, Trash2 } from "lucide-react";

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
  onDelete: (month: number) => void;
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Konfirmasi Pembayaran SPP</DialogTitle>
          <DialogDescription>
            Input pelunasan bulan {month.name} untuk {studentName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                    <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Nominal Pelunasan</p>
                    <p className="text-sm font-bold text-primary">Rp {defaultAmount.toLocaleString()}</p>
                </div>
            </div>
            <div className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded font-bold uppercase">
                Lunas
            </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Pembayaran</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-9 font-normal" />
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
                      <FormLabel>Catatan / Keterangan (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Misal: Bayar lunas" {...field} value={field.value ?? ""} className="font-normal min-h-[80px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <DialogFooter className="pt-2 flex flex-row justify-between sm:justify-between items-center">
              <div>
                {existingData && (
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="xs" 
                        className="gap-1.5 font-normal"
                        onClick={() => {
                            if (window.confirm(`Hapus catatan pembayaran bulan ${month.name}?`)) {
                                onDelete(month.id);
                                setIsOpen(false);
                            }
                        }}
                    >
                        <Trash2 className="h-3 w-3" />
                        Hapus Data
                    </Button>
                )}
              </div>
              <Button type="submit" className="font-normal">Simpan Sebagai Lunas</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
