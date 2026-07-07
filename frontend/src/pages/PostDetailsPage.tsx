import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
    getPostById,
    getImageUrl,
    getCaptions,
    submitCaption,
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
    User
} from 'lucide-react';

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

function PostDetailsPage() {
    const { postId } = useParams<{ postId: string }>();
    const { user } = useAuth();

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
    const isSettled = post.status === 'SETTLED';
    const shouldDisableForm = isPoster || isSettled || userHasSubmitted;
    const urgencyClass = getUrgencyClass(post.lockAt);

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

            {/* Layout wrapper */}
            <main className="w-full max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* ── Left Column: Responsive Image + Blurry Glass Info Overlay ── */}
                <section className="lg:col-span-7 flex flex-col gap-4">
                    <div className="relative w-full rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center overflow-hidden group select-none">
                        {!imgError ? (
                            <img
                                src={getImageUrl(post.imageKey)}
                                alt={post.title ?? 'Post image'}
                                className="w-full h-auto object-contain max-h-[75vh] rounded-2xl"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="flex h-96 w-full items-center justify-center text-white/20">
                                <ImageOff className="size-16" />
                            </div>
                        )}

                        {/* Blurry Glass Card showing post details. Fades out on image wrapper hover. */}
                        <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-lg border border-white/10 rounded-xl p-4 transition-all duration-300 ease-in-out opacity-100 transform translate-y-0 group-hover:opacity-0 group-hover:translate-y-2 group-hover:pointer-events-none">
                            {post.title && (
                                <h2 className="text-base font-bold text-white mb-2 leading-snug">
                                    {post.title}
                                </h2>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/70">
                                {/* Poster info */}
                                <div className="flex items-center gap-1.5 font-medium text-white">
                                    <div className="flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/40 to-pink-600/40 border border-white/10 text-[10px] font-bold text-white uppercase">
                                        {post.posterUsername.charAt(0)}
                                    </div>
                                    <span>{post.posterUsername}</span>
                                </div>

                                <span className="text-white/30">•</span>

                                {/* Urgency status */}
                                <div className={`flex items-center gap-1 font-semibold ${urgencyClass}`}>
                                    <Clock className="size-3.5" />
                                    <span>{getTimeRemaining(post.lockAt)}</span>
                                </div>

                                <span className="text-white/30">•</span>

                                {/* Status */}
                                <div className={`flex items-center gap-1 font-semibold ${isSettled ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                    {isSettled ? (
                                        <>
                                            <Trophy className="size-3.5" />
                                            <span>Settled</span>
                                        </>
                                    ) : (
                                        <>
                                            <Flame className="size-3.5" />
                                            <span>Open</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Tags section */}
                            {post.tags && post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
                                    {post.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── Right Column: Caption Submission & Scrollable List ── */}
                <section className="lg:col-span-5 flex flex-col gap-6">
                    <div className="border border-white/10 bg-white/[0.02] rounded-2xl p-6 flex flex-col gap-6 shadow-2xl backdrop-blur-sm">
                        
                        {/* Title block */}
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Post Captions</h2>
                            <p className="text-xs text-white/50 mt-1">Submit your creative lines or vote for your favorites.</p>
                        </div>

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
                                    return (
                                        <div
                                            key={caption.id}
                                            className={`p-4 rounded-xl border transition-all ${
                                                isWinner
                                                    ? 'border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.05)]'
                                                    : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.02]'
                                            }`}
                                        >
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
                                                    {caption.authorUsername === user?.username && (
                                                        <span className="text-[9px] bg-white/10 text-white/70 px-1 rounded">You</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-white/30 font-medium">
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
        </div>
    );
}

export default PostDetailsPage;