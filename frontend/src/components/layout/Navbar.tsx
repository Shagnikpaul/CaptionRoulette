import { Aperture, User as UserIcon, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black text-white">
      <div className="flex items-center gap-2">
        <Aperture className="w-6 h-6" />
        <span className="font-bold text-lg tracking-tight font-['Bricolage_Grotesque']">Caption Roulette</span>
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <UserIcon className="w-4 h-4" />
              <span>{user?.username}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="hover:bg-white/10 hover:text-white rounded-full">
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </>
        ) : (
          <Button asChild variant="outline" className="border-white/20 hover:bg-white hover:text-black">
            <Link to="/login" className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Log In
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
