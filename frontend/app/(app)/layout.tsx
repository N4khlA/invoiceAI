import { Sidebar } from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}
