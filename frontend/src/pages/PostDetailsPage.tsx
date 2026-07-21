import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
    getPostById,
    getImageUrl,
    getCaptions,
    submitCaption,
    voteOnCaption,
    selectWinner,
    deletePost,
    deleteCaption,
    type PostResponse,
    type CaptionResponse,
    type PagedResponse
} from '@/api/posts';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { parseApiError } from '@/api/errors';
import {
    Clock,
    Flame,
    Trophy,
    ChevronLeft,
    ChevronRight,
    ImageOff,
    MessageSquareQuote,
    Loader2,
    Send,
    User,
    ThumbsUp,
    ThumbsDown,
    Trash2,
    Flag,
    ShieldAlert,
    EyeOff
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ReportDialog } from '@/components/ReportDialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeRemaining(lockAt: string): string {
    const diffMs = new Date(lockAt).getTime() - Date.now();
    if (diffMs < 0) return 'Post Settled';
    if (diffMs === 0) return 'Closing soon';
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
    if (diffMs <= 0) return 'text-red-400';
    if (diffMs < 4 * 60 * 60 * 1000) return 'text-orange-400';
    if (diffMs < 12 * 60 * 60 * 1000) return 'text-yellow-400';
    return 'text-emerald-400';
}

function timeAgo(iso: string | null): string {
    if (!iso) return '—';
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
        year: 'numeric'
    });
}

function formatSettlementDate(iso: string | null): string {
    if (!iso) return '—';
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

function PostDetailsPage() {
    const { postId } = useParams<{ postId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    // State management
    const [post, setPost] = useState<PostResponse | null>(null);
    const [isLoadingPost, setIsLoadingPost] = useState(true);
    const [imgError, setImgError] = useState(false);

    const [captionsData, setCaptionsData] = useState<PagedResponse<CaptionResponse> | null>(null);
    const [captionsPage, setCaptionsPage] = useState(0);
    const [captionsSort, setCaptionsSort] = useState<'top' | 'new' | 'old'>('new');
    const [isLoadingCaptions, setIsLoadingCaptions] = useState(false);
    const [userHasSubmitted, setUserHasSubmitted] = useState(false);

    const [captionText, setCaptionText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Track in-flight vote requests to prevent race conditions
    const [votingCaptionIds, setVotingCaptionIds] = useState<Set<string>>(new Set());

    // Track in-flight winner selection requests
    const [isSelectingWinner, setIsSelectingWinner] = useState<string | null>(null);

    // Deletion states
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeletingPost, setIsDeletingPost] = useState(false);
    const [captionToDelete, setCaptionToDelete] = useState<CaptionResponse | null>(null);
    const [isDeletingCaption, setIsDeletingCaption] = useState(false);

    // Reporting states
    const [isReportPostOpen, setIsReportPostOpen] = useState(false);
    const [captionToReport, setCaptionToReport] = useState<CaptionResponse | null>(null);

    // Fetch handlers
    const fetchPost = useCallback(async (id: string) => {
        setIsLoadingPost(true);
        try {
            const data = await getPostById(id);
            setPost(data);
        } catch (err) {
            const parsed = parseApiError(err);
            toast.error('Failed to load post details', {
                description: parsed.message
            });
        } finally {
            setIsLoadingPost(false);
        }
    }, []);

    const fetchCaptions = useCallback(async (id: string, sort: string, page: number) => {
        setIsLoadingCaptions(true);
        try {
            const data = await getCaptions(id, sort, page, 20);
            setCaptionsData(data);

            // Dynamically check if the user has a caption in this page's list
            if (user?.username && data.content.some(c => c.authorUsername === user.username)) {
                setUserHasSubmitted(true);
            }
        } catch (err) {
            const parsed = parseApiError(err);
            toast.error('Failed to load captions', {
                description: parsed.message
            });
        } finally {
            setIsLoadingCaptions(false);
        }
    }, [user?.username]);

    // Initial triggers
    useEffect(() => {
        if (postId) {
            fetchPost(postId);
        }
    }, [postId, fetchPost]);

    useEffect(() => {
        if (postId) {
            fetchCaptions(postId, captionsSort, captionsPage);
        }
    }, [postId, captionsSort, captionsPage, fetchCaptions]);

    // Reset page states when navigation happens
    useEffect(() => {
        setUserHasSubmitted(false);
        setCaptionText('');
        setCaptionsPage(0);
        setCaptionsSort('new');
        setImgError(false);
    }, [postId]);

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!postId) return;

        const trimmed = captionText.trim();
        if (!trimmed) {
            toast.error('Caption cannot be empty');
            return;
        }

        if (trimmed.length > 280) {
            toast.error('Caption text must be at most 280 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            await submitCaption(postId, { text: trimmed });
            toast.success('Caption submitted successfully!');
            setCaptionText('');
            setUserHasSubmitted(true);
            
            // Refresh captions list from the top
            setCaptionsPage(0);
            setCaptionsSort('new');
            fetchCaptions(postId, 'new', 0);
        } catch (err) {
            const parsed = parseApiError(err);
            toast.error('Failed to submit caption', {
                description: parsed.message
            });
            if (parsed.message.toLowerCase().includes('already submitted')) {
                setUserHasSubmitted(true);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Vote handler with optimistic update + rollback ────────────────────────
    const handleVote = async (caption: CaptionResponse, value: 1 | -1 | 0) => {
        if (!captionsData) return;
        if (votingCaptionIds.has(caption.id)) return;

        // Snapshot for rollback
        const previousContent = captionsData.content;

        // Compute optimistic state
        const prevVote = caption.myVote;
        const prevScore = caption.score;

        let newMyVote: 1 | -1 | null;
        let scoreDelta = 0;

        if (value === 0) {
            // Explicit remove
            newMyVote = null;
            scoreDelta = prevVote ? -prevVote : 0;
        } else if (prevVote === value) {
            // Clicking same button → toggle off
            newMyVote = null;
            scoreDelta = -value;
            value = 0; // send 0 to API
        } else {
            // New vote or switching direction
            newMyVote = value;
            scoreDelta = prevVote ? value - prevVote : value;
        }

        // Apply optimistic update
        setCaptionsData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                content: prev.content.map(c =>
                    c.id === caption.id
                        ? { ...c, score: prevScore + scoreDelta, myVote: newMyVote }
                        : c
                )
            };
        });

        setVotingCaptionIds(prev => new Set(prev).add(caption.id));

        try {
            const result = await voteOnCaption(caption.id, { value });
            // Sync with server truth
            setCaptionsData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    content: prev.content.map(c =>
                        c.id === caption.id
                            ? { ...c, score: result.netScore, myVote: result.myVote }
                            : c
                    )
                };
            });
        } catch (err) {
            // Rollback on failure
            setCaptionsData(prev => {
                if (!prev) return prev;
                return { ...prev, content: previousContent };
            });
            const parsed = parseApiError(err);
            toast.error('Failed to submit vote', { description: parsed.message });
        } finally {
            setVotingCaptionIds(prev => {
                const next = new Set(prev);
                next.delete(caption.id);
                return next;
            });
        }
    };

    const handleSelectWinner = async (captionId: string) => {
        if (!postId) return;
        setIsSelectingWinner(captionId);
        try {
            const updatedPost = await selectWinner(postId, captionId);
            setPost(updatedPost);
            toast.success('Winner selected successfully!');
            // Refresh captions list to reflect updated states (like isWinner)
            fetchCaptions(postId, captionsSort, captionsPage);
        } catch (err) {
            const parsed = parseApiError(err);
            toast.error('Failed to select winner', {
                description: parsed.message
            });
        } finally {
            setIsSelectingWinner(null);
        }
    };

    const handleDeletePost = async () => {
        if (!postId) return;
        setIsDeletingPost(true);
        try {
            await deletePost(postId);
            toast.success('Post deleted successfully');
            setIsDeleteDialogOpen(false);
            navigate('/');
        } catch (err) {
            const parsed = parseApiError(err);
            toast.error('Failed to delete post', {
                description: parsed.message
            });
        } finally {
            setIsDeletingPost(false);
        }
    };

    const handleDeleteCaption = async () => {
        if (!captionToDelete || !postId) return;
        setIsDeletingCaption(true);
        try {
            await deleteCaption(captionToDelete.id);
            toast.success('Caption deleted successfully');
            setCaptionToDelete(null);
            fetchCaptions(postId, captionsSort, captionsPage);
        } catch (err: any) {
            const parsed = parseApiError(err);
            if (err.response?.status === 409) {
                toast.error('Post is no longer OPEN. You can no longer delete this caption; the post has closed.');
            } else {
                toast.error('Failed to delete caption', {
                    description: parsed.message
                });
            }
        } finally {
            setIsDeletingCaption(false);
        }
    };

    // Auto-refresh when voting deadline is reached to trigger backend lazy settlement
    useEffect(() => {
        if (!post || post.status !== 'OPEN' || !postId) return;

        const lockTime = new Date(post.lockAt).getTime();
        const diffMs = lockTime - Date.now();

        if (diffMs <= 0) {
            // Already past lockAt, fetch to trigger settlement
            fetchPost(postId);
            return;
        }

        const timer = setTimeout(() => {
            fetchPost(postId);
        }, diffMs + 1000); // 1-second buffer after lockAt

        return () => clearTimeout(timer);
    }, [post?.id, post?.status, post?.lockAt, postId, fetchPost]);

    if (isLoadingPost) {
        return (
            <div className="flex-1 flex items-center justify-center py-24 bg-black text-white">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-24 bg-black text-white px-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-4">
                    <ImageOff className="size-8 text-white/35" />
                </div>
                <p className="text-lg font-semibold text-white/70">Post not found</p>
                <p className="text-sm text-white/40 mt-1">The post you are trying to view does not exist or has been deleted.</p>
                <Button asChild className="mt-6 border-white/20 hover:bg-white hover:text-black">
                    <Link to="/">Go Back Home</Link>
                </Button>
            </div>
        );
    }

    // Rules verification
    const isPoster = post.posterId === user?.id || post.posterUsername === user?.username;

    // Shadow banned posts are hidden from public (only visible to poster)
    if (post.shadowBanned && !isPoster) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-24 bg-black text-white px-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-4">
                    <ImageOff className="size-8 text-white/35" />
                </div>
                <p className="text-lg font-semibold text-white/70">Post unavailable</p>
                <p className="text-sm text-white/40 mt-1">This post is not available or has restricted access.</p>
                <Button asChild className="mt-6 border-white/20 hover:bg-white hover:text-black">
                    <Link to="/">Go Back Home</Link>
                </Button>
            </div>
        );
    }

    const isSettled = post.status === 'SETTLED';
    const shouldDisableForm = isPoster || isSettled || userHasSubmitted;
    const urgencyClass = getUrgencyClass(post.lockAt);

    // A caption cannot be voted on if:
    // - user is not logged in
    // - post is settled
    // - user is the caption's author
    const canVoteOnCaption = (caption: CaptionResponse): boolean => {
        if (!user) return false;
        if (isSettled) return false;
        if (caption.authorUsername === user.username) return false;
        return true;
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-black text-white">
            {/* Breadcrumb nav */}
            <div className="w-full max-w-6xl mx-auto px-6 pt-6">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white font-semibold transition-colors"
                >
                    <ChevronLeft className="size-4" />
                    Back to Feed
                </Link>
            </div>

            {/* ── Flagged / Moderation Banner ── */}
            {(post.aiModerationStatus === 'FLAGGED' || post.aiFlagReason) && (
                <div className="w-full max-w-6xl mx-auto px-6 pt-4">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3.5 backdrop-blur-sm shadow-lg">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <ShieldAlert className="size-5" />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-amber-200 leading-none">
                                    Post Under Moderation
                                </h3>
                                <span className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                                    Flagged Content
                                </span>
                            </div>
                            <p className="text-xs text-amber-200/80 leading-relaxed mt-0.5">
                                This post was flagged by automated AI moderation as potentially offensive or inappropriate and is currently under review.
                            </p>
                            {post.aiFlagReason && (
                                <div className="mt-1.5 rounded-lg bg-black/40 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-300 font-mono">
                                    <span className="font-semibold text-amber-400">Reason:</span> {post.aiFlagReason}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Shadow-Ban Banner (visible to original poster only) ── */}
            {post.shadowBanned && isPoster && (
                <div className="w-full max-w-6xl mx-auto px-6 pt-3">
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3.5 backdrop-blur-sm shadow-lg">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                            <EyeOff className="size-5" />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-red-200 leading-none">
                                    Post Shadow-Banned
                                </h3>
                                <span className="inline-flex items-center rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300 uppercase tracking-wider">
                                    Hidden from Public
                                </span>
                            </div>
                            <p className="text-xs text-red-200/80 leading-relaxed mt-0.5">
                                This post is shadow-banned. It is hidden from all public feeds and tag search results. It remains visible only to you on your account profile page and via this direct link.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Layout wrapper */}
            <main className="w-full max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* ── Left Column: Image + Below-image Metadata ── */}
                <section className="lg:col-span-7 flex flex-col gap-3">
                    {/* Image */}
                    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center overflow-hidden select-none relative group">
                        {!imgError ? (
                            <img
                                src={getImageUrl(post.imageKey)}
                                alt={post.title ?? 'Post image'}
                                className="w-full h-auto max-h-[75vh] object-contain rounded-2xl"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="flex h-96 w-full items-center justify-center text-white/20">
                                <ImageOff className="size-16" />
                            </div>
                        )}
                        {!isPoster && (
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button
                                    id="report-post-hover-btn"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsReportPostOpen(true)}
                                    className="bg-black/60 hover:bg-red-600 hover:text-white border border-white/10 rounded-xl flex items-center gap-1.5 backdrop-blur-sm text-white text-xs py-1 px-3"
                                    title="Report post"
                                >
                                    <Flag className="size-3.5" />
                                    <span>Report Post</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ── Below-image metadata ── */}
                    <div className="flex flex-col gap-2 px-1">
                        {/* Title */}
                        {post.title && (
                            <h2 className="text-base font-bold text-white leading-snug">
                                {post.title}
                            </h2>
                        )}

                        {/* Row: avatar + poster (left) · status + time (right) */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            {/* Poster avatar link */}
                            <Link
                                to={`/users/${post.posterUsername}`}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                            >
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/60 to-pink-600/60 text-[11px] font-bold text-white uppercase">
                                    {post.posterUsername.charAt(0)}
                                </div>
                                <span className="text-sm font-semibold text-white/90 leading-none">
                                    {post.posterUsername}
                                </span>
                            </Link>

                            {/* Status + urgency/settled */}
                            <div className="flex items-center gap-2">
                                {isSettled ? (
                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-yellow-400">
                                        <Trophy className="size-3" />
                                        <span>Settled {formatSettlementDate(post.settledAt)}</span>
                                    </div>
                                ) : (
                                    <div className={`flex items-center gap-1 text-[11px] font-semibold ${urgencyClass}`}>
                                        <Clock className="size-3" />
                                        <span>{getTimeRemaining(post.lockAt)}</span>
                                    </div>
                                )}
                                <span className="text-white/20">·</span>
                                <div className={`flex items-center gap-1 text-[11px] font-bold ${isSettled ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                    {isSettled ? <Trophy className="size-3" /> : <Flame className="size-3" />}
                                    <span>{isSettled ? 'Settled' : 'Open'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map((tag) => (
                                    <Link
                                        key={tag}
                                        to={`/tags/${tag}`}
                                        className="text-[11px] font-bold text-orange-400/80 hover:text-orange-300 transition-colors"
                                    >
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Right Column: Caption Submission & Scrollable List ── */}
                <section className="lg:col-span-5 flex flex-col gap-6">
                    <div className="border border-white/10 bg-white/[0.02] rounded-2xl p-6 flex flex-col gap-6 shadow-2xl backdrop-blur-sm">
                        
                        {/* Title block */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-tight">Post Captions</h2>
                                <p className="text-xs text-white/50 mt-1">Submit your creative lines or vote for your favorites.</p>
                            </div>
                            {isPoster && (
                                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            id="delete-post-trigger-btn"
                                            variant="ghost"
                                            size="icon"
                                            className="text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-full h-8 w-8 shrink-0 ml-4"
                                            title="Delete post"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-black/90 border border-white/10 text-white rounded-2xl p-6">
                                        <DialogHeader>
                                            <DialogTitle className="text-white font-bold">Delete Post</DialogTitle>
                                            <DialogDescription className="text-white/60">
                                                Are you sure you want to delete this post? This action is permanent and cannot be undone. All captions, votes, and reports associated with this post will also be deleted.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter className="flex justify-end gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsDeleteDialogOpen(false)}
                                                disabled={isDeletingPost}
                                                className="border-white/10 text-white hover:bg-white/5"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleDeletePost}
                                                disabled={isDeletingPost}
                                                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                                            >
                                                {isDeletingPost ? (
                                                    <>
                                                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    'Delete Post'
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>

                        {/* Winner Announcement Section for Settled Posts */}
                        {isSettled && (
                            <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 p-4 flex flex-col gap-3 shadow-[0_0_15px_rgba(234,179,8,0.05)]">
                                <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xs uppercase tracking-wider">
                                    <Trophy className="size-4 text-yellow-400 animate-pulse" />
                                    <span>Winner Crowned</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm font-medium text-white/95 italic leading-relaxed">
                                        "{post.winningCaptionText || "No caption text"}"
                                    </p>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-yellow-500/10 text-[10px] text-white/50">
                                        <span>
                                            Winner: <span className="font-semibold text-yellow-400">@{post.winningCaptionAuthor || "unknown"}</span>
                                        </span>
                                        <span>
                                            Settled: <span className="font-semibold text-white/70">{formatSettlementDate(post.settledAt)}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Submission form block */}
                        {shouldDisableForm ? (
                            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 flex items-start gap-3 text-white/50 text-xs leading-relaxed">
                                {isPoster && (
                                    <>
                                        <User className="size-4 text-orange-400 shrink-0 mt-0.5" />
                                        <span>You are the poster of this image, so you cannot submit captions.</span>
                                    </>
                                )}
                                {!isPoster && isSettled && (
                                    <>
                                        <Trophy className="size-4 text-yellow-400 shrink-0 mt-0.5" />
                                        <span>This post is settled and is no longer accepting new captions.</span>
                                    </>
                                )}
                                {!isPoster && !isSettled && userHasSubmitted && (
                                    <>
                                        <Flame className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>You have already submitted a caption for this post. Only one caption submission is allowed per post.</span>
                                    </>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                <div className="relative">
                                    <textarea
                                        value={captionText}
                                        onChange={(e) => setCaptionText(e.target.value)}
                                        placeholder="Type your caption text here..."
                                        rows={3}
                                        maxLength={350}
                                        className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all resize-none ${
                                            captionText.length > 280
                                                ? 'border-red-500/50 focus:ring-1 focus:ring-red-500/50'
                                                : 'border-white/10 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50'
                                        }`}
                                    />
                                    
                                    {/* Character counter */}
                                    <div className={`absolute bottom-3 right-3 text-[10px] font-semibold tracking-wide tabular-nums ${
                                        captionText.length > 280
                                            ? 'text-red-400'
                                            : captionText.length > 250
                                            ? 'text-orange-400'
                                            : 'text-white/30'
                                    }`}>
                                        {captionText.length} / 280
                                    </div>
                                </div>

                                {/* Validation feedback warning */}
                                {captionText.length > 280 && (
                                    <p className="text-[11px] text-red-400 font-semibold">
                                        Caption is too long! Must not exceed 280 characters.
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isSubmitting || !captionText.trim() || captionText.length > 280}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Submit Caption
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}

                        {/* List section header with sort select */}
                        <div className="flex items-center justify-between border-t border-white/10 pt-6">
                            <h3 className="text-sm font-semibold text-white/70">
                                Captions ({captionsData?.totalElements ?? 0})
                            </h3>

                            {/* Sorting selector */}
                            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
                                {(['top', 'new', 'old'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => {
                                            setCaptionsSort(mode);
                                            setCaptionsPage(0);
                                        }}
                                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize transition-colors ${
                                            captionsSort === mode
                                                ? 'bg-orange-500 text-white font-bold'
                                                : 'text-white/50 hover:text-white'
                                        }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Scrollable list box */}
                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-1.5 scrollbar-thin">
                            {isLoadingCaptions && !captionsData ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                                </div>
                            ) : !captionsData || captionsData.content.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                                    <MessageSquareQuote className="size-8 text-white/20 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-white/40">No captions yet</p>
                                    <p className="text-xs text-white/20 mt-0.5">Be the first to share your thoughts!</p>
                                </div>
                            ) : (
                                captionsData.content.map((caption) => {
                                    const isWinner = post.winningCaptionId === caption.id;
                                    const isAuthor = caption.authorUsername === user?.username;
                                    const voteAllowed = canVoteOnCaption(caption);
                                    const isVoting = votingCaptionIds.has(caption.id);

                                    const isOwner = isPoster;
                                    const isOpen = post.status === 'OPEN';
                                    const beforeDeadline = new Date() < new Date(post.lockAt);
                                    const showSelectWinnerButton = isOwner && isOpen;
                                    const canSelectWinner = isOwner && isOpen && beforeDeadline;

                                    return (
                                        <div
                                            key={caption.id}
                                            className={`group relative p-4 rounded-xl border transition-all ${
                                                isWinner
                                                    ? 'border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.05)]'
                                                    : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.02]'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* ── Vote column ── */}
                                                <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        title={!voteAllowed ? (isSettled ? 'Voting closed' : isAuthor ? 'Cannot vote on your own caption' : 'Log in to vote') : 'Upvote'}
                                                        disabled={!voteAllowed || isVoting}
                                                        onClick={() => handleVote(caption, 1)}
                                                        className={`group flex items-center justify-center size-6 rounded-md transition-all ${
                                                            caption.myVote === 1
                                                                ? 'text-orange-400 bg-orange-500/15'
                                                                : voteAllowed
                                                                ? 'text-white/25 hover:text-orange-400 hover:bg-orange-500/10'
                                                                : 'text-white/10 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <ThumbsUp className="size-3.5" />
                                                    </button>

                                                    {/* Score */}
                                                    <span className={`text-[11px] font-bold tabular-nums leading-none ${
                                                        caption.score > 0
                                                            ? 'text-orange-400'
                                                            : caption.score < 0
                                                            ? 'text-red-400'
                                                            : 'text-white/30'
                                                    }`}>
                                                        {caption.score > 0 ? `+${caption.score}` : caption.score}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        title={!voteAllowed ? (isSettled ? 'Voting closed' : isAuthor ? 'Cannot vote on your own caption' : 'Log in to vote') : 'Downvote'}
                                                        disabled={!voteAllowed || isVoting}
                                                        onClick={() => handleVote(caption, -1)}
                                                        className={`group flex items-center justify-center size-6 rounded-md transition-all ${
                                                            caption.myVote === -1
                                                                ? 'text-red-400 bg-red-500/15'
                                                                : voteAllowed
                                                                ? 'text-white/25 hover:text-red-400 hover:bg-red-500/10'
                                                                : 'text-white/10 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <ThumbsDown className="size-3.5" />
                                                    </button>
                                                </div>

                                                {/* ── Caption content ── */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white uppercase border ${
                                                                isWinner
                                                                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-400/20'
                                                                    : 'bg-gradient-to-br from-orange-500/20 to-pink-500/20 border-white/5'
                                                            }`}>
                                                                {caption.authorUsername.charAt(0)}
                                                            </div>
                                                            <span className={`text-xs font-semibold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                                                                {caption.authorUsername}
                                                            </span>
                                                            {isAuthor && (
                                                                <span className="text-[9px] bg-white/10 text-white/70 px-1 rounded">You</span>
                                                            )}
                                                        </div>

                                                        {/* Hover Action buttons container */}
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-auto mr-2">
                                                            {isAuthor && isOpen && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setCaptionToDelete(caption)}
                                                                    className="text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-full h-7 w-7"
                                                                    title="Delete caption"
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </Button>
                                                            )}
                                                            {!isAuthor && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setCaptionToReport(caption)}
                                                                    className="text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-full h-7 w-7"
                                                                    title="Report caption"
                                                                >
                                                                    <Flag className="size-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>

                                                        <span className="text-[10px] text-white/30 font-medium shrink-0">
                                                            {timeAgo(caption.createdAt)}
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-white/80 leading-relaxed font-sans select-text">
                                                        {caption.text}
                                                    </p>

                                                    {isWinner && (
                                                        <div className="flex items-center gap-1.5 mt-2.5 text-[9px] font-bold text-yellow-400 uppercase tracking-wider">
                                                            <Trophy className="size-3" />
                                                            <span>Winning Caption</span>
                                                        </div>
                                                    )}

                                                    {showSelectWinnerButton && (
                                                        <div className="mt-3 flex items-center justify-end">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={!canSelectWinner || isSelectingWinner !== null}
                                                                onClick={() => handleSelectWinner(caption.id)}
                                                                className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-[10px] font-semibold py-1 px-2.5 h-7 rounded-lg"
                                                                title={!beforeDeadline ? "Voting deadline has passed" : undefined}
                                                            >
                                                                {isSelectingWinner === caption.id ? (
                                                                    <>
                                                                        <Loader2 className="mr-1 size-3 animate-spin" />
                                                                        Selecting...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Trophy className="mr-1 size-3" />
                                                                        Select Winner
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Pagination container */}
                        {captionsData && captionsData.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-4 border-t border-white/5 pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCaptionsPage(prev => Math.max(0, prev - 1))}
                                    disabled={captionsData.first || isLoadingCaptions}
                                    className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-30 h-8"
                                >
                                    <ChevronLeft className="size-3.5 mr-1" />
                                    Prev
                                </Button>
                                <span className="text-[11px] text-white/30 tabular-nums">
                                    {captionsPage + 1} / {captionsData.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCaptionsPage(prev => Math.min(captionsData.totalPages - 1, prev + 1))}
                                    disabled={captionsData.last || isLoadingCaptions}
                                    className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-30 h-8"
                                >
                                    Next
                                    <ChevronRight className="size-3.5 ml-1" />
                                </Button>
                            </div>
                        )}

                    </div>
                </section>

            </main>

            {/* Caption Deletion Dialog */}
            <Dialog open={captionToDelete !== null} onOpenChange={(open) => { if (!open) setCaptionToDelete(null); }}>
                <DialogContent className="bg-black/90 border border-white/10 text-white rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-white font-bold">Delete Caption</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Are you sure you want to delete this caption? This action is permanent and cannot be undone. All votes and reports associated with this caption will also be deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setCaptionToDelete(null)}
                            disabled={isDeletingCaption}
                            className="border-white/10 text-white hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCaption}
                            disabled={isDeletingCaption}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                            {isDeletingCaption ? (
                                <>
                                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Caption'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Post Report Dialog */}
            <ReportDialog
                targetType="POST"
                targetId={post.id}
                isOpen={isReportPostOpen}
                onOpenChange={setIsReportPostOpen}
            />

            {/* Caption Report Dialog */}
            {captionToReport && (
                <ReportDialog
                    targetType="CAPTION"
                    targetId={captionToReport.id}
                    isOpen={captionToReport !== null}
                    onOpenChange={(open) => { if (!open) setCaptionToReport(null); }}
                />
            )}
        </div>
    );
}

export default PostDetailsPage;