
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

const formSchema = z.object({
  amountDue: z.coerce.number().min(0, "Wajib diisi"),
  amountPaid: z.coerce.number().min(0, "Wajib diisi"),
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
};

export function PaymentForm({ isOpen, setIsOpen, month, studentName, existingData, defaultAmount, onSave }: PaymentFormProps) {
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amountDue: existingData?.amountDue || defaultAmount || 50000,
      amountPaid: existingData?.amountPaid || 0,
      paymentDate: existingData?.paymentDate || new Date().toISOString().split('T')[0],
      notes: existingData?.notes || "",
    },
  });
  
  useEffect(() => {
    if (isOpen) {
        if (existingData) {
          form.reset({
            amountDue: existingData.amountDue,
            amountPaid: existingData.amountPaid,
            paymentDate: existingData.paymentDate,
            notes: existingData.notes || "",
          });
        } else {
          form.reset({
            amountDue: defaultAmount || 50000,
            amountPaid: 0,
            paymentDate: new Date().toISOString().split('T')[0],
            notes: "",
          });
        }
    }
  }, [existingData, form, isOpen, defaultAmount]);
  
  const onSubmit = (values: PaymentFormData) => {
    onSave(values);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Input Pembayaran SPP</DialogTitle>
          <DialogDescription>
            Bulan {month.name} untuk {studentName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="amountDue"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tagihan (Rp)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="amountPaid"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Bayar (Rp)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Pembayaran</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>Catatan (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Misal: Bayar via transfer" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full sm:w-auto">Simpan Pembayaran</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
