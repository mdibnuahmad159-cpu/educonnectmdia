import { ReactNode } from "react";
import { BottomNav } from "./components/bottom-nav";
import { BookOpenCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2 text-primary">
            <BookOpenCheck className="h-6 w-6" />
            <h1 className="text-lg font-semibold font-headline">EduConnect Admin</h1>
        </div>
      </header>
      <main className="flex-1 p-4 pb-20 sm:px-6">
          {children}
      </main>
      <BottomNav />
    </div>
  );
}
