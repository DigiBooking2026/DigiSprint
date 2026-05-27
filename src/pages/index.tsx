"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Folder, Trash2, AlertTriangle } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileUpload, AttachmentList } from "@/components/FileUpload";
import { Project, Attachment, User } from "@/generated/prisma";

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<(Project & { _count?: { tasks: number } })[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  // Project creation form
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    if (res.ok) {
      setProjects(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(user => setCurrentUser(user));

    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name, 
        prefix, 
        description,
        attachmentIds: attachments.map(a => a.id)
      }),
    });
    if (res.ok) {
      setOpen(false);
      setName("");
      setPrefix("");
      setDescription("");
      setAttachments([]);
      fetchProjects();
    }
  };

  const openDeleteConfirmation = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete({ id, name });
    setConfirmOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    const res = await fetch(`/api/projects/${projectToDelete.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setConfirmOpen(false);
      setProjectToDelete(null);
      fetchProjects();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete project");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your teams and user stories.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger 
              render={
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create Project
                </Button>
              }
            />
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create new project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mobile App" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prefix">Ticket Prefix</Label>
                    <Input id="prefix" required value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="e.g. MOB" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <RichTextEditor content={description} onChange={setDescription} />
                </div>
                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <FileUpload onUploadComplete={(a) => setAttachments([...attachments, a])} />
                  <AttachmentList attachments={attachments} onRemove={(id) => setAttachments(attachments.filter(a => a.id !== id))} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit">Create Project</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 border rounded-lg border-dashed">
            <Folder className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-muted-foreground">Get started by creating a new project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="cursor-pointer h-full"
              >
                <Card className="hover:border-primary transition-colors h-full relative group">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{project.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {currentUser?.role === 'ADMIN' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => openDeleteConfirmation(e, project.id, project.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{project.prefix}</span>
                      </div>
                    </div>
                    <div 
                      className="text-sm text-muted-foreground line-clamp-2 mt-2 prose-sm dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: project.description || "" }}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span>{project._count?.tasks || 0} tasks</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Custom Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Project?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to remove <span className="font-semibold text-foreground">"{projectToDelete?.name}"</span>?
            </p>
            <p className="text-sm text-muted-foreground/80 mt-2">
              This will hide the project and all its tasks from the dashboard. This action is reversible only by an administrator.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteProject}>Confirm Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
