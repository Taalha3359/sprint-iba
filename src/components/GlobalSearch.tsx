"use client";

import * as React from "react";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    Loader2,
    FileText,
    Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function GlobalSearch() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<{ users: any[], posts: any[] }>({ users: [], posts: [] });
    const [loading, setLoading] = React.useState(false);
    const router = useRouter();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    React.useEffect(() => {
        if (query.length > 2) {
            const timer = setTimeout(() => {
                performSearch();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setResults({ users: [], posts: [] });
        }
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const { data: users } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .ilike('full_name', `%${query}%`)
                .limit(5);

            setResults({
                users: users || [],
                posts: []
            });
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    return (
        <>
            <Button
                variant="outline"
                className="relative h-9 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
                onClick={() => setOpen(true)}
            >
                <span className="hidden lg:inline-flex">Search...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Type a command or search..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    {loading && <div className="p-4 flex justify-center"><Loader2 className="animate-spin w-4 h-4" /></div>}

                    {!query && (
                        <>
                            <CommandGroup heading="Suggestions">
                                <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span>Dashboard</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => router.push("/resources"))}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    <span>Resources</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => router.push("/groups"))}>
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>Groups</span>
                                </CommandItem>
                            </CommandGroup>
                            <CommandSeparator />
                        </>
                    )}

                    {results.users.length > 0 && (
                        <CommandGroup heading="People">
                            {results.users.map((user) => (
                                <CommandItem key={user.id} onSelect={() => runCommand(() => router.push(`/profile/${user.id}`))}>
                                    <Avatar className="mr-2 h-6 w-6">
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{user.full_name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}
