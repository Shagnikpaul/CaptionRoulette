import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Hash, User, Loader2, X, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchGlobal, type SearchResult } from "@/api/search";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Field } from "./ui/field";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ username }: { username: string }) {
    return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/60 to-pink-600/60 text-[11px] font-bold text-white uppercase select-none">
            {username.charAt(0)}
        </div>
    );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5">
            <span className="text-white/30">{icon}</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {label}
            </span>
        </div>
    );
}

// ─── Results skeleton ─────────────────────────────────────────────────────────

function ResultsSkeleton() {
    return (
        <div className="flex flex-col gap-1 px-2 pb-2 animate-pulse">
            <div className="h-4 w-16 rounded bg-white/10 mx-3 mt-2" />
            {[1, 2].map((i) => (
                <div key={i} className="h-9 rounded-lg bg-white/5 mx-1" />
            ))}
            <div className="h-4 w-12 rounded bg-white/10 mx-3 mt-2" />
            {[1, 2].map((i) => (
                <div key={i} className="h-9 rounded-lg bg-white/5 mx-1" />
            ))}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SearchDialog() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const debouncedQuery = useDebounce(query.trim(), 300);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery("");
            setResults(null);
        }
    }, [open]);

    // Fire search whenever debounced query changes
    const doSearch = useCallback(async (q: string) => {
        if (!q) {
            setResults(null);
            return;
        }
        setIsLoading(true);
        try {
            const data = await searchGlobal(q);
            setResults(data);
        } catch {
            setResults({ tags: [], users: [] });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        doSearch(debouncedQuery);
    }, [debouncedQuery, doSearch]);

    function navigateTo(path: string) {
        setOpen(false);
        navigate(path);
    }

    const hasTags = results && results.tags.length > 0;
    const hasUsers = results && results.users.length > 0;
    const hasAnyResults = hasTags || hasUsers;
    const showEmpty =
        results !== null && !hasAnyResults && debouncedQuery.length > 0 && !isLoading;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon-lg" id="search-dialog-trigger">
                    <Search />
                </Button>
            </DialogTrigger>

            <DialogContent
                className="p-0 gap-0 overflow-hidden border-white/10 bg-black/65 backdrop-blur-xl sm:max-w-2xl w-full !top-[12%] translate-y-0"
                showCloseButton={false}
            >
                <DialogHeader className="hidden">
                    <DialogTitle>Search</DialogTitle>
                </DialogHeader>

                {/* ── Search input ── */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
                    {/* <Search className="size-4 text-white/40 shrink-0" /> */}
                    <Field className="p-0">
                        <InputGroup >
                            <InputGroupInput   placeholder="Search..." ref={inputRef}
                                id="search-input"
                                type="text"
                    
                                
            
                                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                                autoComplete="off"
                                spellCheck={false} value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                
                                 />
                            <InputGroupAddon align="inline-start">
                                <SearchIcon className="text-muted-foreground" />
                            </InputGroupAddon>
                        </InputGroup>
                    </Field>
                    {/* <Input
                        ref={inputRef}
                        id="search-input"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search tags or users…"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                        autoComplete="off"
                        spellCheck={false}
                    /> */}
                    {isLoading && (
                        <Loader2 className="size-4 text-white/30 animate-spin shrink-0" />
                    )}
                    {query && !isLoading && (
                        <button
                            onClick={() => { setQuery(""); setResults(null); }}
                            className="text-white/30 hover:text-white/70 transition-colors"
                            id="search-clear-btn"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                {/* ── Results panel ── */}
                {(isLoading && debouncedQuery) ? (
                    <ResultsSkeleton />
                ) : showEmpty ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <Search className="size-8 text-white/15" />
                        <p className="text-sm text-white/40">No results for <span className="text-white/60">"{debouncedQuery}"</span></p>
                    </div>
                ) : hasAnyResults ? (
                    <ScrollArea className="max-h-[520px]">
                        <div className="flex flex-col pb-2">
                            {/* Tags section */}
                            {hasTags && (
                                <div className="flex flex-col mt-1">
                                    <SectionLabel icon={<Hash className="size-3" />} label="Tags" />
                                    {results!.tags.map((tag) => {
                                        // Backend already includes '#'; strip it for the URL
                                        const tagName = tag.startsWith("#") ? tag.slice(1) : tag;
                                        return (
                                            <button
                                                key={tag}
                                                id={`search-tag-${tagName}`}
                                                onClick={() => navigateTo(`/tags/${tagName}`)}
                                                className="flex items-center gap-3 px-4 py-2.5 mx-1 rounded-lg hover:bg-white/6 transition-colors text-left group"
                                            >
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 border border-orange-500/20">
                                                    <Hash className="size-3.5 text-orange-400" />
                                                </div>
                                                <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                                                    {tag}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Users section */}
                            {hasUsers && (
                                <div className="flex flex-col mt-1">
                                    <SectionLabel icon={<User className="size-3" />} label="Users" />
                                    {results!.users.map((user) => (
                                        <button
                                            key={user.username}
                                            id={`search-user-${user.username}`}
                                            onClick={() => navigateTo(`/users/${user.username}`)}
                                            className="flex items-center gap-3 px-4 py-2.5 mx-1 rounded-lg hover:bg-white/6 transition-colors text-left group"
                                        >
                                            <UserAvatar username={user.username} />
                                            <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                                                {user.username}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : !query ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <Search className="size-8 text-white/10" />
                        <p className="text-sm text-white/30">Search for tags or users</p>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}