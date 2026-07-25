import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { EditProfileModal } from '../auth/EditProfileModal';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-['Geist']">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <EditProfileModal />
    </div>
  );
}
