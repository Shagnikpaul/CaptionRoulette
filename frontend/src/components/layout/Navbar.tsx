import { useState, useEffect, useRef } from 'react';
import { User as UserIcon, UserPen, LogOut, LogIn, Flame, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CreatePostDrawer } from '../CreatePostDrawer';
import { NotificationsDrawer } from '../NotificationsDrawer';
import { SearchDialog } from '../SearchDialog';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { getImageUrl } from '../../api/posts';

export function AvatarDropdown() {
  const { user, logout, openEditProfile } = useAuth();
  const navigate = useNavigate();

  const avatarSrc = user?.profileImageKey
    ? user.profileImageKey.startsWith("http")
      ? user.profileImageKey
      : getImageUrl(user.profileImageKey)
    : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full size-9 p-0 hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-orange-500/50"
            id="avatar-dropdown-btn"
          >
            <Avatar className="size-9 border border-white/20">
              <AvatarImage src={avatarSrc} alt={user?.username || "Avatar"} />
              <AvatarFallback className="bg-orange-500/20 text-orange-400 font-bold text-xs uppercase">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : "CR"}
              </AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className="w-52 bg-black/95 border-white/10 text-white backdrop-blur-xl p-1.5 shadow-2xl" align="end">
        <DropdownMenuLabel className="font-normal border-b border-white/10 pb-2.5 mb-1.5 px-2.5">
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-semibold text-white leading-tight truncate">{user?.username}</p>
            <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer py-2 px-2.5 hover:bg-white/10 focus:bg-white/10"
            onClick={() => navigate(`/users/${user?.username}`)}
            id="menu-view-profile-btn"
          >
            <UserIcon className="mr-2.5 size-4 text-white/70" />
            <span>View Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer py-2 px-2.5 hover:bg-white/10 focus:bg-white/10"
            onClick={openEditProfile}
            id="menu-edit-profile-btn"
          >
            <UserPen className="mr-2.5 size-4 text-white/70" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer py-2 px-2.5 text-red-400 focus:bg-red-500/20 focus:text-red-300"
            onClick={logout}
            id="menu-logout-btn"
          >
            <LogOut className="mr-2.5 size-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { isAuthenticated } = useAuth();
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
      className={`sticky top-3 sm:top-4 z-50 px-2 sm:px-4 transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <nav className="mx-auto flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border border-white/10 bg-black/75 rounded-2xl backdrop-blur-md text-white max-w-5xl shadow-lg">
        {/* Left side: Logo */}
        <div className="flex items-center flex-1 min-w-0">
          <Link to="/" className="flex items-center shrink-0" title="Caption Roulette">
            <img src="/logo.png" alt="Caption Roulette" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          </Link>
        </div>

        {/* Center: Feed navigation icon buttons */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0">
            <NavLink
              to="/"
              end
              id="nav-open-feed-btn"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${isActive
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
                }`
              }
            >
              <Flame className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Open</span>
            </NavLink>

            <NavLink
              to="/settled"
              id="nav-settled-feed-btn"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${isActive
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
                }`
              }
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Settled</span>
            </NavLink>

            <SearchDialog />
          </div>

        {/* Right side: user actions */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-3 flex-1 min-w-0">
          {isAuthenticated ? (
            <>
              <CreatePostDrawer />
              <NotificationsDrawer />
              <AvatarDropdown />
            </>
          ) : (
            <Button asChild variant="outline" size="sm" className="border-white/20 hover:bg-white hover:text-black rounded-xl text-xs sm:text-sm">
              <Link to="/login" className="flex items-center gap-1.5">
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </Link>
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}
