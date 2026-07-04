import { useState, useEffect, useCallback } from "react";
import {
    Clock,
    User,
    Flame,
    ImageOff,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { getOpenPosts, getImageUrl, type FeedItemResponse } from "@/api/posts";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeRemaining(lockAt: string): string {
    const diffMs = new Date(lockAt).getTime() - Date.now();
    if (diffMs <= 0) return "Closing soon";
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
        <article className="flex flex-col border border-white/10 bg-white/[0.03] rounded-xl overflow-hidden">
            {/* ── Header row ── */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                    {/* Avatar placeholder */}
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/40 to-pink-600/40 border border-white/10 text-xs font-bold text-white uppercase">
                        {post.posterUsername.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-white">
                        {post.posterUsername}
                    </span>
                </div>
                <span className="text-xs text-white/30">{timeAgo(post.createdAt)}</span>
            </div>

            {/* ── Image ── */}
            <div className="relative bg-white/5 w-full">
                {!imgError ? (
                    <img
                        src={getImageUrl(post.imageKey)}
                        alt={post.title ?? "Post image"}
                        className="w-full object-cover max-h-[700px]"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="flex h-64 items-center justify-center text-white/20">
                        <ImageOff className="size-12" />
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="flex flex-col gap-2.5 px-4 py-3">
                {/* Time remaining */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${urgencyClass}`}>
                    <Clock className="size-3.5" />
                    {getTimeRemaining(post.lockAt)}
                </div>

                {/* Title */}
                {post.title && (
                    <p className="text-sm font-semibold text-white leading-snug">
                        {post.title}
                    </p>
                )}

                {/* Tags */}
                {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                            <span
                                key={tag}
                                className="text-xs text-primary/70 hover:text-primary transition-colors cursor-pointer"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden animate-pulse">
            {/* header */}
            <div className="flex items-center gap-2.5 px-4 py-3">
                <div className="size-8 rounded-full bg-white/10" />
                <div className="h-3 w-24 rounded-full bg-white/10" />
            </div>
            {/* image */}
            <div className="h-72 bg-white/10" />
            {/* footer */}
            <div className="flex flex-col gap-2 px-4 py-3">
                <div className="h-3 w-28 rounded-full bg-white/10" />
                <div className="h-3 w-40 rounded-full bg-white/10" />
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
