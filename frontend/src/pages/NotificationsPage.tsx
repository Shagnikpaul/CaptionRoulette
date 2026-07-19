import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Trophy, Check, Loader2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { type PagedResponse } from '@/api/posts';

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
    year: 'numeric',
  });
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PagedResponse<NotificationResponse> | null>(null);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPage = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const response = await getNotifications(pageNum, 15);
      setData(response);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  const handleNotificationClick = async (n: NotificationResponse) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
    navigate(`/posts/${n.referencePostId}`);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          content: prev.content.map((n) => (n.id === id ? { ...n, read: true } : n)),
        };
      });
      toast.success('Notification marked as read');
    } catch (err) {
      toast.error('Failed to mark notification as read');
    }
  };

  return (
    <div className="flex-1 w-full bg-black text-white px-6 py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col gap-1.5 border-b border-white/10 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Bell className="size-6 text-orange-500" />
            <span>Notification Centre</span>
          </h1>
          <p className="text-sm text-white/50">
            Keep track of winning captions, feedback and announcements.
          </p>
        </div>

        {/* Content */}
        {isLoading && !data ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="text-sm text-white/40">Loading your notifications...</span>
          </div>
        ) : !data || data.content.length === 0 ? (
          <Card className="bg-white/[0.01] border-white/5 p-8 rounded-2xl">
            <Empty className="border-0 bg-transparent h-48">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-white/5">
                  <Inbox className="size-5 text-white/40" />
                </EmptyMedia>
                <EmptyTitle className="text-white/70">No Notifications Yet</EmptyTitle>
                <EmptyDescription className="text-white/30 text-center max-w-sm">
                  We'll let you know when one of your captions is selected as a winner! Keep submitting captions on open posts.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            <Card className="bg-white/[0.01] border-white/5 rounded-2xl overflow-hidden p-2">
              <CardContent className="p-2">
                <ItemGroup className="gap-2.5">
                  {data.content.map((n) => (
                    <Item
                      key={n.id}
                      variant={n.read ? 'default' : 'muted'}
                      className={`cursor-pointer hover:bg-white/[0.04] transition border border-white/5 p-4 rounded-xl flex items-center justify-between ${
                        n.read ? 'bg-transparent text-white/60' : 'bg-white/[0.02] text-white'
                      }`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <ItemMedia variant="icon" className="mt-1 shrink-0">
                          <Trophy
                            className={`size-5 ${n.read ? 'text-white/30' : 'text-yellow-400 animate-pulse'}`}
                          />
                        </ItemMedia>
                        <ItemContent className="flex flex-col min-w-0 font-sans">
                          <ItemTitle
                            className={`text-sm ${
                              n.read ? 'text-white/70 font-medium' : 'text-white font-bold'
                            }`}
                          >
                            Your caption won!
                          </ItemTitle>
                          <ItemDescription className="text-xs text-white/40 mt-0.5">
                            Congratulations! Your caption submission was chosen as the winner for this post. Click here to see the post details.
                          </ItemDescription>
                          <span className="text-[10px] text-white/30 block mt-2 font-medium tabular-nums">
                            {timeAgo(n.createdAt)}
                          </span>
                        </ItemContent>
                      </div>

                      {!n.read && (
                        <ItemActions className="ml-4 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full hover:bg-white/10 hover:text-white"
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            title="Mark as read"
                          >
                            <Check className="size-4 text-white/70" />
                            <span className="sr-only">Mark as read</span>
                          </Button>
                        </ItemActions>
                      )}
                    </Item>
                  ))}
                </ItemGroup>
              </CardContent>
            </Card>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  disabled={data.first || isLoading}
                  className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-35"
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-white/45 tabular-nums">
                  Page {page + 1} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(data.totalPages - 1, prev + 1))}
                  disabled={data.last || isLoading}
                  className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-35"
                >
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
