
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { signInAnonymously, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, Firestore } from 'firebase/firestore';

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
  const firestore = useFirestore() as Firestore;

  const adminForm = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: { password: "" },
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
    if (!auth || !firestore) return;
    if (values.password === "useAdmin") {
      try {
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        // Automatically create the admin role document
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        await setDoc(adminRoleRef, { createdAt: serverTimestamp() });
        
        toast({
          title: "Login Admin Berhasil",
          description: "Peran admin telah diberikan secara otomatis untuk sesi ini.",
        });
        router.push("/admin/dashboard");
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Login Gagal",
          description: `Gagal memulai sesi admin: ${error.message}`,
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Password admin salah.",
      });
      adminForm.reset();
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
      router.push("/admin/dashboard"); 
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Email atau password salah.",
      });
    }
  };

  const handleParentSubmit = (values: z.infer<typeof parentSchema>) => {
    // Mock authentication
    console.log("Parent login attempt:", values);
    toast({
      title: "Fitur Dalam Pengembangan",
      description: "Login wali murid akan segera tersedia.",
    });
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
                    <p className="text-center text-sm text-muted-foreground">
                      Gunakan password pengembangan untuk mendapatkan akses admin.
                    </p>
                    <FormField
                      control={adminForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password Admin</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" size="sm">
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
                  <Button type="submit" className="w-full" size="sm">
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
                  <Button type="submit" className="w-full" size="sm">
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
