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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  ShieldCheck, 
  UserCircle2, 
  Loader2, 
  GraduationCap, 
  WalletCards, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Shield
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const adminSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

const parentSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

const teacherSchema = z.object({
  nig: z.string().min(1, "NIG wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

const externalSchema = z.object({
  nip: z.string().min(1, "NIP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isParentLoading, setIsParentLoading] = useState(false);
  const [isTeacherLoading, setIsTeacherLoading] = useState(false);
  const [isExternalLoading, setIsExternalLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const adminForm = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: { email: "mdibnuahmad159@gmail.com", password: "" },
  });

  const parentForm = useForm<z.infer<typeof parentSchema>>({
    resolver: zodResolver(parentSchema),
    defaultValues: { nis: "", password: "" },
  });

  const teacherForm = useForm<z.infer<typeof teacherSchema>>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { nig: "", password: "" },
  });

  const externalForm = useForm<z.infer<typeof externalSchema>>({
    resolver: zodResolver(externalSchema),
    defaultValues: { nip: "", password: "" },
  });

  const handleAdminSubmit = async (values: z.infer<typeof adminSchema>) => {
    if (!auth) return;
    setIsAdminLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "Login Admin Berhasil" });
      router.push("/admin/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Gagal", description: "Email atau password salah." });
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleParentSubmit = async (values: z.infer<typeof parentSchema>) => {
    if (!auth || !firestore) return;
    setIsParentLoading(true);
    try {
      if (auth.currentUser) await signOut(auth);
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
        if (!qSnap.empty) studentDoc = qSnap.docs[0];
      }

      if (!studentDoc || String(studentDoc.data().password) !== String(values.password)) {
        await signOut(auth);
        toast({ variant: "destructive", title: "Gagal", description: "NIS atau password salah." });
        return;
      }

      sessionStorage.setItem('studentNis', studentDoc.id);
      toast({ title: "Selamat Datang", description: `Wali dari ${studentDoc.data().name}` });
      router.push("/parent/dashboard");
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Terjadi Kesalahan" });
    } finally {
      setIsParentLoading(false);
    }
  };

  const handleTeacherSubmit = async (values: z.infer<typeof teacherSchema>) => {
    if (!auth || !firestore) return;
    setIsTeacherLoading(true);
    try {
      if (auth.currentUser) await signOut(auth);
      const rawNig = String(values.nig).trim();
      await signInAnonymously(auth);
      const teacherRef = doc(firestore, "teachers", rawNig);
      const teacherSnap = await getDoc(teacherRef);

      if (!teacherSnap.exists() || String(teacherSnap.data().password) !== String(values.password)) {
        await signOut(auth);
        toast({ variant: "destructive", title: "Gagal", description: "NIG atau password salah." });
        return;
      }

      sessionStorage.setItem('teacherNig', teacherSnap.id);
      toast({ title: "Selamat Datang", description: `Ust/Ustzh ${teacherSnap.data().name}` });
      router.push("/teacher/dashboard");
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Terjadi Kesalahan" });
    } finally {
      setIsTeacherLoading(false);
    }
  };

  const handleExternalSubmit = async (values: z.infer<typeof externalSchema>) => {
    if (!auth || !firestore) return;
    setIsExternalLoading(true);
    try {
      if (auth.currentUser) await signOut(auth);
      const rawNip = String(values.nip).trim();
      await signInAnonymously(auth);
      const saverRef = doc(firestore, "externalSavers", rawNip);
      const saverSnap = await getDoc(saverRef);

      if (!saverSnap.exists() || String(saverSnap.data().password) !== String(values.password)) {
        await signOut(auth);
        toast({ variant: "destructive", title: "Gagal", description: "NIP atau password salah." });
        return;
      }

      sessionStorage.setItem('externalNip', saverSnap.id);
      toast({ title: "Selamat Datang", description: saverSnap.data().name });
      router.push("/external/dashboard");
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Terjadi Kesalahan" });
    } finally {
      setIsExternalLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="parent" className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-12 bg-white/5 backdrop-blur-md rounded-2xl p-1 border border-white/10 mb-6">
          <TabsTrigger value="parent" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary text-white/50 text-[10px] font-bold uppercase transition-all"><UserCircle2 className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Wali</span></TabsTrigger>
          <TabsTrigger value="teacher" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary text-white/50 text-[10px] font-bold uppercase transition-all"><GraduationCap className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Guru</span></TabsTrigger>
          <TabsTrigger value="admin" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary text-white/50 text-[10px] font-bold uppercase transition-all"><ShieldCheck className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Admin</span></TabsTrigger>
          <TabsTrigger value="external" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary text-white/50 text-[10px] font-bold uppercase transition-all"><WalletCards className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Umum</span></TabsTrigger>
        </TabsList>

        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 border border-white/20">
          <TabsContent value="parent" className="mt-0">
             <div className="mb-8">
               <h2 className="text-xl font-bold text-foreground tracking-tight">Masuk Wali Murid</h2>
               <p className="text-xs text-muted-foreground mt-1">Gunakan NIS santri sebagai username.</p>
             </div>
             <Form {...parentForm}>
               <form onSubmit={parentForm.handleSubmit(handleParentSubmit)} className="space-y-5">
                 <FormField control={parentForm.control} name="nis" render={({ field }) => (
                   <FormItem className="space-y-1.5">
                     <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nomor Induk Siswa (NIS)</FormLabel>
                     <div className="relative">
                       <User className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/40" />
                       <FormControl><Input placeholder="Masukkan NIS..." {...field} className="h-12 pl-12 rounded-2xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                     </div>
                     <FormMessage />
                   </FormItem>
                 )} />
                 <FormField control={parentForm.control} name="password" render={({ field }) => (
                   <FormItem className="space-y-1.5">
                     <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Password</FormLabel>
                     <div className="relative">
                       <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/40" />
                       <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-12 pl-12 pr-12 rounded-2xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-muted-foreground/40 hover:text-primary transition-colors">
                         {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                       </button>
                     </div>
                     <FormMessage />
                   </FormItem>
                 )} />
                 <Button type="submit" className="w-full h-12 rounded-2xl bg-[#00796B] hover:bg-[#00695C] text-sm font-bold uppercase tracking-widest gap-2 shadow-lg shadow-teal-900/20" disabled={isParentLoading}>
                   {isParentLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Masuk <ArrowRight className="h-4 w-4" /></>}
                 </Button>
               </form>
             </Form>
          </TabsContent>

          <TabsContent value="teacher" className="mt-0">
             <div className="mb-8">
               <h2 className="text-xl font-bold text-foreground tracking-tight">Masuk Guru</h2>
               <p className="text-xs text-muted-foreground mt-1">Masukkan NIG dan password pengajar Anda.</p>
             </div>
             <Form {...teacherForm}>
               <form onSubmit={teacherForm.handleSubmit(handleTeacherSubmit)} className="space-y-5">
                 <FormField control={teacherForm.control} name="nig" render={({ field }) => (
                   <FormItem className="space-y-1.5">
                     <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nomor Induk Guru (NIG)</FormLabel>
                     <div className="relative">
                       <GraduationCap className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/40" />
                       <FormControl><Input placeholder="Masukkan NIG..." {...field} className="h-12 pl-12 rounded-2xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                     </div>
                     <FormMessage />
                   </FormItem>
                 )} />
                 <FormField control={teacherForm.control} name="password" render={({ field }) => (
                   <FormItem className="space-y-1.5">
                     <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Password</FormLabel>
                     <div className="relative">
                       <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/40" />
                       <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-12 pl-12 pr-12 rounded-2xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-muted-foreground/40 hover:text-primary transition-colors">
                         {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                       </button>
                     </div>
                     <FormMessage />
                   </FormItem>
                 )} />
                 <Button type="submit" className="w-full h-12 rounded-2xl bg-[#00796B] hover:bg-[#00695C] text-sm font-bold uppercase tracking-widest gap-2 shadow-lg shadow-teal-900/20" disabled={isTeacherLoading}>
                   {isTeacherLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Masuk <ArrowRight className="h-4 w-4" /></>}
                 </Button>
               </form>
             </Form>
          </TabsContent>

          <TabsContent value="admin" className="mt-0">
             <div className="mb-8">
               <h2 className="text-xl font-bold text-foreground tracking-tight">Login Administrator</h2>
               <p className="text-xs text-muted-foreground mt-1">Akses khusus petugas dan staf resmi.</p>
             </div>
             <Form {...adminForm}>
               <form onSubmit={adminForm.handleSubmit(handleAdminSubmit)} className="space-y-5">
                 <FormField control={adminForm.control} name="email" render={({ field }) => (
                   <FormItem className="space-y-1.5">
                     <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email Admin</FormLabel>
                     <div className="relative">
                       <Shield className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/40" />
                       <FormControl><Input type="email" placeholder="admin@madrasah.com" {...field} className="h-12 pl-12 rounded-2xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                     </div>
                     <FormMessage />
                   </FormItem>
                 )} />
                 <FormField control={adminForm.control} name="password" render={({ field }) => (
                   <FormItem className="space-y-1.5">
                     <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Password</FormLabel>
                     <div className="relative">
                       <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/40" />
                       <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-12 pl-12 pr-12 rounded-2xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-muted-foreground/40 hover:text-primary transition-colors">
                         {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                       </button>
                     </div>
                     <FormMessage />
                   </FormItem>
                 )} />
                 <Button type="submit" className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-sm font-bold uppercase tracking-widest gap-2 shadow-lg shadow-emerald-900/20" disabled={isAdminLoading}>
                   {isAdminLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Masuk Sistem <ArrowRight className="h-4 w-4" /></>}
                 </Button>
               </form>
             </Form>
          </TabsContent>

          <TabsContent value="external" className="mt-0">
             <div className="mb-8">
               <h2 className="text-xl font-bold text-foreground tracking-tight">Penabung Umum</h2>
               <p className="text-xs text-muted-foreground mt-1">Cek riwayat tabungan menggunakan NIP.</p>
             </div>
             <Form {...externalForm}>
               <form onSubmit={externalForm.handleSubmit(handleExternalSubmit)} className="space-y-5">
                 <FormField control={externalForm.control} name="nip" render={({ field }) => (
                   <FormItem className="space-y-1.5">
                     <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nomor Induk Penabung (NIP)</FormLabel>
                     <div className="relative">
                       <WalletCards className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/40" />
                       <FormControl><Input placeholder="Masukkan NIP..." {...field} className="h-12 pl-12 rounded-2xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                     </div>
                     <FormMessage />
                   </FormItem>
                 )} />
                 <FormField control={externalForm.control} name="password" render={({ field }) => (
                   <FormItem className="space-y-1.5">
                     <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Password</FormLabel>
                     <div className="relative">
                       <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/40" />
                       <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-12 pl-12 pr-12 rounded-2xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-muted-foreground/40 hover:text-primary transition-colors">
                         {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                       </button>
                     </div>
                     <FormMessage />
                   </FormItem>
                 )} />
                 <Button type="submit" className="w-full h-12 rounded-2xl bg-[#00796B] hover:bg-[#00695C] text-sm font-bold uppercase tracking-widest gap-2 shadow-lg shadow-teal-900/20" disabled={isExternalLoading}>
                   {isExternalLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Masuk Tabungan <ArrowRight className="h-4 w-4" /></>}
                 </Button>
               </form>
             </Form>
          </TabsContent>
          
          <div className="mt-8 flex items-center justify-center gap-2 p-3 bg-muted/20 rounded-2xl border border-dashed border-muted">
            <Lock className="h-3 w-3 text-muted-foreground/60" />
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">
              Data Anda aman & terenkripsi. Sesi dilindungi.
            </p>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
