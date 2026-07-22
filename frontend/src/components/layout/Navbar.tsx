import { useState, useEffect, useRef } from 'react';
import { User as UserIcon, LogOut, LogIn, Flame, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Link, NavLink } from 'react-router-dom';
import { CreatePostDrawer } from '../CreatePostDrawer';
import { NotificationsDrawer } from '../NotificationsDrawer';
import { SearchDialog } from '../SearchDialog';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current + 5) {
        // Scrolling down
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current - 5) {
        // Scrolling up
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`sticky top-4 z-50 px-4 transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <nav className="mx-auto flex items-center justify-between px-6 py-4 border border-white/10 bg-black/70 rounded-2xl backdrop-blur-md text-white">
        {/* Logo + Feed Nav */}
        <div className="flex w-full items-center gap-5">
          <Link to="/" className="flex items-center shrink-0" title="Caption Roulette">
            <img src="/logo.png" alt="Caption Roulette" className="w-8 h-8 object-contain" />
          </Link>

          {/* Feed navigation icon buttons */}
          <div className="flex items-center justify-center w-full gap-1">
            <NavLink
              to="/"
              end
              id="nav-open-feed-btn"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive
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
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
                }`
              }
            >
              <Trophy className="w-4 h-4" />
              <span>Settled</span>
            </NavLink>

            <SearchDialog />
          </div>
        </div>

        {/* Right side: user actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <CreatePostDrawer />
              <NotificationsDrawer />
              <Link
                to={`/users/${user?.username}`}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                id="nav-profile-link"
              >
                <UserIcon className="w-4 h-4" />
                <span>{user?.username}</span>
              </Link>

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
