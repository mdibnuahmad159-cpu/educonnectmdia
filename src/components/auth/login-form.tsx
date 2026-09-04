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
  nis: z.string().min(1, "NIS/NIK wajib diisi"),
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
    defaultValues: { email: "", password: "" },
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
      await signInAnonymously(auth);

      const input = String(values.nis).trim();
      const upperInput = input.toUpperCase();
      const prefixed = upperInput.startsWith('MDIA') ? upperInput : `MDIA${upperInput}`;
      const unprefixed = upperInput.startsWith('MDIA') ? upperInput.slice(4) : upperInput;

      let studentDoc: any = null;

      const studentRef = doc(firestore, "students", prefixed);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        studentDoc = studentSnap;
      } else {
        const possibleNis = Array.from(new Set([input, upperInput, prefixed, unprefixed]));
        const qNis = query(collection(firestore, "students"), where("nis", "in", possibleNis));
        const qNisSnap = await getDocs(qNis);
        
        if (!qNisSnap.empty) {
          studentDoc = qNisSnap.docs[0];
        } else {
          const qNik = query(collection(firestore, "students"), where("nik", "==", input));
          const qNikSnap = await getDocs(qNik);
          if (!qNikSnap.empty) {
            studentDoc = qNikSnap.docs[0];
          }
        }
      }

      if (!studentDoc || String(studentDoc.data().password) !== String(values.password)) {
        await signOut(auth);
        toast({ variant: "destructive", title: "Gagal Masuk", description: "NIS/NIK atau password salah." });
        return;
      }

      sessionStorage.setItem('studentNis', studentDoc.id);
      toast({ title: "Selamat Datang", description: `Wali dari ${studentDoc.data().name}` });
      router.push("/parent/dashboard");
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Terjadi Kesalahan", description: "Gagal menghubungkan ke server." });
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
      
      let teacherDoc: any = null;
      const teacherRef = doc(firestore, "teachers", rawNig);
      const teacherSnap = await getDoc(teacherRef);

      if (teacherSnap.exists()) {
        teacherDoc = teacherSnap;
      } else {
        const q = query(collection(firestore, "teachers"), where("nig", "==", rawNig));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) teacherDoc = qSnap.docs[0];
      }

      if (!teacherDoc || String(teacherDoc.data().password) !== String(values.password)) {
        await signOut(auth);
        toast({ variant: "destructive", title: "Gagal Masuk", description: "NIG atau password salah." });
        return;
      }

      sessionStorage.setItem('teacherNig', teacherDoc.id);
      toast({ title: "Selamat Datang", description: `Ust/Ustzh ${teacherDoc.data().name}` });
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
      
      let saverDoc: any = null;
      const saverRef = doc(firestore, "externalSavers", rawNip);
      const saverSnap = await getDoc(saverRef);

      if (saverSnap.exists()) {
        saverDoc = saverSnap;
      } else {
        const q = query(collection(firestore, "externalSavers"), where("nip", "==", rawNip));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) saverDoc = qSnap.docs[0];
      }

      if (!saverDoc || String(saverDoc.data().password) !== String(values.password)) {
        await signOut(auth);
        toast({ variant: "destructive", title: "Gagal Masuk", description: "NIP atau password salah." });
        return;
      }

      sessionStorage.setItem('externalNip', saverDoc.id);
      toast({ title: "Selamat Datang", description: saverDoc.data().name });
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
        <TabsList className="grid grid-cols-4 w-full h-11 bg-white/5 backdrop-blur-md rounded-2xl p-1 border border-white/10 mb-4">
          <TabsTrigger value="parent" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary text-white/50 text-[10px] font-bold uppercase transition-all"><UserCircle2 className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Wali</span></TabsTrigger>
          <TabsTrigger value="teacher" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary text-white/50 text-[10px] font-bold uppercase transition-all"><GraduationCap className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Guru</span></TabsTrigger>
          <TabsTrigger value="external" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary text-white/50 text-[10px] font-bold uppercase transition-all"><WalletCards className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Umum</span></TabsTrigger>
          <TabsTrigger value="admin" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary text-white/50 text-[10px] font-bold uppercase transition-all"><ShieldCheck className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Admin</span></TabsTrigger>
        </TabsList>

        <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden p-5 sm:p-7 border border-white/20">
          <TabsContent value="parent" className="mt-0 outline-none">
             <div className="mb-4">
               <h2 className="text-lg font-bold text-foreground tracking-tight">Masuk Wali Murid</h2>
               <p className="text-[10px] text-muted-foreground">Gunakan NIS atau NIK santri.</p>
             </div>
             <Form {...parentForm}>
               <form onSubmit={parentForm.handleSubmit(handleParentSubmit)} className="space-y-3.5">
                 <FormField control={parentForm.control} name="nis" render={({ field }) => (
                   <FormItem className="space-y-1">
                     <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Username (NIS/NIK)</FormLabel>
                     <div className="relative">
                       <User className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground/40" />
                       <FormControl><Input placeholder="NIS santri..." {...field} className="h-10 pl-10 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                     </div>
                     <FormMessage className="text-[10px]" />
                   </FormItem>
                 )} />
                 <FormField control={parentForm.control} name="password" render={({ field }) => (
                   <FormItem className="space-y-1">
                     <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Password</FormLabel>
                     <div className="relative">
                       <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground/40" />
                       <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-10 pl-10 pr-10 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-2.5 text-muted-foreground/40 hover:text-primary transition-colors">
                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </button>
                     </div>
                     <FormMessage className="text-[10px]" />
                   </FormItem>
                 )} />
                 <Button type="submit" className="w-full h-11 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-xs font-bold uppercase tracking-widest gap-2 shadow-lg shadow-teal-900/20" disabled={isParentLoading}>
                   {isParentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Masuk <ArrowRight className="h-3.5 w-3.5" /></>}
                 </Button>
               </form>
             </Form>
          </TabsContent>

          <TabsContent value="teacher" className="mt-0 outline-none">
             <div className="mb-4">
               <h2 className="text-lg font-bold text-foreground tracking-tight">Masuk Guru</h2>
               <p className="text-[10px] text-muted-foreground">Masukkan NIG Anda.</p>
             </div>
             <Form {...teacherForm}>
               <form onSubmit={teacherForm.handleSubmit(handleTeacherSubmit)} className="space-y-3.5">
                 <FormField control={teacherForm.control} name="nig" render={({ field }) => (
                   <FormItem className="space-y-1">
                     <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Nomor Induk Guru (NIG)</FormLabel>
                     <div className="relative">
                       <GraduationCap className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground/40" />
                       <FormControl><Input placeholder="NIG Anda..." {...field} className="h-10 pl-10 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                     </div>
                     <FormMessage className="text-[10px]" />
                   </FormItem>
                 )} />
                 <FormField control={teacherForm.control} name="password" render={({ field }) => (
                   <FormItem className="space-y-1">
                     <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Password</FormLabel>
                     <div className="relative">
                       <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground/40" />
                       <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-10 pl-10 pr-10 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-2.5 text-muted-foreground/40 hover:text-primary transition-colors">
                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </button>
                     </div>
                     <FormMessage className="text-[10px]" />
                   </FormItem>
                 )} />
                 <Button type="submit" className="w-full h-11 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-xs font-bold uppercase tracking-widest gap-2 shadow-lg shadow-teal-900/20" disabled={isTeacherLoading}>
                   {isTeacherLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Masuk <ArrowRight className="h-3.5 w-3.5" /></>}
                 </Button>
               </form>
             </Form>
          </TabsContent>

          <TabsContent value="external" className="mt-0 outline-none">
             <div className="mb-4">
               <h2 className="text-lg font-bold text-foreground tracking-tight">Penabung Umum</h2>
               <p className="text-[10px] text-muted-foreground">Masukkan NIP Penabung.</p>
             </div>
             <Form {...externalForm}>
               <form onSubmit={externalForm.handleSubmit(handleExternalSubmit)} className="space-y-3.5">
                 <FormField control={externalForm.control} name="nip" render={({ field }) => (
                   <FormItem className="space-y-1">
                     <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">ID Penabung (NIP)</FormLabel>
                     <div className="relative">
                       <WalletCards className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground/40" />
                       <FormControl><Input placeholder="NIP Anda..." {...field} className="h-10 pl-10 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                     </div>
                     <FormMessage className="text-[10px]" />
                   </FormItem>
                 )} />
                 <FormField control={externalForm.control} name="password" render={({ field }) => (
                   <FormItem className="space-y-1">
                     <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Password</FormLabel>
                     <div className="relative">
                       <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground/40" />
                       <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-10 pl-10 pr-10 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-2.5 text-muted-foreground/40 hover:text-primary transition-colors">
                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </button>
                     </div>
                     <FormMessage className="text-[10px]" />
                   </FormItem>
                 )} />
                 <Button type="submit" className="w-full h-11 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-xs font-bold uppercase tracking-widest gap-2 shadow-lg shadow-teal-900/20" disabled={isExternalLoading}>
                   {isExternalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Masuk <ArrowRight className="h-3.5 w-3.5" /></>}
                 </Button>
               </form>
             </Form>
          </TabsContent>

          <TabsContent value="admin" className="mt-0 outline-none">
             <div className="mb-4">
               <h2 className="text-lg font-bold text-foreground tracking-tight">Login Admin</h2>
               <p className="text-[10px] text-muted-foreground">Akses khusus staf resmi.</p>
             </div>
             <Form {...adminForm}>
               <form onSubmit={adminForm.handleSubmit(handleAdminSubmit)} className="space-y-3.5">
                 <FormField control={adminForm.control} name="email" render={({ field }) => (
                   <FormItem className="space-y-1">
                     <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Email Admin</FormLabel>
                     <div className="relative">
                       <Shield className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground/40" />
                       <FormControl><Input type="email" placeholder="admin@..." {...field} className="h-10 pl-10 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                     </div>
                     <FormMessage className="text-[10px]" />
                   </FormItem>
                 )} />
                 <FormField control={adminForm.control} name="password" render={({ field }) => (
                   <FormItem className="space-y-1">
                     <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Password</FormLabel>
                     <div className="relative">
                       <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground/40" />
                       <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-10 pl-10 pr-10 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20" /></FormControl>
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-2.5 text-muted-foreground/40 hover:text-primary transition-colors">
                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </button>
                     </div>
                     <FormMessage className="text-[10px]" />
                   </FormItem>
                 )} />
                 <Button type="submit" className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold uppercase tracking-widest gap-2 shadow-lg shadow-emerald-900/20" disabled={isAdminLoading}>
                   {isAdminLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Masuk <ArrowRight className="h-3.5 w-3.5" /></>}
                 </Button>
               </form>
             </Form>
          </TabsContent>
          
          <div className="mt-4 flex items-center justify-center gap-2 p-2 bg-muted/20 rounded-xl border border-dashed border-muted">
            <Lock className="h-3 w-3 text-muted-foreground/60" />
            <p className="text-[8px] text-muted-foreground font-medium uppercase tracking-tight">
              Sesi Anda dilindungi & terenkripsi.
            </p>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
