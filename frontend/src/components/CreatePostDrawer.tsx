import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
    ImageIcon,
    Trash2,
    UploadIcon,
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

type UploadState = "idle" | "uploading" | "success" | "error";

const MAX_TAGS = 5;

// ─── component ────────────────────────────────────────────────────────────────

export function CreatePostDrawer() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── image / upload state ──────────────────────────────────────────────────
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploadState, setUploadState] = useState<UploadState>("idle");
    const [progress, setProgress] = useState(0);
    const [objectKey, setObjectKey] = useState<string | null>(null);

    // ── post details state ────────────────────────────────────────────────────
    const [title, setTitle] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── file selection ────────────────────────────────────────────────────────

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0];
        if (!selected) return;

        setUploadState("idle");
        setProgress(0);
        setObjectKey(null);

        setFile(selected);
        const url = URL.createObjectURL(selected);
        setPreview(url);

        e.target.value = "";
    }

    function handlePickClick() {
        fileInputRef.current?.click();
    }

    function handleDelete() {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
        setUploadState("idle");
        setProgress(0);
        setObjectKey(null);
    }

    // ── upload ────────────────────────────────────────────────────────────────

    async function handleUpload() {
        if (!file || uploadState === "uploading") return;

        setUploadState("uploading");
        setProgress(0);

        try {
            const presignResponse = await requestPresignedUrl({
                fileName: file.name,
                contentType: file.type,
                fileSize: file.size,
            });

            await uploadToS3(
                presignResponse.uploadUrl,
                presignResponse.httpMethod,
                file,
                (pct) => setProgress(pct)
            );

            setObjectKey(presignResponse.objectKey);
            setUploadState("success");
            setProgress(100);
            toast.success("Image uploaded!", {
                description: "Now add a title and tags, then submit your post.",
            });
        } catch (err) {
            setUploadState("error");
            const message =
                err instanceof Error ? err.message : "Something went wrong";
            toast.error("Upload failed", { description: message });
        }
    }

    // ── tag management ────────────────────────────────────────────────────────

    function addTag(raw: string) {
        const trimmed = raw.trim();
        if (!trimmed) return;
        if (tags.length >= MAX_TAGS) {
            toast.error(`Maximum ${MAX_TAGS} tags allowed`);
            return;
        }
        // Case-insensitive duplicate check (server normalises to lowercase)
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

    // ── submit post ───────────────────────────────────────────────────────────

    async function handleSubmit() {
        if (!objectKey || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await createPost({
                imageKey: objectKey,
                title: title.trim() || undefined,
                tags: tags.length > 0 ? tags : undefined,
            });

            toast.success("Post created!", {
                description: "Your post is now live in the open feed.",
            });

            // Redirect to open feed
            navigate("/");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Something went wrong";
            toast.error("Failed to create post", { description: message });
        } finally {
            setIsSubmitting(false);
        }
    }

    // ── reset on drawer close ─────────────────────────────────────────────────

    function handleDrawerOpenChange(open: boolean) {
        if (!open) {
            setTimeout(() => {
                handleDelete();
                setTitle("");
                setTagInput("");
                setTags([]);
                setIsSubmitting(false);
            }, 300);
        }
    }

    // ─── render ───────────────────────────────────────────────────────────────

    const isUploading = uploadState === "uploading";
    const isSuccess = uploadState === "success";

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
                    <Button id="create-post-trigger-btn" size={'icon-lg'}>
                        <PlusCircle className="w-4 h-4" />
                        
                    </Button>
                </DrawerTrigger>

                <DrawerContent className="bg-black/80 border flex flex-col gap-0 overflow-hidden rounded-3xl m-5">
                    {/* ── Header ── */}
                    <DrawerHeader className="border-b border-border/50 pb-4">
                        <DrawerTitle>Create a Post</DrawerTitle>
                        <DrawerDescription>
                            Upload an image · Add a title & tags · Submit
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
                                {/* Metadata card */}
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
                                    {/* Delete button — only before upload succeeds */}
                                    {!isUploading && !isSuccess && (
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

                                {/* Upload progress */}
                                {isUploading && (
                                    <div className="flex flex-col gap-2 animate-in fade-in-0 duration-200">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Uploading…</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-1.5" />
                                    </div>
                                )}

                                {/* Upload success banner */}
                                {isSuccess && (
                                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 animate-in fade-in-0 duration-200">
                                        <p className="font-medium">Image uploaded ✓</p>
                                        {objectKey && (
                                            <p className="mt-0.5 text-xs text-emerald-400/70 font-mono truncate">
                                                {objectKey}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Error state */}
                                {uploadState === "error" && (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-in fade-in-0 duration-200">
                                        Upload failed. Check the toast for details and try again.
                                    </div>
                                )}

                                {/* ── Post Details (shown after successful upload) ── */}
                                {isSuccess && (
                                    <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
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
                                                disabled={isSubmitting}
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
                                                            {!isSubmitting && (
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
                                            {tags.length < MAX_TAGS && (
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
                                                        disabled={isSubmitting}
                                                        className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 disabled:opacity-50 transition"
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
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <DrawerFooter className="border-t border-border/50 pt-4">
                        {/* Upload button — shown when file selected but not yet uploaded */}
                        {file && !isSuccess && (
                            <Button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="w-full"
                                id="start-upload-btn"
                            >
                                {isUploading ? (
                                    <>
                                        <span className="mr-2 size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Uploading…
                                    </>
                                ) : uploadState === "error" ? (
                                    "Retry Upload"
                                ) : (
                                    <>
                                        <UploadIcon className="w-4 h-4 mr-1.5" />
                                        Upload Image
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Submit Post button — shown after upload succeeds */}
                        {isSuccess && (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full"
                                id="submit-post-btn"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="mr-2 size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        <SendHorizonal className="w-4 h-4 mr-1.5" />
                                        Submit Post
                                    </>
                                )}
                            </Button>
                        )}

                        <DrawerClose asChild>
                            <Button variant="outline" className="w-full">
                                {isSuccess ? "Cancel" : "Close"}
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </>
    );
}
