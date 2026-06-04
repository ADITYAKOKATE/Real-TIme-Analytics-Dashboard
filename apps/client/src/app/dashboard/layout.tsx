import { SocketProvider } from '@/contexts/SocketContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { AlertToast } from '@/components/ui/AlertToast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <AlertToast />
    </SocketProvider>
  );
}
