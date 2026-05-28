"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Folder, Trash2, AlertTriangle, AlertCircle, Clock, CheckCircle2, PlayCircle, CircleDashed, Pencil } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileUpload, AttachmentList } from "@/components/FileUpload";
import { Project, Attachment, User } from "@/generated/prisma";

type ProjectWithWork = Project & {
  _count?: { tasks: number };
  attachments?: Attachment[];
  tasks?: {
    id: string;
    deadline: string | Date | null;
    status?: { name: string } | null;
    assignee?: { id: string; name: string | null; email: string } | null;
  }[];
};

const isDoneStatus = (name?: string) => /done|closed|complete|cancelled/i.test(name || "");
const isNotStartedStatus = (name?: string) => /backlog|to do|todo|not started|open/i.test(name || "");
const isPastDate = (value?: string | Date | null) => Boolean(value && new Date(value) < new Date());

function getProjectWorkState(project: ProjectWithWork) {
  const tasks = project.tasks || [];
  const done = tasks.filter(task => isDoneStatus(task.status?.name)).length;
  const notStarted = tasks.filter(task => isNotStartedStatus(task.status?.name)).length;
  const inProgress = Math.max(tasks.length - done - notStarted, 0);
  const overdueTasks = tasks.filter(task => !isDoneStatus(task.status?.name) && isPastDate(task.deadline)).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const state = tasks.length === 0 ? "Not started" : done === tasks.length ? "Done" : inProgress > 0 ? "In progress" : "Not started";

  return { done, notStarted, inProgress, overdueTasks, progress, state };
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithWork[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithWork | null>(null);
  
  // Project creation form
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
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

  const resetProjectForm = () => {
    setName("");
    setPrefix("");
    setDescription("");
    setStartDate("");
    setDeadline("");
    setAttachments([]);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(user => setCurrentUser(user));

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        startDate: startDate || null,
        deadline: deadline || null,
        attachmentIds: attachments.map(a => a.id)
      }),
    });
    if (res.ok) {
      setOpen(false);
      resetProjectForm();
      fetchProjects();
    }
  };

  const openEditProject = (e: React.MouseEvent, project: ProjectWithWork) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToEdit(project);
    setName(project.name);
    setPrefix(project.prefix);
    setDescription(project.description || "");
    setStartDate(project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "");
    setDeadline(project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : "");
    setAttachments(project.attachments || []);
    setEditOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;

    const res = await fetch(`/api/projects/${projectToEdit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        prefix,
        description,
        startDate,
        deadline,
        attachmentIds: attachments.map(a => a.id),
      }),
    });

    if (res.ok) {
      setEditOpen(false);
      setProjectToEdit(null);
      resetProjectForm();
      fetchProjects();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to update project");
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

          <div className="flex items-center gap-3">
            <Dialog open={open} onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (nextOpen) resetProjectForm();
            }}>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input id="startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline">Deadline</Label>
                      <Input id="deadline" type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
            {projects.map((project) => {
              const work = getProjectWorkState(project);
              const isOverdue = isPastDate(project.deadline) && work.state !== "Done";

              return (
              <div 
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="cursor-pointer h-full"
              >
                <Card className={`hover:border-primary transition-colors h-full relative group ${isOverdue || work.overdueTasks > 0 ? 'border-destructive/50' : ''}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {project.name}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => openEditProject(e, project)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        <span>{project._count?.tasks || 0} tasks</span>
                      </div>
                      {project.deadline && (
                        <div className={`flex items-center gap-1 ${new Date(project.deadline) < new Date() ? 'text-destructive font-bold' : ''}`}>
                          <Clock className="h-4 w-4" />
                          <span>{new Date(project.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-semibold ${work.state === 'Done' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : work.state === 'In progress' ? 'border-amber-500/30 bg-amber-500/10 text-amber-600' : 'border-muted-foreground/20 bg-muted text-muted-foreground'}`}>
                          {work.state === 'Done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : work.state === 'In progress' ? <PlayCircle className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
                          {work.state}
                        </span>
                        <span className="font-mono text-muted-foreground">{work.progress}% done</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${work.progress}%` }} />
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-muted-foreground">
                        <div className="rounded border bg-background px-2 py-1"><span className="block font-bold text-foreground">{work.notStarted}</span>Left</div>
                        <div className="rounded border bg-background px-2 py-1"><span className="block font-bold text-foreground">{work.inProgress}</span>Doing</div>
                        <div className="rounded border bg-background px-2 py-1"><span className="block font-bold text-foreground">{work.done}</span>Done</div>
                        <div className={`rounded border px-2 py-1 ${work.overdueTasks > 0 ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-background'}`}><span className="block font-bold">{work.overdueTasks}</span>Late</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={editOpen} onOpenChange={(nextOpen) => {
        setEditOpen(nextOpen);
        if (!nextOpen) {
          setProjectToEdit(null);
          resetProjectForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Project Name</Label>
                <Input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-prefix">Ticket Prefix</Label>
                <Input id="edit-prefix" required value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input id="edit-startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-deadline">Deadline</Label>
                <Input id="edit-deadline" type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor content={description} onChange={setDescription} />
            </div>
            <div className="space-y-2">
              <Label>Attachments</Label>
              <FileUpload projectId={projectToEdit?.id} onUploadComplete={(a) => setAttachments([...attachments, a])} />
              <AttachmentList attachments={attachments} onRemove={(id) => setAttachments(attachments.filter(a => a.id !== id))} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
              Are you sure you want to remove <span className="font-semibold text-foreground">&quot;{projectToDelete?.name}&quot;</span>?
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
