
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, signInAnonymously, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const adminSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

const teacherSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const parentSchema = z.object({
  nis: z.string().min(1, "NIS is required"),
  password: z.string().min(1, "Password is required"),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const adminForm = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: { email: "mdibnuahmad159@gmail.com", password: "" },
  });

  const teacherForm = useForm<z.infer<typeof teacherSchema>>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { email: "", password: "" },
  });

  const parentForm = useForm<z.infer<typeof parentSchema>>({
    resolver: zodResolver(parentSchema),
    defaultValues: { nis: "", password: "" },
  });

  const handleAdminSubmit = async (values: z.infer<typeof adminSchema>) => {
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login Admin Berhasil",
        description: "Anda akan diarahkan ke dasbor.",
      });
      router.push("/admin/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Email atau password salah.",
      });
    }
  };

  const handleTeacherSubmit = async (values: z.infer<typeof teacherSchema>) => {
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login Berhasil",
        description: "Selamat datang!",
      });
      router.push("/teacher/dashboard"); 
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Email atau password salah.",
      });
    }
  };

  const handleParentSubmit = async (values: z.infer<typeof parentSchema>) => {
    if (!auth || !firestore) return;
    try {
      // Normalisasi NIS: hapus spasi dan ubah ke kapital
      const nisInput = String(values.nis).trim().toUpperCase();
      const prefixedNis = nisInput.startsWith('MDIA') ? nisInput : `MDIA${nisInput}`;

      // 1. Login anonim TERLEBIH DAHULU agar memiliki izin baca (Rules: allow read: if isSignedIn())
      await signInAnonymously(auth);

      // 2. Baca dokumen siswa menggunakan NIS sebagai ID
      const studentRef = doc(firestore, "students", prefixedNis);
      const studentSnap = await getDoc(studentRef);

      // 3. Verifikasi keberadaan data dan kecocokan password
      if (studentSnap.exists() && studentSnap.data().password === values.password) {
        sessionStorage.setItem('studentNis', prefixedNis);
        
        toast({
          title: "Login Wali Murid Berhasil",
          description: "Selamat datang di dasbor santri.",
        });
        router.push("/parent/dashboard");
      } else {
        // Jika gagal verifikasi, segera logout sesi anonim tadi
        await signOut(auth);
        throw new Error("NIS atau password salah.");
      }
    } catch (error: any) {
      // Pastikan logout jika terjadi error apa pun selama proses
      if (auth.currentUser?.isAnonymous) {
        await signOut(auth);
      }
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: error.message || "Pastikan NIS dan password Anda benar.",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="teacher">Guru</TabsTrigger>
            <TabsTrigger value="parent">Wali Murid</TabsTrigger>
          </TabsList>
          
          <div className="p-4">
            <TabsContent value="admin">
                <Form {...adminForm}>
                  <form onSubmit={adminForm.handleSubmit(handleAdminSubmit)} className="space-y-4">
                    <FormField
                      control={adminForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Admin</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@contoh.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={adminForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" size="xs">
                      Login sebagai Admin
                    </Button>
                  </form>
                </Form>
            </TabsContent>

            <TabsContent value="teacher">
              <Form {...teacherForm}>
                <form onSubmit={teacherForm.handleSubmit(handleTeacherSubmit)} className="space-y-4">
                  <FormField
                    control={teacherForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@contoh.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teacherForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="xs">
                    Login sebagai Guru
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="parent">
              <Form {...parentForm}>
                <form onSubmit={parentForm.handleSubmit(handleParentSubmit)} className="space-y-4">
                  <FormField
                    control={parentForm.control}
                    name="nis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIS (Nomor Induk Siswa)</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan NIS" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={parentForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="xs">
                    Login sebagai Wali Murid
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
