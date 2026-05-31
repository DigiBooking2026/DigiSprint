"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Clock, User as UserIcon, AlertCircle, FileText, Bug, Code, GripVertical, Trash2, AlertTriangle, Send, Paperclip, Edit3, Check, X, History, CalendarDays, CheckCircle2, CircleDashed, PlayCircle, Flag, ShieldAlert } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileUpload, AttachmentList } from "@/components/FileUpload";
import { Task, TaskStatus, User, Attachment, Comment, TaskHistory, Project } from "@/generated/prisma";

type ExtendedTask = Task & { 
  assignee?: User | null, 
  owner?: User | null,
  status?: TaskStatus | null,
  attachments?: Attachment[],
  comments?: (Comment & { user: User, attachments: Attachment[] })[],
  history?: (TaskHistory & { user: User })[],
  parent?: { id: string, ticketId: string, title: string, status?: TaskStatus } | null,
  subtasks?: { id: string, ticketId: string, title: string, status?: TaskStatus }[],
  sourceLinks?: { target: { id: string, ticketId: string, title: string, status?: TaskStatus }, type: string }[],
  targetLinks?: { source: { id: string, ticketId: string, title: string, status?: TaskStatus }, type: string }[],
  sprint?: { id: string, name: string } | null,
  worklogs?: { id: string; hours: number; notes: string | null; date: string; user: { name: string | null; email: string } }[],
  project?: { id: string, name: string, prefix: string } | null
};

export type Sprint = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  projectId: string;
  tasks: { id: string; storyPoints: number; status: { name: string } }[];
};

const isDoneStatus = (name?: string) => /done|closed|complete|cancelled/i.test(name || "");
const isNotStartedStatus = (name?: string) => /backlog|to do|todo|not started|open/i.test(name || "");
const isPastDate = (value?: string | Date | null) => Boolean(value && new Date(value) < new Date());
const isDueSoon = (value?: string | Date | null) => {
  if (!value || isPastDate(value)) return false;
  const diff = new Date(value).getTime() - new Date().getTime();
  return diff <= 2 * 24 * 60 * 60 * 1000;
};
const priorityStyles: Record<string, string> = {
  LOW: "border-slate-400/30 bg-slate-400/10 text-slate-600",
  MEDIUM: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  HIGH: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  CRITICAL: "border-destructive/30 bg-destructive/10 text-destructive",
};

export default function AllTasksPage() {
  const router = useRouter();
  
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [loading, setLoading] = useState(true);

  // Filters
  const [assigneeFilter, setAssigneeFilter] = useState<string>("me");
  const [statusFilter, setStatusFilter] = useState<string>("in_progress");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Task Details Modal
  const [selectedTask, setSelectedTask] = useState<ExtendedTask | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editDesc, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editBlockedReason, setEditBlockedReason] = useState("");
  const [editOwnerId, setEditOwnerId] = useState("");
  
  // Chat state
  const [commentText, setCommentText] = useState("");
  const [chatAttachments, setChatAttachments] = useState<Attachment[]>([]);
  const [taskComments, setComments] = useState<(Comment & { user: User, attachments: Attachment[] })[]>([]);
  const [taskHistory, setTaskHistory] = useState<(TaskHistory & { user: User })[]>([]);
  
  // Worklog state
  const [worklogHours, setWorklogHours] = useState("");
  const [worklogNotes, setWorklogNotes] = useState("");
  const [worklogDate, setWorklogDate] = useState(new Date().toISOString().split('T')[0]);

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string, message: string, onConfirm: () => void }>({
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ title, message, onConfirm });
    setConfirmOpen(true);
  };

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, statusesRes, usersRes, meRes, projectsRes] = await Promise.all([
        fetch(`/api/tasks`),
        fetch(`/api/statuses`),
        fetch("/api/users"),
        fetch("/api/auth/me"),
        fetch("/api/projects")
      ]);
      
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (statusesRes.ok) setStatuses(await statusesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentUser(me);
      }
    } catch (error) {
      console.error("Fetch data error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (router.isReady) fetchData();
  }, [fetchData, router.isReady]);

  // Task Details Logic
  const fetchTaskDetails = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedTask(data);
      setComments(data.comments || []);
      setTaskHistory(data.history || []);
      
      // Prep edit form
      setEditTitle(data.title);
      setEditPoints(String(data.storyPoints));
      setEditDescription(data.description || "");
      setEditDeadline(data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : "");
      setEditPriority(data.priority || "MEDIUM");
      setEditBlockedReason(data.blockedReason || "");
      setEditOwnerId(data.ownerId || "");
    }
  };

  const handleOpenTask = (task: ExtendedTask) => {
    setIsEditing(false);
    fetchTaskDetails(task.id);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    const res = await fetch(`/api/tasks/${selectedTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        title: editTitle, 
        storyPoints: editPoints, 
        description: editDesc,
        deadline: editDeadline || null,
        priority: editPriority,
        blockedReason: editBlockedReason || null,
        ownerId: editOwnerId,
        attachmentIds: selectedTask.attachments?.map(a => a.id) || []
      }),
    });
    if (res.ok) {
      setIsEditing(false);
      fetchTaskDetails(selectedTask.id);
      fetchData();
    }
  };

  const handleAddWorklog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !worklogHours) return;

    const res = await fetch(`/api/tasks/${selectedTask.id}/worklogs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: parseFloat(worklogHours), notes: worklogNotes, date: worklogDate }),
    });

    if (res.ok) {
      setWorklogHours("");
      setWorklogNotes("");
      fetchTaskDetails(selectedTask.id);
      fetchData();
    }
  };

  const handleDeleteWorklog = async (worklogId: string) => {
    if (!selectedTask) return;
    const res = await fetch(`/api/tasks/${selectedTask.id}/worklogs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worklogId }),
    });
    if (res.ok) {
      fetchTaskDetails(selectedTask.id);
      fetchData();
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || (!commentText.trim() && chatAttachments.length === 0)) return;
    
    const res = await fetch(`/api/tasks/comments?taskId=${selectedTask.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        content: commentText,
        attachmentIds: chatAttachments.map(a => a.id)
      }),
    });

    if (res.ok) {
      setCommentText("");
      setChatAttachments([]);
      fetchTaskDetails(selectedTask.id);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatusId: string) => {
    const newStatus = statuses.find(status => status.id === newStatusId);
    const task = tasks.find(item => item.id === taskId);
    let reason: string | null | undefined;
    if (newStatus && /blocked/i.test(newStatus.name) && !task?.blockedReason) {
      reason = window.prompt("Why is this task blocked?")?.trim() || "";
      if (!reason) {
        fetchData();
        return;
      }
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, statusId: newStatusId } : t));
    
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId: newStatusId, blockedReason: reason }),
    });
    
    if (!res.ok) {
      fetchData();
    } else {
      if (selectedTask?.id === taskId) fetchTaskDetails(taskId);
    }
  };

  const updateTaskAssignee = async (taskId: string, newAssigneeId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: newAssigneeId === "unassigned" ? null : newAssigneeId }),
    });
    fetchData();
    if (selectedTask?.id === taskId) fetchTaskDetails(taskId);
  };

  const deleteTask = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    if (res.ok) fetchData();
  };

  const getUserDisplay = (userId?: string | null, fallback = "Unassigned", fallbackUser?: User | null) => {
    const user = users.find(u => u.id === userId) || fallbackUser;
    return user?.name || user?.email || fallback;
  };
  const selectedOwnerLabel = getUserDisplay(editOwnerId, "Select owner");

  // Filtering Logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Assignee Filter
      if (assigneeFilter === "me") {
        if (task.assigneeId !== currentUser?.id) return false;
      } else if (assigneeFilter === "unassigned") {
        if (task.assigneeId) return false;
      } else if (assigneeFilter !== "all") {
        if (task.assigneeId !== assigneeFilter) return false;
      }

      // Project Filter
      if (projectFilter !== "all") {
        if (task.projectId !== projectFilter) return false;
      }

      // Status Filter
      const statusName = statuses.find(s => s.id === task.statusId)?.name || task.status?.name;
      if (statusFilter === "in_progress") {
        if (isDoneStatus(statusName) || isNotStartedStatus(statusName)) return false;
      } else if (statusFilter === "done") {
        if (!isDoneStatus(statusName)) return false;
      } else if (statusFilter === "todo") {
        if (!isNotStartedStatus(statusName)) return false;
      }

      return true;
    });
  }, [tasks, assigneeFilter, projectFilter, statusFilter, currentUser, statuses]);

  // Group by project
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, ExtendedTask[]> = {};
    for (const task of filteredTasks) {
      const pId = task.projectId;
      if (!grouped[pId]) grouped[pId] = [];
      grouped[pId].push(task);
    }
    return grouped;
  }, [filteredTasks]);

  if (!router.isReady) return null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">All Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View and manage tasks across all projects.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
            <div className="space-y-1">
              <Label>Project</Label>
              <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v || "all")}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assignee</Label>
              <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v || "me")}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Assigned to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="me">Assigned to Me</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "in_progress")}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex-1 flex justify-center items-center text-muted-foreground italic border-2 border-dashed rounded-xl">
            No tasks match your filters.
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-8 pb-8">
             {Object.entries(tasksByProject).map(([projectId, projTasks]) => {
               const project = projects.find(p => p.id === projectId) || projTasks[0].project;
               return (
                 <div key={projectId} className="border rounded-xl bg-card overflow-hidden">
                   <div className="bg-muted/50 p-4 border-b">
                     <h2 className="font-bold text-lg">{project?.name || "Unknown Project"}</h2>
                     <p className="text-xs text-muted-foreground mt-1">{projTasks.length} tasks</p>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/20">
                            <th className="text-left p-3">Ticket</th>
                            <th className="text-left p-3">Title</th>
                            <th className="text-left p-3">Type</th>
                            <th className="text-left p-3">Priority</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-left p-3">Assignee</th>
                            <th className="text-center p-3">Points</th>
                            <th className="text-right p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projTasks.map(task => {
                            const currentStatus = statuses.find(s => s.id === task.statusId);
                            return (
                              <tr key={task.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleOpenTask(task)}>
                                <td className="p-3 font-mono text-xs text-muted-foreground flex items-center gap-2">
                                  {task.ticketId}
                                  {task.deadline && new Date(task.deadline) < new Date() && (
                                    <span title={`Overdue: ${new Date(task.deadline).toLocaleDateString()}`}>
                                      <AlertCircle className="h-3.5 w-3.5 text-destructive animate-pulse" />
                                    </span>
                                  )}
                                  {task.deadline && isDueSoon(task.deadline) && (
                                    <span title={`Due soon: ${new Date(task.deadline).toLocaleDateString()}`}>
                                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-medium">{task.title}</td>
                                <td className="p-3"><div className="flex items-center gap-1.5">{task.type === 'BUG' ? <Bug className="h-3 w-3 text-destructive" /> : <Code className="h-3 w-3 text-primary" />}<span className="text-xs">{task.type}</span></div></td>
                                <td className="p-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityStyles[task.priority || "MEDIUM"] || priorityStyles.MEDIUM}`}><Flag className="h-3 w-3" />{task.priority || "MEDIUM"}</span></td>
                                <td className="p-3"><div onClick={(e) => e.stopPropagation()}><Select value={task.statusId} onValueChange={(val) => updateTaskStatus(task.id, val || "")}><SelectTrigger className="h-8 text-xs w-[140px] font-semibold" style={{ backgroundColor: (currentStatus?.color || '#ccc') + '20', color: currentStatus?.color || '#333', borderLeft: `4px solid ${currentStatus?.color || '#ccc'}` }}><span className="truncate">{currentStatus?.name || "Status"}</span></SelectTrigger><SelectContent>{statuses.filter(s => s.projectId === task.projectId).map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}</SelectContent></Select></div></td>
                                <td className="p-3"><div onClick={(e) => e.stopPropagation()}><Select value={task.assigneeId || "unassigned"} onValueChange={(val) => updateTaskAssignee(task.id, val || "unassigned")}><SelectTrigger className="h-8 text-xs w-[150px]"><div className="flex items-center gap-1.5 overflow-hidden"><UserIcon className="h-3 w-3 flex-shrink-0" /><span className="truncate">{getUserDisplay(task.assigneeId, "Unassigned", task.assignee)}</span></div></SelectTrigger><SelectContent><SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id} className="text-xs">{u.name || u.email}</SelectItem>)}</SelectContent></Select></div></td>
                                <td className="p-3 text-center font-medium">{task.storyPoints}h</td>
                                <td className="p-3 text-right"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); showConfirm("Delete?", `Delete ${task.title}?`, () => deleteTask(task.id)); }}><Trash2 className="h-4 w-4" /></Button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                     </table>
                   </div>
                 </div>
               );
             })}
          </div>
        )}
      </main>

      {/* Task Details Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-none">
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT: Task Info */}
            <div className="flex-1 p-8 overflow-y-auto bg-background">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="bg-muted px-2.5 py-1 rounded font-mono font-bold text-foreground border shadow-sm">{selectedTask?.ticketId}</span>
                  <span className="text-muted-foreground/30">|</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedTask?.type === 'BUG' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                    {selectedTask?.type}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${priorityStyles[selectedTask?.priority || "MEDIUM"] || priorityStyles.MEDIUM}`}>
                    <Flag className="h-3 w-3" />
                    {selectedTask?.priority || "MEDIUM"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <UserIcon className="h-3 w-3" />
                    Owner: {selectedTask?.owner?.name || selectedTask?.owner?.email || "Unknown"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Created: {selectedTask?.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                   {isEditing ? (
                     <>
                       <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="gap-2"><X className="h-4 w-4" /> Cancel</Button>
                       <Button size="sm" onClick={handleUpdateTask} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><Check className="h-4 w-4" /> Save Changes</Button>
                     </>
                   ) : (
                     <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-2"><Edit3 className="h-4 w-4" /> Edit Task</Button>
                   )}
                </div>
              </div>
              
              {isEditing ? (
                <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-primary uppercase">Task Title</Label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-xl font-bold h-12" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-primary uppercase">Story Points (hrs)</Label>
                      <Input type="number" step="0.5" value={editPoints} onChange={(e) => setEditPoints(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-primary uppercase">Deadline</Label>
                      <Input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-primary uppercase">Status</Label>
                      <Select value={selectedTask?.statusId || ""} onValueChange={async (val) => {
                        if (!selectedTask) return;
                        await fetch(`/api/tasks/${selectedTask.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ statusId: val })
                        });
                        fetchTaskDetails(selectedTask.id);
                        fetchData();
                      }}>
                        <SelectTrigger>
                          <span className="truncate">{statuses.find(s => s.id === selectedTask?.statusId)?.name || "Status"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.filter(s => s.projectId === selectedTask?.projectId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-primary uppercase">Priority</Label>
                      <Select value={editPriority} onValueChange={(val) => setEditPriority(val || "MEDIUM")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-primary uppercase">Owner</Label>
                      <Select value={editOwnerId} onValueChange={(val) => setEditOwnerId(val || "")}>
                        <SelectTrigger><div className="flex min-w-0 items-center gap-1.5"><UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{getUserDisplay(editOwnerId, selectedOwnerLabel, selectedTask?.owner)}</span></div></SelectTrigger>
                        <SelectContent>
                          {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {/blocked/i.test(selectedTask?.status?.name || "") && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-primary uppercase">Blocked Reason</Label>
                        <Input required value={editBlockedReason} onChange={(e) => setEditBlockedReason(e.target.value)} placeholder="What is blocking this task?" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-primary uppercase">Description</Label>
                    <RichTextEditor content={editDesc} onChange={setEditDescription} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-primary uppercase">Attachments</Label>
                    <FileUpload taskId={selectedTask?.id} onUploadComplete={(a) => setSelectedTask(prev => prev ? { ...prev, attachments: [...(prev.attachments || []), a] } : null)} />
                    <AttachmentList 
                      attachments={selectedTask?.attachments || []} 
                      onRemove={(id) => setSelectedTask(prev => prev ? { ...prev, attachments: (prev.attachments || []).filter(a => a.id !== id) } : null)} 
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-extrabold mb-8 tracking-tight text-foreground">{selectedTask?.title}</h2>
                  
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="bg-muted/50 p-1 mb-6">
                      <TabsTrigger value="details" className="gap-2"><FileText className="h-4 w-4" /> Details</TabsTrigger>
                      <TabsTrigger value="worklogs" className="gap-2"><Clock className="h-4 w-4" /> Time Tracking</TabsTrigger>
                      <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-8 animate-in fade-in duration-300">
                      
                      <div className="bg-muted/5 border rounded-xl p-6 shadow-inner">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-tight">
                            <FileText className="h-4 w-4" /> 
                            Task Description
                          </h3>
                          {selectedTask?.deadline && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${new Date(selectedTask.deadline) < new Date() ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                              <AlertCircle className="h-3 w-3" />
                              Deadline: {new Date(selectedTask.deadline).toLocaleDateString()}
                              {new Date(selectedTask.deadline) < new Date() && " (OVERDUE)"}
                            </div>
                          )}
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: selectedTask?.description || "<p className='italic text-muted-foreground'>No description provided.</p>" }} />
                        {/blocked/i.test(selectedTask?.status?.name || "") && (
                          <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            <p className="mb-1 flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4" /> Blocked reason</p>
                            <p>{selectedTask?.blockedReason || "No blocked reason was provided."}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2 px-2 uppercase tracking-tight">
                          <Paperclip className="h-4 w-4 text-primary" /> 
                          Attachments
                        </h3>
                        {selectedTask?.attachments && selectedTask.attachments.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {selectedTask.attachments.map(a => {
                              const isImage = a.type.startsWith('image/');
                              return (
                                <div key={a.id} className="group relative flex flex-col bg-muted/20 rounded-xl overflow-hidden border hover:border-primary/30 transition-all">
                                  {isImage ? (
                                    <div className="aspect-video relative overflow-hidden bg-background flex items-center justify-center">
                                      <img src={a.url} alt={a.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="bg-white text-black p-2 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                          <PlusCircle className="h-5 w-5" />
                                        </a>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-video bg-muted/50 flex flex-col items-center justify-center gap-2">
                                      <FileText className="h-10 w-10 text-muted-foreground/50" />
                                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{a.name.split('.').pop()}</span>
                                    </div>
                                  )}
                                  <div className="p-3 bg-background/50 backdrop-blur-sm mt-auto border-t">
                                    <p className="text-[11px] font-bold truncate pr-6">{a.name}</p>
                                    <div className="flex justify-between items-center mt-1">
                                      <span className="text-[9px] text-muted-foreground">{(a.size / 1024).toFixed(1)} KB</span>
                                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[9px] font-bold">Download</a>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : <div className="bg-muted/10 rounded-xl p-8 text-center border-2 border-dashed border-muted-foreground/10 text-muted-foreground text-xs italic">No files attached.</div>}
                      </div>
                    </TabsContent>

                    <TabsContent value="worklogs" className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-muted/5 border rounded-xl p-6 shadow-inner">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-tight mb-4">
                          <Clock className="h-4 w-4" /> Log Work
                        </h3>
                        <form onSubmit={handleAddWorklog} className="flex flex-col gap-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-muted-foreground uppercase">Hours</Label>
                              <Input type="number" step="0.1" required value={worklogHours} onChange={(e) => setWorklogHours(e.target.value)} placeholder="e.g. 2.5" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-muted-foreground uppercase">Date</Label>
                              <Input type="date" required value={worklogDate} onChange={(e) => setWorklogDate(e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-xs font-bold text-muted-foreground uppercase">Notes (Optional)</Label>
                              <Input value={worklogNotes} onChange={(e) => setWorklogNotes(e.target.value)} placeholder="What did you work on?" />
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <div className="text-xs text-muted-foreground">
                              Total Logged: <span className="font-bold text-foreground">{selectedTask?.loggedTime || 0}h</span> 
                              {selectedTask?.storyPoints ? ` / ${selectedTask.storyPoints}h estimated` : ""}
                            </div>
                            <Button type="submit" size="sm" className="gap-2">Add Worklog</Button>
                          </div>
                        </form>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-tight px-1">Recent Worklogs</h3>
                        {selectedTask?.worklogs && selectedTask.worklogs.length > 0 ? (
                          <div className="rounded-xl border overflow-hidden bg-card">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/30">
                                <tr className="border-b text-xs text-muted-foreground uppercase">
                                  <th className="text-left p-3 font-semibold">User</th>
                                  <th className="text-left p-3 font-semibold">Date</th>
                                  <th className="text-left p-3 font-semibold">Hours</th>
                                  <th className="text-left p-3 font-semibold">Notes</th>
                                  <th className="p-3 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedTask.worklogs.map(log => (
                                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="p-3 font-medium">{log.user.name || log.user.email}</td>
                                    <td className="p-3 text-muted-foreground">{new Date(log.date).toLocaleDateString()}</td>
                                    <td className="p-3 font-mono font-bold text-primary">{log.hours}h</td>
                                    <td className="p-3 text-muted-foreground text-xs">{log.notes || "-"}</td>
                                    <td className="p-3 text-right">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => showConfirm("Delete Worklog?", "Are you sure you want to delete this worklog?", () => handleDeleteWorklog(log.id))}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground italic border border-dashed rounded-xl bg-muted/5">No time logged yet.</div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4 animate-in fade-in duration-300">
                      {taskHistory.length > 0 ? (
                        <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                          {taskHistory.map(h => (
                            <div key={h.id} className="relative pl-12">
                              <div className="absolute left-0 top-0.5 w-10 h-10 rounded-full bg-background border flex items-center justify-center shadow-sm z-10 text-primary">
                                <Clock className="h-4 w-4" />
                              </div>
                              <div className="bg-muted/30 p-4 rounded-xl border">
                                <p className="text-sm">
                                  <span className="font-bold text-foreground">{h.user.name || h.user.email}</span>{" "}
                                  {h.oldStatus === "Task edited" || h.oldStatus === "Edit" ? (
                                    <>
                                      edited the task: <span className="font-mono bg-background px-1.5 py-0.5 rounded text-xs mx-1 font-bold text-primary">{h.newStatus}</span>
                                    </>
                                  ) : h.oldStatus === "Owner changed" || h.oldStatus === "Assignee changed" ? (
                                    <>
                                      {h.oldStatus.toLowerCase()}: <span className="font-mono bg-background px-1.5 py-0.5 rounded text-xs mx-1 font-bold text-primary">{h.newStatus}</span>
                                    </>
                                  ) : (
                                    <>
                                      changed status from <span className="font-mono bg-background px-1.5 py-0.5 rounded text-xs mx-1">{h.oldStatus || "Created"}</span>
                                      to <span className="font-mono bg-background px-1.5 py-0.5 rounded text-xs mx-1 font-bold text-primary">{h.newStatus}</span>
                                    </>
                                  )}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-2">{new Date(h.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <div className="text-center py-12 text-muted-foreground italic">No status changes recorded yet.</div>}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>

            {/* RIGHT: Chat & Conversation */}
            <div className="w-[440px] flex flex-col bg-muted/10 border-l">
              <div className="p-5 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-lg"><Send className="h-4 w-4 text-primary" /></div>
                  <h3 className="font-bold text-sm">Conversation</h3>
                </div>
                <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full">{taskComments.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                {taskComments.map(comment => {
                  const isMe = comment.userId === currentUser?.id;
                  return (
                    <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] font-extrabold">{comment.user.name || comment.user.email}</span>
                        <span className="text-[9px] text-muted-foreground/60">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`max-w-[95%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-background border rounded-tl-none'}`}>
                        {comment.content}
                        
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-primary-foreground/10 pt-2">
                            {comment.attachments.map(a => (
                              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className={`block overflow-hidden rounded-lg text-[10px] ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-muted/50 hover:bg-muted'}`}>
                                {a.type.startsWith("image/") && (
                                  <img src={a.url} alt={a.name} className="max-h-44 w-full object-cover" />
                                )}
                                <span className="flex items-center gap-2 p-2">
                                  <Paperclip className="h-3 w-3" />
                                  <span className="truncate">{a.name}</span>
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-5 border-t bg-background shadow-lg">
                {chatAttachments.length > 0 && (
                  <div className="mb-4 bg-muted/30 p-2 rounded-lg">
                    <AttachmentList attachments={chatAttachments} onRemove={(id) => setChatAttachments(chatAttachments.filter(a => a.id !== id))} />
                  </div>
                )}
                <form onSubmit={handlePostComment} className="flex gap-2">
                  <FileUpload onUploadComplete={(a) => setChatAttachments([...chatAttachments, a])}>
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 h-10 w-10 text-muted-foreground hover:text-primary"><Paperclip className="h-5 w-5" /></Button>
                  </FileUpload>
                  <Input placeholder="Write a message..." value={commentText} onChange={(e) => setCommentText(e.target.value)} className="flex-1 text-xs h-10 bg-muted/20 border-none focus-visible:ring-1" />
                  <Button type="submit" size="icon" className="h-10 w-10 shrink-0 shadow-md"><Send className="h-4 w-4" /></Button>
                </form>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> {confirmConfig.title}</DialogTitle></DialogHeader><div className="py-4 text-muted-foreground font-medium">{confirmConfig.message}</div><div className="flex justify-end gap-3 pt-2"><Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => { confirmConfig.onConfirm(); setConfirmOpen(false); }}>Confirm Delete</Button></div></DialogContent>
      </Dialog>
    </div>
  );
}