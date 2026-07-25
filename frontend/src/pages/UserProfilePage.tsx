import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
    ImageOff,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Calendar,
    User,
    UserPen,
    EyeOff,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile, getUserPosts, type UserProfile } from "@/api/search";
import { getImageUrl, type FeedItemResponse } from "@/api/posts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatJoinedDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

// ─── Profile Header ───────────────────────────────────────────────────────────

function ProfileHeader({
    profile,
    isOwnProfile,
    onEditProfile,
}: {
    profile: UserProfile;
    postCount: number;
    isOwnProfile: boolean;
    onEditProfile: () => void;
}) {
    const avatarSrc = profile.profileImage
        ? profile.profileImage.startsWith("http")
            ? profile.profileImage
            : getImageUrl(profile.profileImage)
        : undefined;

    return (
        <div className="flex items-center justify-between gap-6 mb-8 py-4 border-b border-white/10">
            <div className="flex items-center gap-5">
                {/* Avatar */}
                <Avatar className="size-20 sm:size-24 shrink-0 border-2 border-white/20 shadow-xl">
                    <AvatarImage src={avatarSrc} alt={profile.username} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-400 text-3xl font-extrabold uppercase">
                        {profile.username.charAt(0)}
                    </AvatarFallback>
                </Avatar>

                {/* Text info */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        {profile.username}
                    </h1>
                    <div className="flex items-center gap-1.5 text-white/40 text-xs mt-0.5">
                        <Calendar className="size-3.5" />
                        <span>Joined {formatJoinedDate(profile.joinedAt)}</span>
                    </div>
                </div>
            </div>

            {/* Edit Profile button if visiting own profile */}
            {isOwnProfile && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onEditProfile}
                    className="border-white/20 text-white hover:bg-white/10 hover:text-white rounded-xl shadow-sm text-xs font-semibold gap-1.5"
                    id="profile-edit-btn"
                >
                    <UserPen className="size-4 text-orange-400" />
                    <span>Edit Profile</span>
                </Button>
            )}
        </div>
    );
}

// ─── Profile Header Skeleton ──────────────────────────────────────────────────

function ProfileHeaderSkeleton() {
    return (
        <div className="flex items-center gap-6 mb-8 py-4 border-b border-white/10 animate-pulse">
            <div className="size-20 sm:size-24 shrink-0 rounded-full bg-white/10" />
            <div className="flex flex-col gap-2">
                <div className="h-7 w-36 rounded-lg bg-white/10" />
                <div className="h-4 w-44 rounded bg-white/8" />
            </div>
        </div>
    );
}

// ─── Grid Post Thumbnail ──────────────────────────────────────────────────────

function GridThumbnail({ post }: { post: FeedItemResponse }) {
    const [imgError, setImgError] = useState(false);

    return (
        <Link
            to={`/posts/${post.id}`}
            className="relative block aspect-square overflow-hidden rounded-xl group border border-white/8"
            id={`user-post-${post.id}`}
        >
            {!imgError ? (
                <img
                    src={getImageUrl(post.imageKey)}
                    alt={post.title ?? "Post"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="flex h-full items-center justify-center bg-white/5 text-white/20">
                    <ImageOff className="size-8" />
                </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center px-2">
                    {post.title && (
                        <p className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                            {post.title}
                        </p>
                    )}
                    {post.status === "SETTLED" && (
                        <span className="mt-1 inline-block text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                            Settled
                        </span>
                    )}
                </div>
            </div>

            {/* Settled indicator dot */}
            {post.status === "SETTLED" && (
                <div className="absolute top-2 right-2 size-2 rounded-full bg-yellow-400 ring-1 ring-black/50" />
            )}

            {/* Shadow banned badge (visible to post owner) */}
            {post.shadowBanned && (
                <div
                    className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-red-950/85 border border-red-500/50 px-1.5 py-0.5 text-[9px] font-bold text-red-300 backdrop-blur-sm shadow-md"
                    title="Shadow Banned: Only visible to you on your profile page"
                >
                    <EyeOff className="size-2.5 text-red-400" />
                    <span>Shadow Banned</span>
                </div>
            )}
        </Link>
    );
}

// ─── Grid Skeleton ────────────────────────────────────────────────────────────

function GridSkeleton() {
    return (
        <>
            {Array.from({ length: 9 }).map((_, i) => (
                <div
                    key={i}
                    className="aspect-square rounded-xl bg-white/[0.05] border border-white/8 animate-pulse"
                />
            ))}
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12; // 3-col grid, 4 rows

export function UserProfilePage() {
    const { username = "" } = useParams<{ username: string }>();
    const { user, openEditProfile } = useAuth();

    const isOwnProfile = Boolean(
        user?.username && username && user.username.toLowerCase() === username.toLowerCase()
    );

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<FeedItemResponse[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isFirst, setIsFirst] = useState(true);
    const [isLast, setIsLast] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Fetch profile once on mount / username change / when user changes
    useEffect(() => {
        setProfileLoading(true);
        setNotFound(false);
        setProfile(null);
        setPage(0);

        getUserProfile(username)
            .then(setProfile)
            .catch((err: unknown) => {
                const status = (err as { response?: { status?: number } })?.response?.status;
                if (status === 404) setNotFound(true);
            })
            .finally(() => setProfileLoading(false));
    }, [username, user]);

    // Fetch posts for current page
    const fetchPosts = useCallback(
        async (p: number) => {
            setPostsLoading(true);
            try {
                const data = await getUserPosts(username, p, PAGE_SIZE);
                // Shadow-banned posts are only visible to the profile owner
                const visiblePosts = isOwnProfile
                    ? data.content
                    : data.content.filter((post) => !post.shadowBanned);
                setPosts(visiblePosts);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
                setIsFirst(data.first);
                setIsLast(data.last);
            } catch {
                /* silent — profile 404 is already caught above */
            } finally {
                setPostsLoading(false);
            }
        },
        [username, isOwnProfile]
    );

    useEffect(() => {
        if (!notFound) fetchPosts(page);
    }, [page, fetchPosts, notFound]);

    function goToPage(p: number) {
        setPage(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ── Not found state ──
    if (!profileLoading && notFound) {
        return (
            <div className="flex flex-col items-center w-full py-8 px-4">
                <div className="w-full max-w-[600px]">
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                            <AlertCircle className="size-8 text-white/20" />
                        </div>
                        <div>
                            <p className="text-base font-semibold text-white/50">User not found</p>
                            <p className="text-sm text-white/30 mt-1">
                                No account exists for <span className="text-orange-400">@{username}</span>
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
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full py-8 px-4">
            {/* Constrain layout: profile card narrow, grid slightly wider */}
            <div className="w-full max-w-[600px] flex flex-col">

                {/* ── Profile card ── */}
                {profileLoading ? (
                    <ProfileHeaderSkeleton />
                ) : (
                    profile && (
                        <ProfileHeader
                            profile={profile}
                            postCount={totalElements}
                            isOwnProfile={isOwnProfile}
                            onEditProfile={openEditProfile}
                        />
                    )
                )}

                {/* ── Section label ── */}
                <div className="flex items-center justify-start gap-2 mb-4">
                    <span className="text-sm font-semibold text-white/70">Posts</span>
                    {!postsLoading && (
                        <span className="text-xs text-white/30">· {totalElements} total</span>
                    )}
                </div>

                {/* ── 3-column grid ── */}
                <div className="grid grid-cols-3 gap-1">
                    {postsLoading ? (
                        <GridSkeleton />
                    ) : posts.length === 0 ? (
                        <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-center">
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                                <User className="size-7 text-white/20" />
                            </div>
                            <p className="text-sm text-white/40">No posts yet</p>
                        </div>
                    ) : (
                        posts.map((post) => <GridThumbnail key={post.id} post={post} />)
                    )}
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(page - 1)}
                            disabled={isFirst || postsLoading}
                            className="border-white/20 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
                            id="user-prev-page-btn"
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
                            disabled={isLast || postsLoading}
                            className="border-white/20 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
                            id="user-next-page-btn"
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
