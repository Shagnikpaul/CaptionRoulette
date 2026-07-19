import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Flame, ImageOff, Loader2, Aperture } from 'lucide-react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { getOpenPosts, getSettledPosts, getImageUrl, type FeedItemResponse } from '@/api/posts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Single slide ─────────────────────────────────────────────────────────────

function PostSlide({ post }: { post: FeedItemResponse }) {
  const [imgError, setImgError] = useState(false);
  const isSettled = post.status === 'SETTLED';

  return (
    <Link
      to={`/posts/${post.id}`}
      className="relative block w-full h-full overflow-hidden group"
      tabIndex={-1}
    >
      {/* Full-bleed image */}
      {!imgError ? (
        <img
          src={getImageUrl(post.imageKey)}
          alt={post.title ?? 'Community post'}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
          <ImageOff className="size-12 text-white/20" />
        </div>
      )}

      {/* Gradient: dark at top & bottom, transparent in middle */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 p-5 flex items-start justify-between">
        {/* Branding pill */}
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
          <Aperture className="size-3 text-orange-400" />
          <span className="text-[10px] font-bold text-white/70 tracking-wide">Caption Roulette</span>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm border ${
            isSettled
              ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
          }`}
        >
          {isSettled ? <Trophy className="size-2.5" /> : <Flame className="size-2.5" />}
          {isSettled ? 'Settled' : 'Open'}
        </span>
      </div>

      {/* ── Bottom info ── */}
      <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col gap-2.5">
        {/* Winning caption card */}
        {isSettled && post.winningCaptionText && (
          <div className="rounded-xl border border-yellow-500/25 bg-black/60 backdrop-blur-sm px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="size-3 text-yellow-400 shrink-0" />
              <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest">
                Winning Caption
              </span>
            </div>
            <p className="text-sm text-white/90 italic leading-snug line-clamp-2 font-medium">
              "{post.winningCaptionText}"
            </p>
            {post.winningCaptionAuthor && (
              <p className="text-[10px] text-yellow-400/70 mt-1">
                — @{post.winningCaptionAuthor}
              </p>
            )}
          </div>
        )}

        {/* Poster row */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-600 text-sm font-bold text-white uppercase shadow-lg">
            {post.posterUsername.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white leading-tight">
              @{post.posterUsername}
            </span>
            {post.title && (
              <span className="text-xs text-white/55 leading-tight line-clamp-1">{post.title}</span>
            )}
          </div>
          <span className="text-[10px] text-white/35 ml-auto shrink-0">{timeAgo(post.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommunityCarousel() {
  const [posts, setPosts] = useState<FeedItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const autoplay = useRef(Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }));

  useEffect(() => {
    let cancelled = false;

    async function fetchPosts() {
      try {
        const [openRes, settledRes] = await Promise.allSettled([
          getOpenPosts(0, 5),
          getSettledPosts(0, 5),
        ]);
        if (cancelled) return;

        const open    = openRes.status    === 'fulfilled' ? openRes.value.content    : [];
        const settled = settledRes.status === 'fulfilled' ? settledRes.value.content : [];

        const merged = [...settled, ...open]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);

        setPosts(merged);
      } catch {
        // decorative — fail silently
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchPosts();
    return () => { cancelled = true; };
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/30">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-xs font-medium">Loading community posts…</p>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────────
  if (posts.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <Aperture className="size-16 text-white/10" />
        <div className="text-center">
          <p className="text-sm font-semibold text-white/40">No posts yet</p>
          <p className="text-xs text-white/25 mt-1">Be the first to share something!</p>
        </div>
      </div>
    );
  }

  // ── Carousel — full-bleed, fills the entire panel ────────────────────────────
  return (
    <div
      className="w-full h-full relative [&_[data-slot='carousel-content']]:h-full [&_[data-slot='carousel-item']]:h-full"
    >
      <Carousel
        opts={{ loop: true, align: 'center' }}
        plugins={[autoplay.current]}
        className="w-full h-full"
      >
        {/* h-full must flow through every wrapper Embla renders */}
        <CarouselContent className="ml-0 h-full [&>*]:h-full">
          {posts.map((post) => (
            <CarouselItem key={post.id} className="pl-0 h-full">
              <PostSlide post={post} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Prev / Next — float inside the panel */}
        <CarouselPrevious
          className="left-4 border-white/15 bg-black/50 hover:bg-white/15 text-white hover:text-white backdrop-blur-sm"
        />
        <CarouselNext
          className="right-4 border-white/15 bg-black/50 hover:bg-white/15 text-white hover:text-white backdrop-blur-sm"
        />
      </Carousel>

      {/* Slide dot indicators */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none z-20">
        {posts.map((_, i) => (
          <span key={i} className="block size-1.5 rounded-full bg-white/30" />
        ))}
      </div>
    </div>
  );
}
