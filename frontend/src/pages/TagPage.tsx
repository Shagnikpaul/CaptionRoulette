import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
    Hash,
    ImageOff,
    Clock,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
} from "lucide-react";
import { getTagPosts } from "@/api/search";
import { getImageUrl, type FeedItemResponse } from "@/api/posts";
import { Button } from "@/components/ui/button";

// ─── Helpers (copied from HomePage to avoid circular deps) ────────────────────

function getTimeRemaining(lockAt: string): string {
    const diffMs = new Date(lockAt).getTime() - Date.now();
    if (diffMs <= 0) return "Post Settled";
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

// ─── Post Card (same design as HomePage) ─────────────────────────────────────

function PostCard({ post }: { post: FeedItemResponse }) {
    const [imgError, setImgError] = useState(false);
    const urgencyClass = getUrgencyClass(post.lockAt);

    return (
        <Link to={`/posts/${post.id}`} className="block group">
            <article className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
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

                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

                {/* TOP row */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
                    <Link
                        to={`/users/${post.posterUsername}`}
                        className="flex items-center gap-2 rounded-full bg-black/25 backdrop-blur-md border border-white/15 pl-1 pr-3 py-1 pointer-events-auto hover:bg-black/40 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/60 to-pink-600/60 text-[10px] font-bold text-white uppercase">
                            {post.posterUsername.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-white leading-none">
                            {post.posterUsername}
                        </span>
                    </Link>
                    <div className="rounded-full bg-black/25 backdrop-blur-md border border-white/15 px-2.5 py-1">
                        <span className="text-[10px] font-medium text-white/60">{timeAgo(post.createdAt)}</span>
                    </div>
                </div>

                {/* BOTTOM row */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
                    <div className={`flex items-center gap-1.5 rounded-full bg-black/25 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] font-bold ${urgencyClass}`}>
                        <Clock className="size-3" />
                        <span>{getTimeRemaining(post.lockAt)}</span>
                    </div>
                    {post.tags.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1 pointer-events-auto">
                            {post.tags.slice(0, 3).map((tag) => (
                                <Link
                                    key={tag}
                                    to={`/tags/${tag}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded-full bg-black/25 backdrop-blur-md border border-white/15 px-2 py-0.5 text-[10px] font-medium text-orange-300/90 hover:bg-orange-500/20 hover:text-orange-200 transition-colors"
                                >
                                    #{tag}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </article>
        </Link>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden animate-pulse">
            <div className="h-72 bg-white/10" />
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                <div className="h-7 w-28 rounded-full bg-white/10" />
                <div className="h-6 w-14 rounded-full bg-white/10" />
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div className="h-6 w-32 rounded-full bg-white/10" />
                <div className="h-5 w-20 rounded-full bg-white/10" />
            </div>
        </div>
    );
}

// ─── Header Skeleton ──────────────────────────────────────────────────────────

function HeaderSkeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-3 mb-8">
            <div className="h-14 w-64 rounded-xl bg-white/10" />
            <div className="h-4 w-32 rounded bg-white/8" />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function TagPage() {
    const { tagName = "" } = useParams<{ tagName: string }>();

    const [posts, setPosts] = useState<FeedItemResponse[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFirst, setIsFirst] = useState(true);
    const [isLast, setIsLast] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const fetchPosts = useCallback(
        async (p: number) => {
            setIsLoading(true);
            setNotFound(false);
            try {
                const data = await getTagPosts(tagName, p, PAGE_SIZE);
                setPosts(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
                setIsFirst(data.first);
                setIsLast(data.last);
            } catch (err: unknown) {
                const status = (err as { response?: { status?: number } })?.response?.status;
                if (status === 404) setNotFound(true);
            } finally {
                setIsLoading(false);
            }
        },
        [tagName]
    );

    useEffect(() => {
        setPage(0);
    }, [tagName]);

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
                {/* ── Header ── */}
                {isLoading && page === 0 ? (
                    <HeaderSkeleton />
                ) : notFound ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                            <AlertCircle className="size-8 text-white/20" />
                        </div>
                        <div>
                            <p className="text-base font-semibold text-white/50">Tag not found</p>
                            <p className="text-sm text-white/30 mt-1">
                                No posts exist for <span className="text-orange-400">#{tagName}</span>
                            </p>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-white/60 hover:bg-white/10 hover:text-white mt-2"
                        >
                            <Link to="/">Back to feed</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Big hero header */}
                        <div className="mb-8">
                            <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent leading-tight">
                                #{tagName}
                            </h1>
                            {!isLoading && (
                                <p className="text-sm text-white/40 mt-2">
                                    {totalElements} {totalElements === 1 ? "post" : "posts"}
                                </p>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/8 mb-6" />

                        {/* Feed */}
                        <div className="flex flex-col gap-5">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                            ) : posts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                                    <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                                        <Hash className="size-8 text-white/20" />
                                    </div>
                                    <p className="text-base font-semibold text-white/50">No posts yet</p>
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
                                    id="tag-prev-page-btn"
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
                                    id="tag-next-page-btn"
                                >
                                    Next
                                    <ChevronRight className="size-4 ml-1" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
