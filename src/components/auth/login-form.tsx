"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, signInAnonymously, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, UserCircle2, Loader2 } from "lucide-react";

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
  
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isParentLoading, setIsParentLoading] = useState(false);

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
    setIsAdminLoading(true);
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
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleParentSubmit = async (values: z.infer<typeof parentSchema>) => {
    if (!auth || !firestore) return;
    setIsParentLoading(true);
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
    } finally {
      setIsParentLoading(false);
    }
  };

  return (
    <div className="grid gap-4 w-full">
      {/* Portal Wali Murid */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 group transition-all shadow-sm">
            <UserCircle2 className="h-6 w-6 text-primary/60 group-hover:text-primary transition-colors" />
            <span className="text-xs font-bold uppercase tracking-widest">Portal Wali Murid</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-primary" />
              Portal Wali Murid
            </DialogTitle>
            <DialogDescription>
              Masuk menggunakan NIS santri dan password dari madrasah.
            </DialogDescription>
          </DialogHeader>
          <Form {...parentForm}>
            <form onSubmit={parentForm.handleSubmit(handleParentSubmit)} className="space-y-4 pt-4">
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
              <Button type="submit" className="w-full h-10 font-bold" disabled={isParentLoading}>
                {isParentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "MASUK KE DASHBOARD"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Akses Administrator */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" className="text-muted-foreground hover:text-primary text-[10px] uppercase font-bold tracking-[0.2em] gap-1.5 h-8 mt-2">
            <ShieldCheck className="h-3 w-3" />
            Akses Administrator
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Login Admin
            </DialogTitle>
            <DialogDescription>
              Khusus untuk petugas dan staf madrasah berwenang.
            </DialogDescription>
          </DialogHeader>
          <Form {...adminForm}>
            <form onSubmit={adminForm.handleSubmit(handleAdminSubmit)} className="space-y-4 pt-4">
              <FormField
                control={adminForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Admin</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@madrasah.com" {...field} />
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
              <Button type="submit" className="w-full h-10 font-bold" disabled={isAdminLoading}>
                {isAdminLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "LOGIN SEBAGAI ADMIN"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
