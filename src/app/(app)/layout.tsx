import { Sidebar } from "@/components/app/Sidebar";
import { BottomNav } from "@/components/app/BottomNav";
import { ProgressSync } from "@/components/app/ProgressSync";
import { PageTransition } from "@/components/app/PageTransition";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 pt-safe pb-20 lg:pt-0 lg:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
      <ProgressSync />
    </div>
  );
}
