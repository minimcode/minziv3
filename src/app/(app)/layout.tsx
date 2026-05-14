import { Sidebar } from "@/components/app/Sidebar";
import { BottomNav } from "@/components/app/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
