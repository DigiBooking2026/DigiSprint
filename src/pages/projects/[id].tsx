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
import { PlusCircle, Clock, User as UserIcon, AlertCircle, FileText, Bug, Code, GripVertical, Trash2, AlertTriangle, Send, Paperclip, Edit3, Check, X, History, CalendarDays, CheckCircle2, CircleDashed, PlayCircle, Flag, ShieldAlert } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileUpload, AttachmentList } from "@/components/FileUpload";
import { Task, TaskStatus, User, Attachment, Comment, TaskHistory, Project, Tag } from "@/generated/prisma";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  tags?: Tag[]
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

type ExtendedProject = Project & {
  tasks?: ExtendedTask[];
  statuses?: TaskStatus[];
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

function SortableTaskCard({ 
  task, 
  statuses, 
  updateTaskStatus,
  showConfirm,
  deleteTask,
  onOpenTask
}: { 
  task: ExtendedTask,
  statuses: TaskStatus[],
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
  const assigneeName = task.assignee?.name || task.assignee?.email || "Unassigned";
  const priority = task.priority || "MEDIUM";

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
                showConfirm("Delete Task?", `Are you sure you want to delete ${task.title}?`, () => deleteTask(task.id));
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
              {task.deadline && new Date(task.deadline) < new Date() && !isDoneStatus(currentStatus?.name) && (
                <span title={`Overdue: ${new Date(task.deadline).toLocaleDateString()}`}>
                  <AlertCircle className="h-3.5 w-3.5 text-destructive animate-pulse" />
                </span>
              )}
              {task.deadline && isDoneStatus(currentStatus?.name) && new Date(task.updatedAt) > new Date(task.deadline) && (
                <span title={`Done Late (Deadline: ${new Date(task.deadline).toLocaleDateString()})`}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                </span>
              )}
            </div>
            <span>{task.storyPoints}h</span>
          </div>
          <CardTitle className={`text-sm font-medium leading-tight ${task.type === 'BUG' ? 'text-destructive' : ''}`}>{task.title}</CardTitle>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityStyles[priority] || priorityStyles.MEDIUM}`}>
              <Flag className="h-3 w-3" />
              {priority}
            </span>
            {task.deadline && isDueSoon(task.deadline) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">
                <Clock className="h-3 w-3" />
                Due soon
              </span>
            )}
            {currentStatus && /blocked/i.test(currentStatus.name) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                <ShieldAlert className="h-3 w-3" />
                Blocked
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div 
            className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-2 prose-sm dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: task.description || "" }}
          />
          
          <div className="mb-3 flex flex-col gap-1 rounded-md bg-muted/40 px-2 py-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <UserIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">Assigned to: <span className="font-semibold text-foreground">{assigneeName}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <UserIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">Created by: <span className="font-semibold text-foreground">{task.owner?.name || task.owner?.email || "Unknown"}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground/70">
              <Clock className="h-3 w-3 shrink-0" />
              <span>Created on: {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

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
  statuses, 
  updateTaskStatus,
  showConfirm,
  deleteTask,
  onOpenTask
}: { 
  status: TaskStatus, 
  columnTasks: ExtendedTask[],
  statuses: TaskStatus[],
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
      className={`min-w-[300px] w-[300px] flex flex-col bg-muted/30 rounded-xl p-3 transition-colors ${isOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''}`}
    >
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color || '#ccc' }} />
          <h3 className="font-semibold text-sm">{status.name}</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
          <span className="bg-background/80 px-2 py-0.5 rounded-full border shadow-sm">{columnTasks.length} tasks</span>
          <span className="bg-background/80 px-2 py-0.5 rounded-full border shadow-sm">{columnTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)}h</span>
        </div>
      </div>
      <SortableContext 
        items={columnTasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex-1 flex flex-col gap-2.5 overflow-y-auto min-h-[250px] rounded-lg scrollbar-none">
          {columnTasks.map(task => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              statuses={statuses}
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
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [project, setProject] = useState<ExtendedProject | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "sprints">("kanban");
  const [activeSprintFilter, setActiveSprintFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartStatus, setDragStartStatus] = useState<string | null>(null);
  const [lastOverStatus, setLastOverStatus] = useState<string | null>(null);

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
  const [editSprintId, setEditSprintId] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  
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
      const [tasksRes, statusesRes, sprintsRes, usersRes, meRes, projectRes, tagsRes] = await Promise.all([
        fetch(`/api/tasks?projectId=${projectId}`),
        fetch(`/api/statuses?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}/sprints`),
        fetch("/api/users"),
        fetch("/api/auth/me"),
        fetch(`/api/projects/${projectId}`),
        fetch("/api/tags")
      ]);
      
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (statusesRes.ok) setStatuses(await statusesRes.json());
      if (sprintsRes.ok) setSprints(await sprintsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (meRes.ok) setCurrentUser(await meRes.json());
      if (projectRes.ok) setProject(await projectRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
    } catch (error) {
      console.error("Fetch data error:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setEditSprintId(data.sprintId || "");
      setEditTagIds(data.tags?.map((t: Tag) => t.id) || []);
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
        sprintId: editSprintId === "none" ? null : editSprintId || null,
        attachmentIds: selectedTask.attachments?.map(a => a.id) || [],
        tagIds: editTagIds
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
  const [taskFormParentId, setTaskFormParentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [statusId, setStatusId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [blockedReason, setBlockedReason] = useState("");
  const [type, setType] = useState("TASK");
  const [category, setCategory] = useState("General");
  const [assigneeId, setAssigneeId] = useState("unassigned");
  const [taskFormSprintId, setTaskFormSprintId] = useState<string | null>("none");
  const [taskFormTagIds, setTaskFormTagIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const categories = ["UI", "Backend", "Frontend", "DevOps", "Testing", "Documentation", "Database", "General"];
  
  const [openStatus, setOpenStatus] = useState(false);
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#3b82f6");

  const [openSprintForm, setOpenSprintForm] = useState(false);
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [sprintStartDate, setSprintStartDate] = useState("");
  const [sprintEndDate, setSprintEndDate] = useState("");

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/sprints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sprintName, goal: sprintGoal, startDate: sprintStartDate || null, endDate: sprintEndDate || null }),
    });
    if (res.ok) {
      setOpenSprintForm(false);
      setSprintName("");
      setSprintGoal("");
      setSprintStartDate("");
      setSprintEndDate("");
      fetchData();
    }
  };

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
        priority,
        blockedReason: blockedReason || null,
        deadline: deadline || null,
        assigneeId: assigneeId === "unassigned" ? null : assigneeId,
        parentId: taskFormParentId,
        sprintId: taskFormSprintId === "none" ? null : taskFormSprintId,
        attachmentIds: attachments.map(a => a.id),
        tagIds: taskFormTagIds
      }),
    });
    if (res.ok) {
      setOpenTaskForm(false);
      setTaskFormParentId(null);
      setTitle("");
      setDescription("");
      setStoryPoints("");
      setDeadline("");
      setPriority("MEDIUM");
      setBlockedReason("");
      setTaskFormSprintId("none");
      setTaskFormTagIds([]);
      setAttachments([]);
      fetchData();
      if (taskFormParentId && selectedTask?.id === taskFormParentId) {
        fetchTaskDetails(taskFormParentId);
      }
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

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, statusId: newStatusId } : t));
    
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId: newStatusId, blockedReason: reason }),
    });
    
    if (!res.ok) {
      // Revert on error
      fetchData();
    } else {
      // Sync other parts if needed
      if (selectedTask?.id === taskId) fetchTaskDetails(taskId);
      // We don't call fetchData() here to avoid flicker since we already did optimistic update
      // But we might want to refresh to get updated history etc.
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

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = String(over.id);

    if (overId.startsWith('status-')) {
      const newStatusId = overId.replace('status-', '');
      setLastOverStatus(newStatusId);
      if (activeTask.statusId !== newStatusId) {
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, statusId: newStatusId } : t));
      }
      return;
    }

    const overTask = tasks.find(t => t.id === over.id);
    if (overTask && activeTask.statusId !== overTask.statusId) {
      setLastOverStatus(overTask.statusId);
      setTasks(prev => prev.map(t => t.id === active.id ? { ...t, statusId: overTask.statusId } : t));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) {
      const activeTask = tasks.find(t => t.id === String(active.id));
      const fallbackStatus = lastOverStatus || activeTask?.statusId || null;
      if (fallbackStatus && dragStartStatus !== fallbackStatus) {
        await updateTaskStatus(String(active.id), fallbackStatus);
      } else {
        fetchData();
      }
      setDragStartStatus(null);
      setLastOverStatus(null);
      return; 
    }

    const overId = String(over.id);
    let newStatusId: string | null = null;

    if (overId.startsWith('status-')) {
      newStatusId = overId.replace('status-', '');
    } else {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) newStatusId = overTask.statusId;
    }

    if (newStatusId && dragStartStatus !== newStatusId) {
      await updateTaskStatus(String(active.id), newStatusId);
    } else {
      // Re-sort within same column or if dropped on same column
      fetchData();
    }
    
    setDragStartStatus(null);
    setLastOverStatus(null);
  };

  if (!router.isReady) return null;
  const getUserDisplay = (userId?: string | null, fallback = "Unassigned", fallbackUser?: User | null) => {
    const user = users.find(u => u.id === userId) || fallbackUser;
    return user?.name || user?.email || fallback;
  };
  const selectedAssigneeLabel = assigneeId === "unassigned" ? "Unassigned" : getUserDisplay(assigneeId);
  const selectedOwnerLabel = getUserDisplay(editOwnerId, "Select owner");
  const totalStoryPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const doneTasks = tasks.filter(task => isDoneStatus(statuses.find(s => s.id === task.statusId)?.name || task.status?.name)).length;
  const notStartedTasks = tasks.filter(task => isNotStartedStatus(statuses.find(s => s.id === task.statusId)?.name || task.status?.name)).length;
  const inProgressTasks = Math.max(tasks.length - doneTasks - notStartedTasks, 0);
  const overdueTasks = tasks.filter(task => !isDoneStatus(statuses.find(s => s.id === task.statusId)?.name || task.status?.name) && isPastDate(task.deadline)).length;
  const dueSoonTasks = tasks.filter(task => !isDoneStatus(statuses.find(s => s.id === task.statusId)?.name || task.status?.name) && isDueSoon(task.deadline)).length;
  const blockedTasks = tasks.filter(task => /blocked/i.test(statuses.find(s => s.id === task.statusId)?.name || task.status?.name || "")).length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const projectIsOverdue = isPastDate(project?.deadline) && doneTasks !== tasks.length;
  const projectHealth = overdueTasks > 0 || blockedTasks > 0 || projectIsOverdue
    ? "Critical"
    : dueSoonTasks > 0 || progress < 50
      ? "Warning"
      : "Healthy";
  const projectHealthReason = projectIsOverdue
    ? "Project deadline passed"
    : overdueTasks > 0
      ? `${overdueTasks} open task${overdueTasks === 1 ? "" : "s"} late`
      : blockedTasks > 0
        ? `${blockedTasks} blocked task${blockedTasks === 1 ? "" : "s"}`
        : dueSoonTasks > 0
          ? `${dueSoonTasks} task${dueSoonTasks === 1 ? "" : "s"} due soon`
          : progress < 50
            ? `Progress under 50% (${progress}%)`
            : "No active risk";
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const weeklyTouchedTasks = tasks.filter(task => new Date(task.updatedAt) >= weekStart);
  const assigneeWork = users
    .map(user => {
      const assigned = tasks.filter(task => task.assigneeId === user.id);
      const active = assigned.filter(task => !isDoneStatus(statuses.find(s => s.id === task.statusId)?.name || task.status?.name));
      return {
        user,
        active: active.length,
        done: assigned.length - active.length,
        hours: active.reduce((sum, task) => sum + (task.storyPoints || 0), 0),
        overdue: active.filter(task => isPastDate(task.deadline)).length,
      };
    })
    .filter(item => item.active > 0 || item.done > 0)
    .sort((a, b) => b.active - a.active || b.hours - a.hours)
    .slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project?.name || "Project Board"}</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4" /> Total Story Points: <span className="font-semibold text-foreground">{totalStoryPoints} hrs</span>
              {projectIsOverdue && (
                <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  Project overdue
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {(viewMode === "kanban" || viewMode === "list") && sprints.length > 0 && (
              <Select value={activeSprintFilter} onValueChange={(v) => setActiveSprintFilter(v || "all")}>
                <SelectTrigger className="h-9 w-[180px]">
                  <span className="truncate">{activeSprintFilter === "all" ? "All Sprints" : activeSprintFilter === "none" ? "Backlog (No Sprint)" : sprints.find(s => s.id === activeSprintFilter)?.name + (sprints.find(s => s.id === activeSprintFilter)?.status === 'ACTIVE' ? ' (Active)' : '')}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sprints</SelectItem>
                  <SelectItem value="none">Backlog (No Sprint)</SelectItem>
                  {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name} {s.status === 'ACTIVE' && '(Active)'}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {viewMode === "list" && (
              <Select value={sortBy} onValueChange={(v) => setSortBy(v || "created_desc")}>
                <SelectTrigger className="h-9 w-[160px]">
                  <span className="truncate">{sortBy === "created_desc" ? "Newest First" : sortBy === "deadline_asc" ? "Deadline" : sortBy === "priority_desc" ? "Priority" : "Story Points"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">Newest First</SelectItem>
                  <SelectItem value="deadline_asc">Deadline</SelectItem>
                  <SelectItem value="priority_desc">Priority</SelectItem>
                  <SelectItem value="points_desc">Story Points</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="flex bg-muted p-1 rounded-lg">
              <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("kanban")}>Kanban</Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")}>List</Button>
              <Button variant={viewMode === "sprints" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("sprints")}>Sprints</Button>
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

            <Dialog open={openTaskForm} onOpenChange={(open) => {
              if (!open) setTaskFormParentId(null);
              setOpenTaskForm(open);
            }}>
              <DialogTrigger render={<Button className="gap-2"><PlusCircle className="h-4 w-4" /> Create Task</Button>} />
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Task {taskFormParentId ? "(Subtask)" : ""}</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={(val) => setType(val || "TASK")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TASK">Task</SelectItem><SelectItem value="BUG">Bug</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={(val) => setCategory(val || "General")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Description</Label><RichTextEditor content={description} onChange={setDescription} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Points</Label><Input type="number" step="0.5" required value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} /></div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select required value={statusId} onValueChange={(val) => setStatusId(val || "")}>
                        <SelectTrigger>
                          <span className="truncate">{statusId ? (statuses.find(s => s.id === statusId)?.name || statusId) : "Select status"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={(val) => setPriority(val || "MEDIUM")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="CRITICAL">Critical</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Parent Task</Label>
                      <Select value={taskFormParentId || "none"} onValueChange={(val) => setTaskFormParentId(val === "none" ? null : val)}>
                        <SelectTrigger>
                          <span className="truncate">{taskFormParentId === "none" || !taskFormParentId ? "None" : (tasks.find(t => t.id === taskFormParentId)?.title || taskFormParentId)}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {tasks.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.ticketId} - {t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sprint</Label>
                      <Select value={taskFormSprintId || "none"} onValueChange={(val) => setTaskFormSprintId(val === "none" ? null : val)}>
                        <SelectTrigger>
                          <span className="truncate">{taskFormSprintId === "none" || !taskFormSprintId ? "Backlog" : (sprints.find(s => s.id === taskFormSprintId)?.name || taskFormSprintId)}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Backlog</SelectItem>
                          {sprints.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/blocked/i.test(statuses.find(s => s.id === statusId)?.name || "") && (
                    <div className="space-y-2">
                      <Label>Blocked Reason</Label>
                      <Input required value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} placeholder="What is blocking this task?" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Assign To</Label><Select value={assigneeId} onValueChange={(val) => setAssigneeId(val || "unassigned")}><SelectTrigger><div className="flex min-w-0 items-center gap-1.5"><UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{selectedAssigneeLabel}</span></div></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {tags.filter(t => taskFormTagIds.includes(t.id)).map(t => (
                          <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full border bg-muted font-semibold">{t.name}</span>
                        ))}
                      </div>
                      <Select onValueChange={(val) => {
                        const strVal = String(val);
                        if (strVal === "new") {
                          const name = window.prompt("New tag name:");
                          if (name) fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).then(res => res.json()).then(t => { setTags([...tags, t]); setTaskFormTagIds([...taskFormTagIds, t.id]); });
                        } else if (val) {
                          setTaskFormTagIds(prev => prev.includes(strVal) ? prev.filter(id => id !== strVal) : [...prev, strVal]);
                        }
                      }}>
                        <SelectTrigger><span className="truncate">Select Tags...</span></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new" className="font-bold text-primary">+ Create New Tag</SelectItem>
                          {tags.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={taskFormTagIds.includes(t.id)} readOnly className="pointer-events-none" />
                                {t.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Attachments</Label><FileUpload onUploadComplete={(a) => setAttachments([...attachments, a])} /><AttachmentList attachments={attachments} onRemove={(id) => setAttachments(attachments.filter(a => a.id !== id))} /></div>
                  <Button type="submit" className="w-full">Create Task</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <div className={`rounded-lg border p-4 ${projectHealth === "Healthy" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : projectHealth === "Warning" ? "border-amber-500/30 bg-amber-500/10 text-amber-600" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
            <div className="flex items-center justify-between text-xs">
              <span>Health</span>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="mt-2 text-xl font-bold">{projectHealth}</div>
            <p className="mt-1 text-xs opacity-80">{projectHealthReason}; {blockedTasks} blocked, {dueSoonTasks} due soon</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">{progress}%</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Not Started</span>
              <CircleDashed className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-bold">{notStartedTasks}</div>
            <p className="mt-1 text-xs text-muted-foreground">tasks waiting</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>In Progress</span>
              <PlayCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">{inProgressTasks}</div>
            <p className="mt-1 text-xs text-muted-foreground">active tasks</p>
          </div>
          <div className={`rounded-lg border p-4 ${overdueTasks > 0 || projectIsOverdue ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-card'}`}>
            <div className="flex items-center justify-between text-xs">
              <span>Overdue</span>
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-bold">{overdueTasks}</div>
            <p className="mt-1 text-xs opacity-80">late open tasks</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>This Week</span>
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-bold">{weeklyTouchedTasks.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">tasks updated</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Deadline</span>
              <Clock className="h-4 w-4" />
            </div>
            <div className="mt-2 text-sm font-bold">{project?.deadline ? new Date(project.deadline).toLocaleDateString() : "Not set"}</div>
            <p className="mt-1 text-xs text-muted-foreground">{project?.startDate ? `Started ${new Date(project.startDate).toLocaleDateString()}` : "No start date"}</p>
          </div>
        </div>

        {assigneeWork.length > 0 && (
          <div className="mb-6 rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Developer workload</h2>
              <span className="text-xs text-muted-foreground">Open work and overdue tasks by assignee</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {assigneeWork.map(item => (
                <div key={item.user.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.user.name || item.user.email}</p>
                      <p className="text-xs text-muted-foreground">{item.hours}h open estimate</p>
                    </div>
                    {item.overdue > 0 && <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive">{item.overdue} late</span>}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded bg-muted px-2 py-1"><span className="font-bold">{item.active}</span> active</div>
                    <div className="rounded bg-muted px-2 py-1"><span className="font-bold">{item.done}</span> done</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex justify-center items-center">Loading board...</div>
        ) : statuses.length === 0 ? (
          <div className="flex-1 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground"><p>No statuses available.</p></div>
        ) : viewMode === "sprints" ? (
          <div className="flex-1 overflow-auto space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
              <div>
                <h3 className="font-bold">Sprints</h3>
                <p className="text-xs text-muted-foreground mt-1">Plan and manage your active sprints</p>
              </div>
              <Dialog open={openSprintForm} onOpenChange={setOpenSprintForm}>
                <DialogTrigger render={<Button variant="outline" className="gap-2"><PlusCircle className="h-4 w-4" /> Create Sprint</Button>} />
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>Create Sprint</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateSprint} className="space-y-4">
                    <div className="space-y-2"><Label>Name</Label><Input required value={sprintName} onChange={(e) => setSprintName(e.target.value)} placeholder="e.g. Sprint 1" /></div>
                    <div className="space-y-2"><Label>Goal</Label><Input value={sprintGoal} onChange={(e) => setSprintGoal(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={sprintStartDate} onChange={(e) => setSprintStartDate(e.target.value)} /></div>
                      <div className="space-y-2"><Label>End Date</Label><Input type="date" value={sprintEndDate} onChange={(e) => setSprintEndDate(e.target.value)} /></div>
                    </div>
                    <Button type="submit" className="w-full">Create Sprint</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {sprints.map(sprint => {
              const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
              const sprintDone = sprintTasks.filter(task => isDoneStatus(statuses.find(s => s.id === task.statusId)?.name || task.status?.name)).length;
              return (
                <div key={sprint.id} className="border rounded-xl bg-card overflow-hidden">
                  <div className="bg-muted/30 p-4 border-b flex justify-between items-center">
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        {sprint.name} 
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sprint.status === 'ACTIVE' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}>{sprint.status}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sprint.startDate && new Date(sprint.startDate).toLocaleDateString()} - {sprint.endDate && new Date(sprint.endDate).toLocaleDateString()}
                        {sprint.goal && ` • Goal: ${sprint.goal}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <span className="font-bold">{sprintTasks.length}</span> issues
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="font-bold">{sprintDone}</span> done
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="font-bold">{sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)}</span> hrs
                      </div>
                      <Button variant="outline" size="sm" onClick={async () => {
                        const newStatus = sprint.status === "PLANNED" ? "ACTIVE" : sprint.status === "ACTIVE" ? "COMPLETED" : "PLANNED";
                        await fetch(`/api/sprints/${sprint.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
                        fetchData();
                      }}>
                        {sprint.status === "PLANNED" ? "Start Sprint" : sprint.status === "ACTIVE" ? "Complete Sprint" : "Reopen Sprint"}
                      </Button>
                    </div>
                  </div>
                  <div className="p-2">
                    {sprintTasks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground italic">No tasks in this sprint. Edit tasks to assign them here.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {sprintTasks.map(task => (
                            <tr key={task.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => handleOpenTask(task)}>
                              <td className="p-2 w-24 font-mono text-xs text-muted-foreground">{task.ticketId}</td>
                              <td className="p-2 font-medium">{task.title}</td>
                              <td className="p-2 w-32"><span className="text-[10px] font-bold uppercase" style={{ color: statuses.find(s => s.id === task.statusId)?.color || '#888' }}>{statuses.find(s => s.id === task.statusId)?.name}</span></td>
                              <td className="p-2 w-16 text-center font-medium">{task.storyPoints}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })}
            
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="bg-muted/30 p-4 border-b">
                <h3 className="font-bold">Backlog</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {tasks.filter(t => !t.sprintId && !isDoneStatus(statuses.find(s => s.id === t.statusId)?.name || t.status?.name)).length} open tasks
                  <span className="mx-2">•</span>
                  {tasks.filter(t => !t.sprintId && !isDoneStatus(statuses.find(s => s.id === t.statusId)?.name || t.status?.name)).reduce((sum, t) => sum + (t.storyPoints || 0), 0)} hrs
                </p>
              </div>
              <div className="p-2">
                {tasks.filter(t => !t.sprintId && !isDoneStatus(statuses.find(s => s.id === t.statusId)?.name || t.status?.name)).length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground italic">Backlog is empty.</div>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {tasks.filter(t => !t.sprintId && !isDoneStatus(statuses.find(s => s.id === t.statusId)?.name || t.status?.name)).map(task => (
                        <tr key={task.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => handleOpenTask(task)}>
                          <td className="p-2 w-24 font-mono text-xs text-muted-foreground">{task.ticketId}</td>
                          <td className="p-2 font-medium">{task.title}</td>
                          <td className="p-2 w-32"><span className="text-[10px] font-bold uppercase" style={{ color: statuses.find(s => s.id === task.statusId)?.color || '#888' }}>{statuses.find(s => s.id === task.statusId)?.name}</span></td>
                          <td className="p-2 w-16 text-center font-medium">{task.storyPoints}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : viewMode === "kanban" ? (
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e) => {setActiveId(String(e.active.id)); setDragStartStatus(tasks.find(t => t.id === String(e.active.id))?.statusId || null); setLastOverStatus(null)}} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
              {statuses.map(status => (
                <DroppableStatusColumn key={status.id} status={status} columnTasks={tasks.filter(t => t.statusId === status.id && (activeSprintFilter === "all" || (activeSprintFilter === "none" && !t.sprintId) || t.sprintId === activeSprintFilter))} statuses={statuses} updateTaskStatus={updateTaskStatus} showConfirm={showConfirm} deleteTask={deleteTask} onOpenTask={handleOpenTask} />
              ))}
            </div>
            <DragOverlay>{activeTask ? <div className="w-[280px]"><Card className={`border-l-4 ${activeTask.type === 'BUG' ? 'border-l-destructive' : 'border-l-primary'} shadow-2xl`}><CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">{activeTask.title}</CardTitle></CardHeader></Card></div> : null}</DragOverlay>
          </DndContext>
        ) : (
          <div className="flex-1 overflow-auto bg-card border rounded-xl">
             <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="text-left p-3">Ticket</th><th className="text-left p-3">Title</th><th className="text-left p-3">Type</th><th className="text-left p-3">Priority</th><th className="text-left p-3">Status</th><th className="text-left p-3">Assignee</th><th className="text-center p-3">Points</th><th className="text-right p-3">Actions</th></tr></thead>
                <tbody>
                  {tasks.filter(t => activeSprintFilter === "all" || (activeSprintFilter === "none" && !t.sprintId) || t.sprintId === activeSprintFilter).sort((a, b) => {
                    if (sortBy === "deadline_asc") {
                      if (!a.deadline) return 1;
                      if (!b.deadline) return -1;
                      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                    }
                    if (sortBy === "priority_desc") {
                      const pOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                      return (pOrder[b.priority || "MEDIUM"] || 0) - (pOrder[a.priority || "MEDIUM"] || 0);
                    }
                    if (sortBy === "points_desc") {
                      return (b.storyPoints || 0) - (a.storyPoints || 0);
                    }
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  }).map(task => {
                    const currentStatus = statuses.find(s => s.id === task.statusId);
                    return (
                      <tr key={task.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleOpenTask(task)}>
                        <td className="p-3 font-mono text-xs text-muted-foreground flex items-center gap-2">
                          {task.ticketId}
                          {task.deadline && new Date(task.deadline) < new Date() && !isDoneStatus(currentStatus?.name) && (
                            <span title={`Overdue: ${new Date(task.deadline).toLocaleDateString()}`}>
                              <AlertCircle className="h-3.5 w-3.5 text-destructive animate-pulse" />
                            </span>
                          )}
                          {task.deadline && isDoneStatus(currentStatus?.name) && new Date(task.updatedAt) > new Date(task.deadline) && (
                            <span title={`Done Late (Deadline: ${new Date(task.deadline).toLocaleDateString()})`}>
                              <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                          {task.deadline && isDueSoon(task.deadline) && !isDoneStatus(currentStatus?.name) && (
                            <span title={`Due soon: ${new Date(task.deadline).toLocaleDateString()}`}>
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium">{task.title}</td>
                        <td className="p-3"><div className="flex items-center gap-1.5">{task.type === 'BUG' ? <Bug className="h-3 w-3 text-destructive" /> : <Code className="h-3 w-3 text-primary" />}<span className="text-xs">{task.type}</span></div></td>
                        <td className="p-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityStyles[task.priority || "MEDIUM"] || priorityStyles.MEDIUM}`}><Flag className="h-3 w-3" />{task.priority || "MEDIUM"}</span></td>
                        <td className="p-3"><div onClick={(e) => e.stopPropagation()}><Select value={task.statusId} onValueChange={(val) => updateTaskStatus(task.id, val || "")}><SelectTrigger className="h-8 text-xs w-[140px] font-semibold" style={{ backgroundColor: (currentStatus?.color || '#ccc') + '20', color: currentStatus?.color || '#333', borderLeft: `4px solid ${currentStatus?.color || '#ccc'}` }}><span className="truncate">{currentStatus?.name || "Status"}</span></SelectTrigger><SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}</SelectContent></Select></div></td>
                        <td className="p-3"><div onClick={(e) => e.stopPropagation()}><Select value={task.assigneeId || "unassigned"} onValueChange={(val) => updateTaskAssignee(task.id, val || "unassigned")}><SelectTrigger className="h-8 text-xs w-[150px]"><div className="flex items-center gap-1.5 overflow-hidden"><UserIcon className="h-3 w-3 flex-shrink-0" /><span className="truncate">{getUserDisplay(task.assigneeId, "Unassigned", task.assignee)}</span></div></SelectTrigger><SelectContent><SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id} className="text-xs">{u.name || u.email}</SelectItem>)}</SelectContent></Select></div></td>
                        <td className="p-3 text-center font-medium">{task.storyPoints}h</td>
                        <td className="p-3 text-right"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); showConfirm("Delete?", `Delete ${task.title}?`, () => deleteTask(task.id)); }}><Trash2 className="h-4 w-4" /></Button></td>
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
                  {selectedTask?.tags?.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: t.color ? `${t.color}20` : undefined, borderColor: t.color ? `${t.color}40` : undefined, color: t.color || undefined }}>
                      {t.name}
                    </span>
                  ))}
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
                          {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-primary uppercase">Parent Task</Label>
                      <Select 
                        value={selectedTask?.parent?.id || "none"} 
                        onValueChange={async (val) => {
                          if (!selectedTask) return;
                          const newParentId = val === "none" ? null : val;
                          await fetch(`/api/tasks/${selectedTask.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ parentId: newParentId === null ? "" : newParentId })
                          });
                          fetchTaskDetails(selectedTask.id);
                          fetchData();
                        }}
                      >
                        <SelectTrigger>
                          <span className="truncate">{selectedTask?.parent ? selectedTask.parent.title : "None"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {tasks.filter(t => t.id !== selectedTask?.id).map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.ticketId} - {t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-primary uppercase">Sprint</Label>
                      <Select value={editSprintId || "none"} onValueChange={(val) => setEditSprintId(val === "none" ? "" : (val || ""))}>
                        <SelectTrigger>
                          <span className="truncate">{!editSprintId || editSprintId === "none" ? "Backlog" : (sprints.find(s => s.id === editSprintId)?.name || editSprintId)}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Backlog</SelectItem>
                          {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-primary uppercase">Tags</Label>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {tags.filter(t => editTagIds.includes(t.id)).map(t => (
                          <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full border bg-muted font-semibold flex items-center gap-1">
                            {t.name}
                            <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setEditTagIds(prev => prev.filter(id => id !== t.id))} />
                          </span>
                        ))}
                      </div>
                      <Select onValueChange={(val) => {
                        const strVal = String(val);
                        if (strVal === "new") {
                          const name = window.prompt("New tag name:");
                          if (name) fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).then(res => res.json()).then(t => { setTags([...tags, t]); setEditTagIds([...editTagIds, t.id]); });
                        } else if (val && !editTagIds.includes(strVal)) {
                          setEditTagIds([...editTagIds, strVal]);
                        }
                      }}>
                        <SelectTrigger><span className="truncate">Add Tag...</span></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new" className="font-bold text-primary">+ Create New Tag</SelectItem>
                          {tags.filter(t => !editTagIds.includes(t.id)).map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                      
                      {(selectedTask?.parent || (selectedTask?.subtasks && selectedTask.subtasks.length > 0) || (selectedTask?.sourceLinks && selectedTask.sourceLinks.length > 0) || (selectedTask?.targetLinks && selectedTask.targetLinks.length > 0)) && (
                        <div className="bg-muted/5 border rounded-xl p-6 shadow-inner space-y-6">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-tight">
                              <Code className="h-4 w-4" /> 
                              Relations
                            </h3>
                            <div className="flex gap-2">
                              <Select onValueChange={async (targetId) => {
                                if (targetId === selectedTask.id) return;
                                await fetch(`/api/tasks/${selectedTask.id}/links`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ targetId, type: "BLOCKS" })
                                });
                                fetchTaskDetails(selectedTask.id);
                              }}>
                                <SelectTrigger className="h-7 w-[120px] text-[10px]">
                                  <PlusCircle className="h-3 w-3 mr-1" /> Link Task
                                </SelectTrigger>
                                <SelectContent>
                                  {tasks.filter(t => t.id !== selectedTask.id).map(t => (
                                    <SelectItem key={t.id} value={t.id} className="text-[10px]">{t.ticketId} - {t.title}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => { setTaskFormParentId(selectedTask.id); setOpenTaskForm(true); }}>
                                <PlusCircle className="h-3 w-3 mr-1" /> Add Subtask
                              </Button>
                            </div>
                          </div>
                          
                          {selectedTask?.parent && (
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Parent Task</p>
                              <div 
                                className="flex items-center justify-between p-2 rounded-md border bg-background hover:border-primary cursor-pointer transition-colors"
                                onClick={() => handleOpenTask(tasks.find(t => t.id === selectedTask.parent!.id) as ExtendedTask)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{selectedTask.parent.ticketId}</span>
                                  <span className="text-xs font-medium">{selectedTask.parent.title}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedTask?.subtasks && selectedTask.subtasks.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Subtasks</p>
                              <div className="space-y-2">
                                {selectedTask.subtasks.map(sub => (
                                  <div 
                                    key={sub.id} 
                                    className="flex items-center justify-between p-2 rounded-md border bg-background hover:border-primary transition-colors group"
                                  >
                                    <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => handleOpenTask(tasks.find(t => t.id === sub.id) as ExtendedTask)}>
                                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{sub.ticketId}</span>
                                      <span className="text-xs font-medium">{sub.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold uppercase" style={{ color: sub.status?.color || '#888' }}>{sub.status?.name}</span>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={async (e) => {
                                        e.stopPropagation();
                                        await fetch(`/api/tasks/${sub.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parentId: "" }) });
                                        fetchTaskDetails(selectedTask.id);
                                        fetchData();
                                      }}>
                                        <X className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {((selectedTask?.sourceLinks && selectedTask.sourceLinks.length > 0) || (selectedTask?.targetLinks && selectedTask.targetLinks.length > 0)) && (
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Links</p>
                              <div className="space-y-2">
                                {selectedTask?.sourceLinks?.map(link => (
                                  <div key={`${link.type}-${link.target.id}`} className="flex items-center gap-2 text-xs border rounded p-2 bg-background group">
                                    <span className="font-bold text-muted-foreground uppercase">{link.type}</span>
                                    <span className="font-mono bg-muted px-1 py-0.5 rounded text-[10px] cursor-pointer hover:underline" onClick={() => handleOpenTask(tasks.find(t => t.id === link.target.id) as ExtendedTask)}>{link.target.ticketId}</span>
                                    <span className="truncate flex-1">{link.target.title}</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={async () => {
                                      await fetch(`/api/tasks/${selectedTask.id}/links`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: link.target.id, type: link.type }) });
                                      fetchTaskDetails(selectedTask.id);
                                    }}>
                                      <X className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                                {selectedTask?.targetLinks?.map(link => (
                                  <div key={`${link.type}-${link.source.id}`} className="flex items-center gap-2 text-xs border rounded p-2 bg-background group">
                                    <span className="font-bold text-muted-foreground uppercase">IS {link.type} BY</span>
                                    <span className="font-mono bg-muted px-1 py-0.5 rounded text-[10px] cursor-pointer hover:underline" onClick={() => handleOpenTask(tasks.find(t => t.id === link.source.id) as ExtendedTask)}>{link.source.ticketId}</span>
                                    <span className="truncate flex-1">{link.source.title}</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={async () => {
                                      await fetch(`/api/tasks/${link.source.id}/links`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: selectedTask.id, type: link.type }) });
                                      fetchTaskDetails(selectedTask.id);
                                    }}>
                                      <X className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

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
                      <div className={`max-w-[95%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none prose-invert' : 'bg-background border rounded-tl-none'}`}>
                        <div className={`prose prose-sm max-w-none ${isMe ? '*:text-primary-foreground' : ''}`} dangerouslySetInnerHTML={{ __html: comment.content }} />
                        
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
                <form onSubmit={handlePostComment} className="flex flex-col gap-2">
                  <RichTextEditor minHeight="min-h-[80px]" content={commentText} onChange={setCommentText} />
                  <div className="flex items-center justify-between">
                    <FileUpload onUploadComplete={(a) => setChatAttachments([...chatAttachments, a])}>
                      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-2"><Paperclip className="h-4 w-4" /> Add file</Button>
                    </FileUpload>
                    <Button type="submit" size="sm" className="gap-2 shadow-md"><Send className="h-4 w-4" /> Send</Button>
                  </div>
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
