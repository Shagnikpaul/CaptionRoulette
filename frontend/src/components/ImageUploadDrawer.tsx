import { useRef, useState } from "react";
import { ImageIcon, Trash2, UploadIcon, FileImage } from "lucide-react";
import { toast } from "sonner";

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

// ─── component ────────────────────────────────────────────────────────────────

export function ImageUploadDrawer() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploadState, setUploadState] = useState<UploadState>("idle");
    const [progress, setProgress] = useState(0);
    const [objectKey, setObjectKey] = useState<string | null>(null);

    // ── file selection ────────────────────────────────────────────────────────

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0];
        if (!selected) return;

        // Reset any previous upload state
        setUploadState("idle");
        setProgress(0);
        setObjectKey(null);

        setFile(selected);

        // Generate local object-URL preview
        const url = URL.createObjectURL(selected);
        setPreview(url);

        // Reset input so the same file can be re-selected after deletion
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
            // 1. Get pre-signed URL from backend
            const presignResponse = await requestPresignedUrl({
                fileName: file.name,
                contentType: file.type,
                fileSize: file.size,
            });

            // 2. Upload directly to S3
            await uploadToS3(
                presignResponse.uploadUrl,
                presignResponse.httpMethod,
                file,
                (pct) => setProgress(pct)
            );

            setObjectKey(presignResponse.objectKey);
            setUploadState("success");
            setProgress(100);
            toast.success("Image uploaded successfully!", {
                description: `Stored as ${presignResponse.objectKey}`,
            });
        } catch (err) {
            setUploadState("error");
            const message =
                err instanceof Error ? err.message : "Something went wrong";
            toast.error("Upload failed", { description: message });
        }
    }

    // ── reset on drawer close ─────────────────────────────────────────────────

    function handleDrawerOpenChange(open: boolean) {
        if (!open) {
            // Give the close animation time to finish before resetting
            setTimeout(() => {
                handleDelete();
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
                    <Button>
                        <UploadIcon className="w-4 h-4" />
                        Upload Image
                    </Button>
                </DrawerTrigger>

                <DrawerContent className="flex flex-col gap-0 overflow-hidden">
                    {/* ── Header ── */}
                    <DrawerHeader className="border-b border-border/50 pb-4">
                        <DrawerTitle>Upload an Image</DrawerTitle>
                        <DrawerDescription>
                            Select a single image · Max 10 MB
                        </DrawerDescription>
                    </DrawerHeader>

                    {/* ── Body ── */}
                    <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
                        {!file ? (
                            /* ── Empty / pick state ── */
                            <Empty className="border border-dashed h-full min-h-[300px]">
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
                                        {/* File name */}
                                        <p
                                            className="text-sm font-medium text-foreground truncate"
                                            title={file.name}
                                        >
                                            {file.name}
                                        </p>
                                        {/* Size + extension chips */}
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
                                    {/* Delete button */}
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
                                        className="w-full object-contain max-h-[340px]"
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

                                {/* Success state */}
                                {isSuccess && (
                                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 animate-in fade-in-0 duration-200">
                                        <p className="font-medium">Upload complete ✓</p>
                                        {objectKey && (
                                            <p className="mt-0.5 text-xs text-emerald-400/70 font-mono truncate">
                                                {objectKey}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Error state retry hint */}
                                {uploadState === "error" && (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-in fade-in-0 duration-200">
                                        Upload failed. Check the toast for details and try again.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <DrawerFooter className="border-t border-border/50 pt-4">
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
                        <DrawerClose asChild>
                            <Button variant="outline" className="w-full">
                                {isSuccess ? "Done" : "Cancel"}
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </>
    );
}
