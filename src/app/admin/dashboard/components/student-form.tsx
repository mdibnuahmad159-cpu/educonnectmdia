
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  FormDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Student } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  nis: z.string().min(1, "NIS harus diisi"),
  name: z.string().min(1, "Nama harus diisi"),
  nik: z.string().optional(),
  gender: z.enum(["Laki-laki", "Perempuan"], { required_error: "Jenis kelamin harus dipilih" }),
  tempatLahir: z.string().optional(),
  dateOfBirth: z.string().min(1, "Tanggal lahir harus diisi"),
  namaAyah: z.string().optional(),
  namaIbu: z.string().optional(),
  address: z.string().min(1, "Alamat harus diisi"),
  avatarUrl: z.string().optional().or(z.literal("")),
  avatar: z.any().optional(),
  dokumenUrl: z.string().optional().or(z.literal("")),
  dokumen: z.any().optional(),
});

type StudentFormData = z.infer<typeof formSchema>;

type StudentFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  student: Student | null;
  onSave: (student: any) => void;
};

const defaultValues = {
    nis: "",
    name: "",
    nik: "",
    gender: "Laki-laki" as "Laki-laki" | "Perempuan",
    tempatLahir: "",
    dateOfBirth: "",
    namaAyah: "",
    namaIbu: "",
    address: "",
    avatarUrl: "",
    dokumenUrl: "",
}

export function StudentForm({ isOpen, setIsOpen, student, onSave }: StudentFormProps) {
  const form = useForm<StudentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  const [isDobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [tempDob, setTempDob] = useState<Date | undefined>();
  
  useEffect(() => {
    if (isOpen) {
        if (student) {
          form.reset({
            ...student,
            nik: student.nik || "",
            tempatLahir: student.tempatLahir || "",
            namaAyah: student.namaAyah || "",
            namaIbu: student.namaIbu || "",
            avatarUrl: student.avatarUrl || "",
            dokumenUrl: student.dokumenUrl || "",
          });
        } else {
          form.reset(defaultValues);
        }
    }
  }, [student, form, isOpen]);

  useEffect(() => {
    if (isDobPopoverOpen) {
      const formValue = form.getValues('dateOfBirth');
      setTempDob(formValue ? new Date(formValue) : undefined);
    }
  }, [isDobPopoverOpen, form]);
  
  const onSubmit = (values: StudentFormData) => {
    const { avatar, dokumen, ...studentData } = values;
    onSave(studentData);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{student ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
          <DialogDescription>
            {student ? "Ubah detail siswa di bawah ini." : "Isi detail siswa baru di bawah ini."}
          </DialogDescription>
        </DialogHeader>
        {student && (
          <div className="flex justify-center pt-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={form.watch('avatarUrl') || student.avatarUrl} alt={student.name} className="object-cover" />
              <AvatarFallback className="text-2xl">{student.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[65vh] pr-6">
              <div className="space-y-3 py-4">
                <FormField
                  control={form.control}
                  name="nis"
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
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Avatar</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                form.setValue('avatarUrl', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                            field.onChange(file ?? null);
                          }} 
                        />
                      </FormControl>
                      <FormDescription>
                          Unggah foto siswa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="nik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIK</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Kelamin</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis kelamin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                          <SelectItem value="Perempuan">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tempatLahir"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempat Lahir</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Lahir</FormLabel>
                        <Popover open={isDobPopoverOpen} onOpenChange={setDobPopoverOpen}>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(new Date(field.value), "d MMMM yyyy")
                                ) : (
                                    <span>Pilih tanggal</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0" align="start">
                                <div className="p-4 rounded-t-md bg-slate-800 text-white">
                                    <div className="text-sm text-slate-400">{tempDob ? format(tempDob, "yyyy") : new Date().getFullYear()}</div>
                                    <div className="text-3xl font-bold">{tempDob ? format(tempDob, "E, MMM d") : "Pilih tanggal"}</div>
                                </div>
                                <div className="p-2 bg-slate-900">
                                    <Calendar
                                        mode="single"
                                        selected={tempDob}
                                        onSelect={setTempDob}
                                        disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                        captionLayout="dropdown-buttons"
                                        fromYear={1950}
                                        toYear={new Date().getFullYear()}
                                        classNames={{
                                            root: "text-white",
                                            caption: "flex items-center justify-between",
                                            nav: "flex items-center gap-1",
                                            head_cell: "text-slate-400 w-8 font-normal text-sm",
                                            cell: "h-8 w-8 text-center text-sm p-0 relative",
                                            day: "h-8 w-8 p-0 font-normal rounded-full transition-colors hover:bg-slate-700",
                                            day_selected: "bg-amber-600 text-white hover:bg-amber-700 focus:bg-amber-700",
                                            day_today: "rounded-full bg-slate-700 text-white",
                                            day_outside: "text-slate-500",
                                            day_disabled: "text-slate-600",
                                            nav_button: cn(
                                                buttonVariants({ variant: "ghost" }),
                                                "h-7 w-7 bg-transparent p-0 text-white opacity-80 hover:opacity-100 hover:bg-slate-700"
                                            ),
                                            caption_label: "hidden",
                                            caption_dropdowns: "flex gap-2 [&>div]:w-full",
                                            dropdown: "text-sm p-1 w-full rounded-md bg-slate-700 border-slate-600 text-white focus:ring-1 focus:ring-amber-500",
                                            dropdown_month: "w-full",
                                            dropdown_year: "w-full",
                                        }}
                                    />
                                </div>
                                <div className="flex justify-around items-center p-2 rounded-b-md bg-slate-800">
                                    <Button variant="ghost" size="sm" type="button" className="text-amber-500 hover:text-amber-400 hover:bg-transparent" onClick={() => {
                                        form.setValue('dateOfBirth', '', { shouldValidate: true });
                                        setDobPopoverOpen(false);
                                    }}>Clear</Button>
                                    <Button variant="ghost" size="sm" type="button" className="text-amber-500 hover:text-amber-400 hover:bg-transparent" onClick={() => setDobPopoverOpen(false)}>Cancel</Button>
                                    <Button variant="ghost" size="sm" type="button" className="text-amber-500 hover:text-amber-400 hover:bg-transparent font-bold" onClick={() => {
                                        form.setValue('dateOfBirth', tempDob?.toISOString() || '', { shouldValidate: true });
                                        setDobPopoverOpen(false);
                                    }}>Set</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <FormField
                  control={form.control}
                  name="namaAyah"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Ayah</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="namaIbu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Ibu</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="dokumen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload File</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                form.setValue('dokumenUrl', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                            field.onChange(file ?? null)
                          }} 
                        />
                      </FormControl>
                      <FormDescription>
                          Unggah berkas seperti Akta, KK, dll.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="submit" size="sm">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    

    