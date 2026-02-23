
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  firstName: z.string().min(1, "Nama depan harus diisi"),
  lastName: z.string().min(1, "Nama belakang harus diisi"),
  dateOfBirth: z.string().min(1, "Tanggal lahir harus diisi"),
  gender: z.enum(["Laki-laki", "Perempuan"], { required_error: "Jenis kelamin harus dipilih" }),
  address: z.string().min(1, "Alamat harus diisi"),
  enrollmentDate: z.string().min(1, "Tanggal masuk harus diisi"),
  classId: z.string().min(1, "Kelas harus diisi"),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
  avatarUrl: z.string().optional().or(z.literal("")),
  avatar: z.any().optional(),
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
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "Laki-laki" as "Laki-laki" | "Perempuan",
    address: "",
    enrollmentDate: "",
    classId: "",
    password: "",
    avatarUrl: "",
}

export function StudentForm({ isOpen, setIsOpen, student, onSave }: StudentFormProps) {
  const form = useForm<StudentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    if (isOpen) {
        if (student) {
          form.reset({
            nis: student.nis,
            firstName: student.firstName,
            lastName: student.lastName,
            dateOfBirth: student.dateOfBirth,
            gender: student.gender,
            address: student.address,
            enrollmentDate: student.enrollmentDate,
            classId: student.classId,
            password: "", // Always clear password on open
            avatarUrl: student.avatarUrl || "",
          });
        } else {
          form.reset(defaultValues);
        }
    }
  }, [student, form, isOpen]);
  
  const onSubmit = (values: StudentFormData) => {
    const { avatar, ...studentData } = values;
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
              <AvatarImage src={form.watch('avatarUrl') || student.avatarUrl} alt={`${student.firstName} ${student.lastName}`} />
              <AvatarFallback className="text-2xl">{student.firstName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-80 pr-6">
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
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Depan</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Belakang</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Avatar</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/avatar.png" {...field} />
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
                          Atau unggah gambar. File akan disimpan sebagai data URL.
                      </FormDescription>
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
                        <Popover>
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
                                    format(new Date(field.value), "PPP")
                                ) : (
                                    <span>Pilih tanggal</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
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
                    name="enrollmentDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Masuk</FormLabel>
                        <Popover>
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
                                    format(new Date(field.value), "PPP")
                                ) : (
                                    <span>Pilih tanggal</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kelas</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contoh: 1-A"/>
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
