import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MiniFooter from '@/components/MiniFooter';
import ClientShell from './ClientShell';

export default function PerfilPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <ClientShell />
      </div>
      <MiniFooter />
    </div>
  );
}