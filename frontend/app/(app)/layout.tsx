import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/layout/AuthGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-dvh bg-background lg:flex">
        <Sidebar />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
