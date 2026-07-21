import { useState, useEffect, useCallback } from "react";
import {
    Clock,
    Flame,
    ImageOff,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { getOpenPosts, getImageUrl, type FeedItemResponse } from "@/api/posts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeRemaining(lockAt: string): string {
    const diffMs = new Date(lockAt).getTime() - Date.now();
    if (diffMs < 0) return "Post Settled";
    if (diffMs == 0) return "Closing soon";
    const totalMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h remaining`;
    }
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
}

function getUrgencyClass(lockAt: string): string {
    const diffMs = new Date(lockAt).getTime() - Date.now();
    if (diffMs <= 0) return "text-red-400";
    if (diffMs < 4 * 60 * 60 * 1000) return "text-orange-400";
    if (diffMs < 12 * 60 * 60 * 1000) return "text-yellow-400";
    return "text-emerald-400";
}

function timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}



// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: FeedItemResponse }) {
    const [imgError, setImgError] = useState(false);
    const urgencyClass = getUrgencyClass(post.lockAt);

    return (
        <div className="flex flex-col gap-2 group">
            {/* ── Card ── */}
            <Link to={`/posts/${post.id}`} className="block">
                <article className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                    {/* ── Full-bleed background image ── */}
                    {!imgError ? (
                        <img
                            src={getImageUrl(post.imageKey)}
                            alt={post.title ?? "Post image"}
                            className="w-full h-auto object-cover max-h-[560px] transition-transform duration-500 group-hover:scale-[1.02]"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="flex h-72 items-center justify-center bg-white/5 text-white/20">
                            <ImageOff className="size-12" />
                        </div>
                    )}

                    {/* Gradient scrim — top */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* ── TOP: avatar + username + time-ago ── */}
                    <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
                        <Link
                            to={`/users/${post.posterUsername}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/60 to-pink-600/60 text-[11px] font-bold text-white uppercase">
                                {post.posterUsername.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold text-white leading-none">
                                {post.posterUsername}
                            </span>
                        </Link>
                        <span className="text-[11px] text-white/70">{timeAgo(post.createdAt)}</span>
                    </div>
                </article>
            </Link>

            {/* ── Below-image row: urgency (left) · tags (right) ── */}
            <div className="flex items-center justify-between px-1">
                <div className={`flex items-center gap-1.5 text-[11px] font-bold ${urgencyClass}`}>
                    <Clock className="size-3" />
                    <span>{getTimeRemaining(post.lockAt)}</span>
                </div>
                {post.tags.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                        {post.tags.slice(0, 3).map((tag) => (
                            <Link
                                key={tag}
                                to={`/tags/${tag}`}
                                className="text-[11px] font-medium text-orange-300/70 hover:text-orange-200 transition-colors"
                            >
                                #{tag}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="flex flex-col gap-2 animate-pulse">
            {/* card */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="h-72 bg-white/10" />
            </div>
            {/* below-image row */}
            <div className="flex items-center justify-between px-1">
                <div className="h-3 w-28 rounded-full bg-white/10" />
                <div className="h-3 w-20 rounded-full bg-white/10" />
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function HomePage() {
    const [posts, setPosts] = useState<FeedItemResponse[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFirst, setIsFirst] = useState(true);
    const [isLast, setIsLast] = useState(true);

    const fetchPosts = useCallback(async (p: number) => {
        setIsLoading(true);
        try {
            const data = await getOpenPosts(p, PAGE_SIZE);
            setPosts(data.content.filter((post) => !post.shadowBanned));
            setTotalPages(data.totalPages);
            setTotalElements(data.totalElements);
            setIsFirst(data.first);
            setIsLast(data.last);
        } catch {
            /* silent */
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts(page);
    }, [page, fetchPosts]);

    function goToPage(p: number) {
        setPage(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return (
        <div className="flex flex-col items-center w-full py-8 px-4">
            {/* Narrow feed column — matches Instagram ~470px */}
            <div className="w-full max-w-[600px] flex flex-col gap-1">
                {/* Page label */}
                <div className="flex items-center gap-2 mb-4 px-1">
                    <Flame className="size-4 text-orange-400" />
                    <span className="text-sm font-semibold text-white/70">
                        Open Posts
                    </span>
                    {!isLoading && (
                        <span className="text-xs text-white/30 ml-1">
                            · {totalElements} total
                        </span>
                    )}
                </div>

                {/* Feed */}
                <div className="flex flex-col gap-5">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                    ) : posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                                <Flame className="size-8 text-white/20" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-white/50">No open posts yet</p>
                                <p className="text-sm text-white/30 mt-1">
                                    Be the first — hit Create Post above!
                                </p>
                            </div>
                        </div>
                    ) : (
                        posts.map((post) => <PostCard key={post.id} post={post} />)
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(page - 1)}
                            disabled={isFirst || isLoading}
                            className="border-white/20 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
                            id="prev-page-btn"
                        >
                            <ChevronLeft className="size-4 mr-1" />
                            Previous
                        </Button>
                        <span className="text-xs text-white/30 tabular-nums">
                            {page + 1} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(page + 1)}
                            disabled={isLast || isLoading}
                            className="border-white/20 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
                            id="next-page-btn"
                        >
                            Next
                            <ChevronRight className="size-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
