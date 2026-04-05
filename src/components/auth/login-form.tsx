"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, signInAnonymously, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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

const parentSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
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

  const handleParentSubmit = async (values: z.infer<typeof parentSchema>) => {
    if (!auth || !firestore) return;
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }

      const rawNis = String(values.nis).trim();
      const upperNis = rawNis.toUpperCase();
      const prefixedNis = upperNis.startsWith('MDIA') ? upperNis : `MDIA${upperNis}`;

      await signInAnonymously(auth);

      let studentDoc: any = null;

      const studentRef = doc(firestore, "students", prefixedNis);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        studentDoc = studentSnap;
      } else {
        const q = query(collection(firestore, "students"), where("nis", "==", prefixedNis));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          studentDoc = qSnap.docs[0];
        } else {
          const qRaw = query(collection(firestore, "students"), where("nis", "==", rawNis));
          const qRawSnap = await getDocs(qRaw);
          if (!qRawSnap.empty) {
            studentDoc = qRawSnap.docs[0];
          }
        }
      }

      if (!studentDoc) {
        await signOut(auth);
        toast({
          variant: "destructive",
          title: "Login Gagal",
          description: "Data santri dengan NIS tersebut tidak ditemukan.",
        });
        return;
      }

      const studentData = studentDoc.data();
      
      if (String(studentData.password) === String(values.password)) {
        sessionStorage.setItem('studentNis', studentDoc.id);
        
        toast({
          title: "Login Berhasil",
          description: `Selamat datang, Wali dari ${studentData.name}.`,
        });
        router.push("/parent/dashboard");
      } else {
        await signOut(auth);
        toast({
          variant: "destructive",
          title: "Login Gagal",
          description: "Password yang Anda masukkan salah.",
        });
      }
    } catch (error: any) {
      if (auth.currentUser?.isAnonymous) {
        await signOut(auth);
      }
      console.error("Parent login error:", error);
      toast({
        variant: "destructive",
        title: "Terjadi Kesalahan",
        description: "Gagal melakukan verifikasi. Harap coba lagi.",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin">Admin</TabsTrigger>
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
                          <Input placeholder="Contoh: 12345" {...field} />
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
