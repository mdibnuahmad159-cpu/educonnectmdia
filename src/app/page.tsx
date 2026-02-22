import { LoginForm } from "@/components/auth/login-form";
import { BookOpenCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="p-3 bg-primary rounded-full mb-4">
             <BookOpenCheck className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-headline font-bold text-primary">EduConnect</h1>
          <p className="text-muted-foreground mt-2">Sistem Informasi Sekolah Terpadu</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
