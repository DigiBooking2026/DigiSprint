"use client";

import * as React from "react";
import { useRouter } from "next/router";
import { Command } from "cmdk";
import { Search, Folder, CheckSquare, SearchX } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<{ tasks: any[]; projects: any[] }>({ tasks: [], projects: [] });
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
    if (!query) {
      setResults({ tasks: [], projects: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          setResults(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const onSelectProject = (projectId: string) => {
    setOpen(false);
    router.push(`/projects/${projectId}`);
  };

  const onSelectTask = (projectId: string, taskId: string) => {
    setOpen(false);
    router.push(`/projects/${projectId}?task=${taskId}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground px-4 py-2 relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
      >
        <span className="hidden lg:inline-flex">Search tasks...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden shadow-2xl max-w-2xl border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <Command
            className="flex h-full w-full flex-col overflow-hidden bg-popover text-popover-foreground"
            shouldFilter={false}
          >
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search for projects and tasks..."
                value={query}
                onValueChange={setQuery}
              />
            </div>
            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
              <Command.Empty className="py-6 text-center text-sm">
                {loading ? "Searching..." : query ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <SearchX className="h-6 w-6 mb-2" />
                    No results found.
                  </div>
                ) : "Type to start searching..."}
              </Command.Empty>
              
              {results.projects.length > 0 && (
                <Command.Group heading="Projects" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {results.projects.map((project) => (
                    <Command.Item
                      key={project.id}
                      value={project.id}
                      onSelect={() => onSelectProject(project.id)}
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 mb-1"
                    >
                      <Folder className="mr-2 h-4 w-4 text-primary" />
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-2">{project.prefix}</span>
                      {project.name}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {results.tasks.length > 0 && (
                <Command.Group heading="Tasks" className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                  {results.tasks.map((task) => (
                    <Command.Item
                      key={task.id}
                      value={task.id}
                      onSelect={() => onSelectTask(task.projectId, task.id)}
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 mb-1"
                    >
                      <CheckSquare className="mr-2 h-4 w-4" style={{ color: task.status?.color || '#888' }} />
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-2">{task.ticketId}</span>
                      <span className="flex-1 truncate">{task.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 px-2 py-0.5 rounded-full border">
                        {task.project?.name}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
