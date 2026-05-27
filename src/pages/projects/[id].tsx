"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Clock, User as UserIcon, AlertCircle, FileText, Bug, Tag, Code, GripVertical, Trash2, AlertTriangle, Send, Paperclip, Edit3, Check, X, History } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileUpload, AttachmentList } from "@/components/FileUpload";
import { Task, TaskStatus, User, Attachment, Comment, TaskHistory } from "@/generated/prisma";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ExtendedTask = Task & { 
  assignee?: User | null, 
  attachments?: Attachment[],
  comments?: (Comment & { user: User, attachments: Attachment[] })[],
  history?: (TaskHistory & { user: User })[]
};

function SortableTaskCard({ 
  task, 
  users, 
  statuses, 
  updateTaskAssignee, 
  updateTaskStatus,
  showConfirm,
  deleteTask,
  onOpenTask
}: { 
  task: ExtendedTask,
  users: User[],
  statuses: TaskStatus[],
  updateTaskAssignee: (taskId: string, newAssigneeId: string) => void,
  updateTaskStatus: (taskId: string, newStatusId: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  deleteTask: (taskId: string) => void,
  onOpenTask: (task: ExtendedTask) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentStatus = statuses.find(s => s.id === task.statusId);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card 
        className={`group hover:border-primary transition-colors cursor-pointer ${task.type === 'BUG' ? 'border-l-4 border-l-destructive shadow-sm' : ''}`}
        onClick={() => onOpenTask(task)}
      >
        <CardHeader className="p-4 pb-2 relative">
          <div className="absolute right-2 top-2 flex items-center gap-1 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                showConfirm("Delete Task?", `Are you sure you want to delete "${task.title}"?`, () => deleteTask(task.id));
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div 
              {...listeners} 
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          </div>
          <div className="flex justify-between items-start text-xs text-muted-foreground mb-1 pr-14">
            <div className="flex items-center gap-1.5">
              {task.type === 'BUG' ? (
                <Bug className="h-3 w-3 text-destructive" />
              ) : (
                <Code className="h-3 w-3 text-primary" />
              )}
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{task.ticketId}</span>
            </div>
            <span>{task.storyPoints}h</span>
          </div>
          <CardTitle className={`text-sm font-medium leading-tight ${task.type === 'BUG' ? 'text-destructive' : ''}`}>{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div 
            className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-2 prose-sm dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: task.description || "" }}
          />
          
          <div className="flex items-center gap-3 mt-auto">
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>{task.attachments.length}</span>
              </div>
            )}
            
            <div className="flex-1" />

            <div onClick={(e) => e.stopPropagation()}>
              <Select value={task.statusId} onValueChange={(val) => updateTaskStatus(task.id, val || "")}>
                <SelectTrigger 
                  className="h-6 text-[9px] w-[85px] border-0 font-semibold"
                  style={{ 
                    backgroundColor: (currentStatus?.color || '#ccc') + '25',
                    color: currentStatus?.color || '#333',
                  }}
                >
                  <span className="truncate">{currentStatus?.name || "Status"}</span>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px]">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableStatusColumn({ 
  status, 
  columnTasks, 
  users, 
  statuses, 
  updateTaskAssignee, 
  updateTaskStatus,
  showConfirm,
  deleteTask,
  onOpenTask
}: { 
  status: TaskStatus, 
  columnTasks: ExtendedTask[],
  users: User[],
  statuses: TaskStatus[],
  updateTaskAssignee: (taskId: string, newAssigneeId: string) => void,
  updateTaskStatus: (taskId: string, newStatusId: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  deleteTask: (taskId: string) => void,
  onOpenTask: (task: ExtendedTask) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `status-${status.id}`,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`min-w-[300px] w-[300px] flex flex-col bg-muted/30 rounded-xl p-3 transition-colors ${isOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''}`}
    >
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color || '#ccc' }} />
          <h3 className="font-semibold text-sm">{status.name}</h3>
        </div>
        <span className="text-[10px] font-bold bg-background/80 px-2 py-0.5 rounded-full border shadow-sm">{columnTasks.length}</span>
      </div>
      <SortableContext 
        items={columnTasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto min-h-[250px] scrollbar-none">
          {columnTasks.map(task => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              users={users} 
              statuses={statuses}
              updateTaskAssignee={updateTaskAssignee}
              updateTaskStatus={updateTaskStatus}
              showConfirm={showConfirm}
              deleteTask={deleteTask}
              onOpenTask={onOpenTask}
            />
          ))}
          {columnTasks.length === 0 && (
            <div className="flex-1 border-2 border-dashed border-muted-foreground/10 rounded-lg flex items-center justify-center p-8 text-muted-foreground/30 text-xs italic">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function ProjectBoard() {
  const router = useRouter();
  const { id: projectId } = router.query;
  
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartStatus, setDragStartStatus] = useState<string | null>(null);

  // Task Details Modal
  const [selectedTask, setSelectedTask] = useState<ExtendedTask | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editDesc, setEditDescription] = useState("");
  
  // Chat state
  const [commentText, setCommentText] = useState("");
  const [chatAttachments, setChatAttachments] = useState<Attachment[]>([]);
  const [taskComments, setComments] = useState<(Comment & { user: User, attachments: Attachment[] })[]>([]);
  const [taskHistory, setTaskHistory] = useState<(TaskHistory & { user: User })[]>([]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [tasksRes, statusesRes, usersRes, meRes] = await Promise.all([
        fetch(`/api/tasks?projectId=${projectId}`),
        fetch(`/api/statuses?projectId=${projectId}`),
        fetch("/api/users"),
        fetch("/api/auth/me")
      ]);
      
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (statusesRes.ok) setStatuses(await statusesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (meRes.ok) setCurrentUser(await meRes.json());
    } catch (error) {
      console.error("Fetch data error:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

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
        description: editDesc 
      }),
    });
    if (res.ok) {
      setIsEditing(false);
      fetchTaskDetails(selectedTask.id);
      fetchData();
    }
  };

  // Chat Logic
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

  // Creation logic ... (Keep existing form logic)
  const [openTaskForm, setOpenTaskForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [statusId, setStatusId] = useState("");
  const [type, setType] = useState("TASK");
  const [category, setCategory] = useState("General");
  const [assigneeId, setAssigneeId] = useState("unassigned");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const categories = ["UI", "Backend", "Frontend", "DevOps", "Testing", "Documentation", "Database", "General"];
  
  const [openStatus, setOpenStatus] = useState(false);
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#3b82f6");

  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/statuses?projectId=${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: statusName, color: statusColor }),
    });
    if (res.ok) {
      setOpenStatus(false);
      setStatusName("");
      fetchData();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        storyPoints,
        statusId,
        projectId,
        type,
        category,
        assigneeId: assigneeId === "unassigned" ? null : assigneeId,
        attachmentIds: attachments.map(a => a.id)
      }),
    });
    if (res.ok) {
      setOpenTaskForm(false);
      setTitle("");
      setDescription("");
      setStoryPoints("");
      setAttachments([]);
      fetchData();
    }
  };
  
  const updateTaskStatus = async (taskId: string, newStatusId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, statusId: newStatusId } : t));
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId: newStatusId }),
    });
    if (!res.ok) fetchData();
    else if (selectedTask?.id === taskId) fetchTaskDetails(taskId);
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

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = String(over.id);

    if (overId.startsWith('status-')) {
      const newStatusId = overId.replace('status-', '');
      if (activeTask.statusId !== newStatusId) {
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, statusId: newStatusId } : t));
      }
      return;
    }

    const overTask = tasks.find(t => t.id === over.id);
    if (overTask && activeTask.statusId !== overTask.statusId) {
      setTasks(prev => prev.map(t => t.id === active.id ? { ...t, statusId: overTask.statusId } : t));
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) { fetchData(); return; }

    const activeTask = tasks.find(t => t.id === active.id);
    let newStatusId: string | null = null;
    const overId = String(over.id);

    if (overId.startsWith('status-')) newStatusId = overId.replace('status-', '');
    else {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) newStatusId = overTask.statusId;
    }

    if (activeTask && newStatusId && dragStartStatus !== newStatusId) await updateTaskStatus(activeTask.id, newStatusId);
    else fetchData();
    setDragStartStatus(null);
  };

  if (!router.isReady) return null;
  const totalStoryPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Board</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4" /> Total Story Points: <span className="font-semibold text-foreground">{totalStoryPoints} hrs</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-muted p-1 rounded-lg">
              <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("kanban")}>Kanban</Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")}>List</Button>
            </div>

            <Dialog open={openStatus} onOpenChange={setOpenStatus}>
              <DialogTrigger render={<Button variant="outline" className="gap-2"><PlusCircle className="h-4 w-4" /> Add Status</Button>} />
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Add Status</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateStatus} className="space-y-4">
                  <div className="space-y-2"><Label>Name</Label><Input required value={statusName} onChange={(e) => setStatusName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Color</Label><Input type="color" className="h-10 p-1" value={statusColor} onChange={(e) => setStatusColor(e.target.value)} /></div>
                  <Button type="submit" className="w-full">Create</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={openTaskForm} onOpenChange={setOpenTaskForm}>
              <DialogTrigger render={<Button className="gap-2"><PlusCircle className="h-4 w-4" /> Create Task</Button>} />
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={(val) => setType(val || "TASK")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TASK">Task</SelectItem><SelectItem value="BUG">Bug</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={(val) => setCategory(val || "General")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Description</Label><RichTextEditor content={description} onChange={setDescription} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Points</Label><Input type="number" step="0.5" required value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Status</Label><Select required value={statusId} onValueChange={(val) => setStatusId(val || "")}><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Assign To</Label><Select value={assigneeId} onValueChange={(val) => setAssigneeId(val || "unassigned")}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Attachments</Label><FileUpload onUploadComplete={(a) => setAttachments([...attachments, a])} /><AttachmentList attachments={attachments} onRemove={(id) => setAttachments(attachments.filter(a => a.id !== id))} /></div>
                  <Button type="submit" className="w-full">Create Task</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center">Loading board...</div>
        ) : statuses.length === 0 ? (
          <div className="flex-1 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground"><p>No statuses available.</p></div>
        ) : viewMode === "kanban" ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => {setActiveId(String(e.active.id)); setDragStartStatus(tasks.find(t => t.id === String(e.active.id))?.statusId || null)}} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
              {statuses.map(status => (
                <DroppableStatusColumn key={status.id} status={status} columnTasks={tasks.filter(t => t.statusId === status.id)} users={users} statuses={statuses} updateTaskAssignee={updateTaskAssignee} updateTaskStatus={updateTaskStatus} showConfirm={showConfirm} deleteTask={deleteTask} onOpenTask={handleOpenTask} />
              ))}
            </div>
            <DragOverlay>{activeTask ? <div className="w-[280px]"><Card className={`border-l-4 ${activeTask.type === 'BUG' ? 'border-l-destructive' : 'border-l-primary'} shadow-2xl`}><CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">{activeTask.title}</CardTitle></CardHeader></Card></div> : null}</DragOverlay>
          </DndContext>
        ) : (
          <div className="flex-1 overflow-auto bg-card border rounded-xl">
             <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="text-left p-3">Ticket</th><th className="text-left p-3">Title</th><th className="text-left p-3">Type</th><th className="text-left p-3">Status</th><th className="text-left p-3">Assignee</th><th className="text-center p-3">Points</th><th className="text-right p-3">Actions</th></tr></thead>
                <tbody>
                  {tasks.map(task => {
                    const currentStatus = statuses.find(s => s.id === task.statusId);
                    return (
                      <tr key={task.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleOpenTask(task)}>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{task.ticketId}</td>
                        <td className="p-3 font-medium">{task.title}</td>
                        <td className="p-3"><div className="flex items-center gap-1.5">{task.type === 'BUG' ? <Bug className="h-3 w-3 text-destructive" /> : <Code className="h-3 w-3 text-primary" />}<span className="text-xs">{task.type}</span></div></td>
                        <td className="p-3"><div onClick={(e) => e.stopPropagation()}><Select value={task.statusId} onValueChange={(val) => updateTaskStatus(task.id, val || "")}><SelectTrigger className="h-8 text-xs w-[140px] font-semibold" style={{ backgroundColor: (currentStatus?.color || '#ccc') + '20', color: currentStatus?.color || '#333', borderLeft: `4px solid ${currentStatus?.color || '#ccc'}` }}><span className="truncate">{currentStatus?.name || "Status"}</span></SelectTrigger><SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}</SelectContent></Select></div></td>
                        <td className="p-3"><div onClick={(e) => e.stopPropagation()}><Select value={task.assigneeId || "unassigned"} onValueChange={(val) => updateTaskAssignee(task.id, val || "unassigned")}><SelectTrigger className="h-8 text-xs w-[150px]"><div className="flex items-center gap-1.5 overflow-hidden"><UserIcon className="h-3 w-3 flex-shrink-0" /><span className="truncate">{users.find(u => u.id === task.assigneeId)?.name || users.find(u => u.id === task.assigneeId)?.email || "Unassigned"}</span></div></SelectTrigger><SelectContent><SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id} className="text-xs">{u.name || u.email}</SelectItem>)}</SelectContent></Select></div></td>
                        <td className="p-3 text-center font-medium">{task.storyPoints}h</td>
                        <td className="p-3 text-right"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); showConfirm("Delete?", `Delete "${task.title}"?`, () => deleteTask(task.id)); }}><Trash2 className="h-4 w-4" /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
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
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-primary uppercase">Description</Label>
                    <RichTextEditor content={editDesc} onChange={setEditDescription} />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-extrabold mb-8 tracking-tight text-foreground">{selectedTask?.title}</h2>
                  
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="bg-muted/50 p-1 mb-6">
                      <TabsTrigger value="details" className="gap-2"><FileText className="h-4 w-4" /> Details</TabsTrigger>
                      <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-8 animate-in fade-in duration-300">
                      <div className="bg-muted/5 border rounded-xl p-6 shadow-inner">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-primary uppercase tracking-tight">
                          <FileText className="h-4 w-4" /> 
                          Task Description
                        </h3>
                        <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: selectedTask?.description || "<p className='italic text-muted-foreground'>No description provided.</p>" }} />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2 px-2 uppercase tracking-tight">
                          <Paperclip className="h-4 w-4 text-primary" /> 
                          Attachments
                        </h3>
                        {selectedTask?.attachments && selectedTask.attachments.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {selectedTask.attachments.map(a => (
                              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-4 bg-muted/20 rounded-xl hover:bg-muted/40 transition-all border hover:border-primary/30">
                                <div className="bg-background p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform"><FileText className="h-6 w-6 text-primary" /></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate">{a.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{(a.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : <div className="bg-muted/10 rounded-xl p-8 text-center border-2 border-dashed border-muted-foreground/10 text-muted-foreground text-xs italic">No files attached.</div>}
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
                                  <span className="font-bold text-foreground">{h.user.name || h.user.email}</span> changed status 
                                  from <span className="font-mono bg-background px-1.5 py-0.5 rounded text-xs mx-1">{h.oldStatus}</span> 
                                  to <span className="font-mono bg-background px-1.5 py-0.5 rounded text-xs mx-1 font-bold text-primary">{h.newStatus}</span>
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
                              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg text-[10px] truncate ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-muted/50 hover:bg-muted'}`}>
                                <Paperclip className="h-3 w-3" />
                                <span className="truncate">{a.name}</span>
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
