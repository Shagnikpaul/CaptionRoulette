import { useState, useEffect, useCallback } from "react";
import {
    Trophy,
    ImageOff,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { getSettledPosts, getImageUrl, type FeedItemResponse } from "@/api/posts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
    if (!iso) return "—";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatSettlementDate(iso: string | null): string {
    if (!iso) return "—";
    const date = new Date(iso);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    
    // Ordinal suffix
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    
    return `${day}${suffix} ${month}`;
}

// ─── Settled Card ─────────────────────────────────────────────────────────────

function SettledCard({ post }: { post: FeedItemResponse }) {
    const [imgError, setImgError] = useState(false);

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

                    {/* ── TOP: avatar + username + settled date ── */}
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
                        <div className="flex items-center gap-1 text-[11px] text-yellow-300/90">
                            <Trophy className="size-3" />
                            <span>Settled {formatSettlementDate(post.settledAt)}</span>
                        </div>
                    </div>
                </article>
            </Link>

            {/* ── Below-image: winning caption (left) · tags (right) ── */}
            <div className="flex items-start justify-between gap-3 px-1">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                        <Trophy className="size-2.5" />
                        Won by @{post.winningCaptionAuthor || "unknown"}
                    </span>
                    <p className="text-[12px] text-white/70 italic leading-snug line-clamp-2">
                        "{post.winningCaptionText || "No caption text"}"
                    </p>
                </div>
                {post.tags.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1.5 shrink-0 pt-0.5">
                        {post.tags.slice(0, 3).map((tag) => (
                            <Link
                                key={tag}
                                to={`/tags/${tag}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-medium text-yellow-300/60 hover:text-yellow-200 transition-colors"
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
            {/* below-image */}
            <div className="flex items-start justify-between gap-3 px-1">
                <div className="flex flex-col gap-1.5">
                    <div className="h-2.5 w-28 rounded-full bg-white/10" />
                    <div className="h-3 w-48 rounded-full bg-white/10" />
                </div>
                <div className="h-3 w-16 rounded-full bg-white/10" />
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function SettledPage() {
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
            const data = await getSettledPosts(p, PAGE_SIZE);
            setPosts(data.content);
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
            <div className="w-full max-w-[600px] flex flex-col gap-1">
                {/* Page label */}
                <div className="flex items-center gap-2 mb-4 px-1">
                    <Trophy className="size-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-white/70">
                        Settled Posts
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
                                <Trophy className="size-8 text-white/20" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-white/50">No settled posts yet</p>
                                <p className="text-sm text-white/30 mt-1">
                                    Posts move here once caption voting ends.
                                </p>
                            </div>
                        </div>
                    ) : (
                        posts.map((post) => <SettledCard key={post.id} post={post} />)
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
                            id="settled-prev-page-btn"
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
                            id="settled-next-page-btn"
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
