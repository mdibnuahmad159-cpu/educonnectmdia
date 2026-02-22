import { ReactNode } from "react";
import { BottomNav } from "./components/bottom-nav";
import { BookOpenCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-12 items-center gap-4 border-b bg-background px-3 sm:px-4">
        <div className="flex items-center gap-2 text-primary">
            <BookOpenCheck className="h-5 w-5" />
            <h1 className="text-base font-semibold font-headline">EduConnect Admin</h1>
        </div>
      </header>
      <main className="flex-1 p-2 pb-16 sm:px-4">
          {children}
      </main>
      <BottomNav />
    </div>
  );
}
