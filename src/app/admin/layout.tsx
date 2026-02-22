import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./components/admin-sidebar";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="md:hidden"/>
          <h1 className="text-xl font-semibold font-headline">Admin Dashboard</h1>
        </header>
        <main className="p-4 sm:px-6 sm:py-0">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
