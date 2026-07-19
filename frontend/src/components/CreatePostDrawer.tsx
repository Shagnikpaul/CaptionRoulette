import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
    ImageIcon,
    Trash2,
    FileImage,
    X,
    Tag,
    SendHorizonal,
    PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { requestPresignedUrl, uploadToS3 } from "@/api/images";
import { createPost } from "@/api/posts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getExtension(name: string): string {
    const parts = name.split(".");
    return parts.length > 1 ? `.${parts[parts.length - 1].toUpperCase()}` : "—";
}

// ─── types ────────────────────────────────────────────────────────────────────

/**
 * Posting phases:
 *  idle       — nothing happening
 *  presigning — fetching a presigned URL from the backend
 *  creating   — calling createPost so the DB row exists before S3 upload
 *  uploading  — streaming the file to S3
 *  success    — everything done
 *  error      — something failed (user can retry)
 */
type PostPhase = "idle" | "presigning" | "creating" | "uploading" | "success" | "error";

const MAX_TAGS = 5;

// ─── component ────────────────────────────────────────────────────────────────

export function CreatePostDrawer() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── image state ───────────────────────────────────────────────────────────
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    // ── post metadata state ───────────────────────────────────────────────────
    const [title, setTitle] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);

    // ── submission state ──────────────────────────────────────────────────────
    const [phase, setPhase] = useState<PostPhase>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);

    // ─────────────────────────────────────────────────────────────────────────

    const isBusy = phase === "presigning" || phase === "creating" || phase === "uploading";
    const isSuccess = phase === "success";

    // ── file selection ────────────────────────────────────────────────────────

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0];
        if (!selected) return;

        // Reset upload progress when a new file is chosen
        setPhase("idle");
        setUploadProgress(0);

        setFile(selected);
        const url = URL.createObjectURL(selected);
        setPreview(url);

        // Reset so the same file can be re-selected after deletion
        e.target.value = "";
    }

    function handlePickClick() {
        fileInputRef.current?.click();
    }

    function handleDelete() {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
        setPhase("idle");
        setUploadProgress(0);
    }

    // ── tag management ────────────────────────────────────────────────────────

    function addTag(raw: string) {
        const trimmed = raw.trim();
        if (!trimmed) return;
        if (tags.length >= MAX_TAGS) {
            toast.error(`Maximum ${MAX_TAGS} tags allowed`);
            return;
        }
        if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
            toast.error("Tag already added");
            return;
        }
        setTags((prev) => [...prev, trimmed]);
        setTagInput("");
    }

    function removeTag(index: number) {
        setTags((prev) => prev.filter((_, i) => i !== index));
    }

    function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(tagInput);
        } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    }

    // ── post submission ───────────────────────────────────────────────────────
    //
    // New order (fixes the S3 → SQS → Lambda race condition):
    //   1. requestPresignedUrl  → get objectKey + uploadUrl
    //   2. createPost(imageKey) → DB row is created BEFORE S3 receives the file
    //   3. uploadToS3           → S3 event fires; Lambda finds the post row ✓
    //   4. success toast + navigate

    async function handlePost() {
        if (!file || isBusy) return;

        setUploadProgress(0);

        try {
            // ── Step 1: get presigned URL ─────────────────────────────────────
            setPhase("presigning");
            const presignResponse = await requestPresignedUrl({
                fileName: file.name,
                contentType: file.type,
                fileSize: file.size,
            });

            // ── Step 2: create the post row in the DB ─────────────────────────
            // The imageKey is already known; uploading to S3 happens AFTER this
            // so the Lambda worker triggered by the S3 event will always find
            // an existing post row to update with the optimised image key.
            setPhase("creating");
            await createPost({
                imageKey: presignResponse.objectKey,
                title: title.trim() || undefined,
                tags: tags.length > 0 ? tags : undefined,
            });

            // ── Step 3: upload the file to S3 ─────────────────────────────────
            setPhase("uploading");
            await uploadToS3(
                presignResponse.uploadUrl,
                presignResponse.httpMethod,
                file,
                (pct) => setUploadProgress(pct)
            );

            // ── Step 4: done ──────────────────────────────────────────────────
            setPhase("success");
            setUploadProgress(100);
            toast.success("Post created!", {
                description: "Your post is now live in the open feed.",
            });

            navigate("/");
        } catch (err) {
            setPhase("error");
            const message =
                err instanceof Error ? err.message : "Something went wrong";
            toast.error("Failed to create post", { description: message });
        }
    }

    // ── reset on drawer close ─────────────────────────────────────────────────

    function handleDrawerOpenChange(open: boolean) {
        if (!open) {
            // Let the close animation finish before resetting
            setTimeout(() => {
                handleDelete();
                setTitle("");
                setTagInput("");
                setTags([]);
            }, 300);
        }
    }

    // ─── phase label helpers ──────────────────────────────────────────────────

    function phaseLabel(): React.ReactNode {
        switch (phase) {
            case "presigning":
                return (
                    <>
                        <span className="mr-2 size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Preparing…
                    </>
                );
            case "creating":
                return (
                    <>
                        <span className="mr-2 size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Creating post…
                    </>
                );
            case "uploading":
                return (
                    <>
                        <span className="mr-2 size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Uploading image…
                    </>
                );
            case "error":
                return "Retry";
            default:
                return (
                    <>
                        <SendHorizonal className="w-4 h-4 mr-1.5" />
                        Post
                    </>
                );
        }
    }

    // ─── render ───────────────────────────────────────────────────────────────

    return (
        <>
            {/* Hidden native file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            <Drawer direction="right" onOpenChange={handleDrawerOpenChange}>
                <DrawerTrigger asChild>
                    <Button id="create-post-trigger-btn" size={"icon-lg"}>
                        <PlusCircle className="w-4 h-4" />
                    </Button>
                </DrawerTrigger>

                <DrawerContent className="bg-black/80 border flex flex-col gap-0 overflow-hidden rounded-3xl m-5">
                    {/* ── Header ── */}
                    <DrawerHeader className="border-b border-border/50 pb-4">
                        <DrawerTitle>Create a Post</DrawerTitle>
                        <DrawerDescription>
                            Choose an image · Add a title &amp; tags · Post
                        </DrawerDescription>
                    </DrawerHeader>

                    {/* ── Body ── */}
                    <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
                        {!file ? (
                            /* ── Empty / pick state ── */
                            <Empty className="border bg-muted/40 h-full min-h-[300px]">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <ImageIcon className="size-4" />
                                    </EmptyMedia>
                                    <EmptyTitle>No image selected</EmptyTitle>
                                    <EmptyDescription>
                                        Pick an image from your device to get started.
                                        <br />
                                        PNG, JPG, WEBP and GIF are supported.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePickClick}
                                        id="pick-image-btn"
                                    >
                                        <FileImage className="w-4 h-4 mr-1.5" />
                                        Choose Image
                                    </Button>
                                </EmptyContent>
                            </Empty>
                        ) : (
                            /* ── File selected state ── */
                            <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                {/* File metadata card */}
                                <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 flex items-start gap-3">
                                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                        <FileImage className="size-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className="text-sm font-medium text-foreground truncate"
                                            title={file.name}
                                        >
                                            {file.name}
                                        </p>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                {formatBytes(file.size)}
                                            </span>
                                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                {getExtension(file.name)}
                                            </span>
                                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                {file.type}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Delete button — disabled while posting */}
                                    {!isBusy && !isSuccess && (
                                        <button
                                            onClick={handleDelete}
                                            className="shrink-0 mt-0.5 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                            aria-label="Remove selected image"
                                            id="remove-image-btn"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Image preview */}
                                <div className="rounded-lg overflow-hidden border border-border/60 bg-muted/20">
                                    <img
                                        src={preview!}
                                        alt="Selected preview"
                                        className="w-full object-contain max-h-[260px]"
                                    />
                                </div>

                                {/* ── Post details (always visible once image is chosen) ── */}
                                <div className="flex flex-col gap-4">
                                    {/* Divider */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-border/40" />
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                            Post Details
                                        </span>
                                        <div className="flex-1 h-px bg-border/40" />
                                    </div>

                                    {/* Title input */}
                                    <div className="flex flex-col gap-1.5">
                                        <label
                                            htmlFor="post-title-input"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Title
                                            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                                                (optional)
                                            </span>
                                        </label>
                                        <input
                                            id="post-title-input"
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Give your post a title…"
                                            maxLength={120}
                                            disabled={isBusy || isSuccess}
                                            className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 disabled:opacity-50 transition"
                                        />
                                    </div>

                                    {/* Tag input */}
                                    <div className="flex flex-col gap-1.5">
                                        <label
                                            htmlFor="post-tag-input"
                                            className="text-sm font-medium text-foreground flex items-center gap-1.5"
                                        >
                                            <Tag className="size-3.5" />
                                            Tags
                                            <span className="text-xs text-muted-foreground font-normal">
                                                ({tags.length}/{MAX_TAGS})
                                            </span>
                                        </label>

                                        {/* Tag chips */}
                                        {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {tags.map((tag, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-xs font-medium text-primary"
                                                    >
                                                        #{tag}
                                                        {!isBusy && !isSuccess && (
                                                            <button
                                                                onClick={() => removeTag(i)}
                                                                className="ml-0.5 hover:text-destructive transition-colors"
                                                                aria-label={`Remove tag ${tag}`}
                                                            >
                                                                <X className="size-3" />
                                                            </button>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tag text input */}
                                        {tags.length < MAX_TAGS && !isBusy && !isSuccess && (
                                            <div className="relative">
                                                <input
                                                    id="post-tag-input"
                                                    type="text"
                                                    value={tagInput}
                                                    onChange={(e) => setTagInput(e.target.value)}
                                                    onKeyDown={handleTagKeyDown}
                                                    placeholder={
                                                        tags.length === 0
                                                            ? "Add a tag… (Enter or comma to confirm)"
                                                            : "Add another tag…"
                                                    }
                                                    className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 transition"
                                                />
                                                {tagInput.trim() && (
                                                    <button
                                                        onClick={() => addTag(tagInput)}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                        aria-label="Add tag"
                                                    >
                                                        <X className="size-3.5 rotate-45" />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-[11px] text-muted-foreground">
                                            Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd> or{" "}
                                            <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">,</kbd> to add · Up to {MAX_TAGS} tags
                                        </p>
                                    </div>
                                </div>

                                {/* Upload progress bar (shown during S3 upload phase) */}
                                {phase === "uploading" && (
                                    <div className="flex flex-col gap-2 animate-in fade-in-0 duration-200">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Uploading image…</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <Progress value={uploadProgress} className="h-1.5" />
                                    </div>
                                )}

                                {/* Error state */}
                                {phase === "error" && (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-in fade-in-0 duration-200">
                                        Something went wrong. Check the toast for details and try again.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <DrawerFooter className="border-t border-border/50 pt-4">
                        {/* Post button — only visible when an image is selected and not yet successful */}
                        {file && !isSuccess && (
                            <Button
                                onClick={handlePost}
                                disabled={isBusy}
                                className="w-full"
                                id="submit-post-btn"
                            >
                                {phaseLabel()}
                            </Button>
                        )}

                        <DrawerClose asChild>
                            <Button variant="outline" className="w-full" disabled={isBusy}>
                                {isSuccess ? "Done" : "Cancel"}
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </>
    );
}
