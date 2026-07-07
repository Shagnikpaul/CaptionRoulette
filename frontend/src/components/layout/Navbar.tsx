import { Aperture, User as UserIcon, LogOut, LogIn, Flame, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Link, NavLink } from 'react-router-dom';
import { CreatePostDrawer } from '../CreatePostDrawer';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className='sticky top-4 z-50 px-4'>

    
    <nav className="mx-auto flex items-center justify-between px-6 py-4 border border-white/10 bg-black/70 rounded-2xl backdrop-blur-md text-white">
      {/* Logo + Feed Nav */}
      <div className="flex w-full items-center gap-5">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Aperture className="w-6 h-6" />
          <span className="font-bold text-lg tracking-tight font-['Bricolage_Grotesque']">
            Caption Roulette
          </span>
        </Link>

        {/* Feed navigation icon buttons */}
        <div className="flex items-center justify-center w-full gap-1">
          <NavLink
            to="/"
            end
            id="nav-open-feed-btn"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
              }`
            }
          >
            <Flame className="w-4 h-4" />
            <span>Open</span>
          </NavLink>

          <NavLink
            to="/settled"
            id="nav-settled-feed-btn"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
              }`
            }
          >
            <Trophy className="w-4 h-4" />
            <span>Settled</span>
          </NavLink>
        </div>
      </div>

      {/* Right side: user actions */}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <UserIcon className="w-4 h-4" />
              <span>{user?.username}</span>
            </div>
            <CreatePostDrawer />
            <Button
              variant="destructive"
              size="icon"
              onClick={logout}
              className="hover:bg-white/10 hover:text-white rounded-full"
              id="logout-btn"
            >
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
    </div>
  );
}
