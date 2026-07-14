import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Trophy, Check, Loader2, Inbox, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemTitle,
  ItemDescription,
  ItemGroup,
} from '@/components/ui/item';
import { getNotifications, markNotificationRead, type NotificationResponse } from '@/api/notifications';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function NotificationsDrawer() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications for the count badge
  const loadBadgeCount = async () => {
    try {
      const response = await getNotifications(0, 50);
      setUnreadCount(response.content.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Failed to load notifications count badge', err);
    }
  };

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await getNotifications(0, 50);
      setNotifications(response.content);
      setUnreadCount(response.content.filter((n) => !n.read).length);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBadgeCount();
    // Poll for notifications every 30 seconds
    const interval = setInterval(loadBadgeCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const handleNotificationClick = async (n: NotificationResponse) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
    setIsOpen(false);
    navigate(`/posts/${n.referencePostId}`);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Notification marked as read');
    } catch (err) {
      toast.error('Failed to mark notification as read');
    }
  };

  return (
    <Drawer direction="right" open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          id="notifications-trigger-btn"
          variant="ghost"
          size="icon"
          className="relative hover:bg-white/10 hover:text-white rounded-full text-white"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-black animate-pulse" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DrawerTrigger>

      <DrawerContent className="bg-black/90 border-l border-white/10 flex flex-col gap-0 overflow-hidden rounded-l-3xl h-full m-0 right-0 max-w-sm w-[350px]">
        {/* Header */}
        <DrawerHeader className="border-b border-white/10 pb-4">
          <DrawerTitle className="text-white flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </DrawerTitle>
          <DrawerDescription className="text-white/40 text-xs">
            View caption win updates and mark notifications as read.
          </DrawerDescription>
        </DrawerHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <span className="text-xs text-white/40">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <Empty className="border border-dashed border-white/5 bg-white/[0.01] h-64 rounded-2xl">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-white/5">
                  <Inbox className="size-4 text-white/40" />
                </EmptyMedia>
                <EmptyTitle className="text-white/60">No notifications</EmptyTitle>
                <EmptyDescription className="text-white/30 text-center">
                  You are all caught up! When one of your captions wins a post, it will show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup className="gap-2">
              {notifications.map((n) => (
                <Item
                  key={n.id}
                  variant={n.read ? 'default' : 'muted'}
                  className={`cursor-pointer hover:bg-white/[0.04] transition border border-white/5 mb-1 ${
                    n.read ? 'bg-transparent text-white/60' : 'bg-white/[0.02] text-white'
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <ItemMedia variant="icon" className="mt-1">
                      <Trophy
                        className={`size-4 ${n.read ? 'text-white/35' : 'text-yellow-400 animate-bounce'}`}
                      />
                    </ItemMedia>
                    <ItemContent className="flex flex-col min-w-0">
                      <ItemTitle
                        className={`text-xs ${
                          n.read ? 'text-white/60 font-medium' : 'text-white font-bold'
                        }`}
                      >
                        Your caption won!
                      </ItemTitle>
                      <ItemDescription className="text-[11px] text-white/40 truncate">
                        Click to view post comments and stats.
                      </ItemDescription>
                      <span className="text-[9px] text-white/30 block mt-1 tabular-nums">
                        {timeAgo(n.createdAt)}
                      </span>
                    </ItemContent>
                  </div>

                  {!n.read && (
                    <ItemActions className="ml-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-full hover:bg-white/10 hover:text-white"
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        title="Mark as read"
                      >
                        <Check className="size-3.5 text-white/70" />
                        <span className="sr-only">Mark as read</span>
                      </Button>
                    </ItemActions>
                  )}
                </Item>
              ))}
            </ItemGroup>
          )}
        </div>

        {/* Footer */}
        <DrawerFooter className="border-t border-white/10 pt-4 flex flex-col gap-2">
          <Button asChild className="w-full bg-white text-black hover:bg-white/90">
            <Link to="/notifications" onClick={() => setIsOpen(false)}>
              View All Notifications
              <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>

          <DrawerClose asChild>
            <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
