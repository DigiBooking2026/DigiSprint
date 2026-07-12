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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Clock, User as UserIcon, AlertCircle, FileText, Bug, Code, GripVertical, Trash2, AlertTriangle, Send, Paperclip, Edit3, Check, X, History, CalendarDays, CheckCircle2, CircleDashed, PlayCircle, Flag, ShieldAlert, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { FileUpload, AttachmentList } from "@/components/FileUpload";
import { BurndownChart, type BurndownDataPoint } from "@/components/BurndownChart";
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
  release?: { id: string, name: string } | null,
  epic?: { id: string, ticketId: string, title: string } | null,
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

export type Release = {
  id: string;
  name: string;
  description: string | null;
  releaseDate: string | null;
  status: string;
  projectId: string;
  tasks: { id: string; storyPoints: number; status: { name: string } }[];
};

type ExtendedProject = Project & {
  isPrivate?: boolean;
  tasks?: ExtendedTask[];
  statuses?: TaskStatus[];
  members?: { id: string; name: string | null; email: string }[];
  owner?: User | null;
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
  LOW: "border-[#cbd5e1] bg-[#f1f5f9] text-[#374151]",
  MEDIUM: "border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1]",
  HIGH: "border-[#fef08a] bg-[#fefce8] text-[#a16207]",
  CRITICAL: "border-[#fecaca] bg-[#fff5f5] text-[#be123c]",
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
                    color: '#374151',
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

function SprintDroppableArea({ id, children, className, isSprint }: { id: string, children: React.ReactNode, className?: string, isSprint?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: isSprint ? 'sprint' : 'backlog' } });
  return (
    <div ref={setNodeRef} className={`${className || ''} ${isOver ? 'bg-primary/5 ring-1 ring-primary/50' : ''} transition-colors min-h-[50px] flex flex-col`}>
      {children}
    </div>
  );
}

// Badge style is driven by the status colour stored in the DB (taskstatus.color).
// Text colour is chosen for contrast against that colour.
const getStatusBadgeStyle = (_statusName: string, originalColor?: string) => {
  const color = originalColor || '#64748b';
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return {
    color: luminance > 150 ? '#1e293b' : '#ffffff',
    backgroundColor: color,
    borderColor: color,
  };
};

function SprintDraggableTask({ 
  task, 
  statuses, 
  handleOpenTask,
  users = [],
  updateTaskAssignee,
  hasChildren,
  isCollapsed,
  onToggleCollapse
}: { 
  task: ExtendedTask, 
  statuses: TaskStatus[], 
  handleOpenTask: (t: ExtendedTask) => void,
  users?: User[],
  updateTaskAssignee?: (taskId: string, assigneeId: string) => Promise<void>,
  hasChildren?: boolean,
  isCollapsed?: boolean,
  onToggleCollapse?: (e: React.MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: task.id,
    data: task,
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  
  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="opacity-50 border-b last:border-0 p-2 flex items-center bg-card">Dragging {task.ticketId}...</div>;
  }

  const assigneeUser = task.assigneeId ? (users.find(u => u.id === task.assigneeId) || task.assignee) : task.assignee;
  const assigneeName = assigneeUser?.name || assigneeUser?.email || "Unassigned";

  return (
    <div ref={setNodeRef} style={style} className="flex items-center border-b last:border-0 hover:bg-muted/30 cursor-pointer bg-card group transition-colors" onClick={() => handleOpenTask(task)}>
      <div {...listeners} {...attributes} className="p-2 cursor-grab active:cursor-grabbing text-muted-foreground opacity-20 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="w-6 flex justify-center shrink-0">
        {hasChildren && (
          <div className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer" onClick={onToggleCollapse}>
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </div>
      <div className="p-2 w-24 font-mono text-xs text-muted-foreground">{task.ticketId}</div>
      <div className="p-2 flex-1 font-medium">{task.title}</div>
      <div className="p-2 w-32">
        {(() => {
          const status = statuses.find(s => s.id === task.statusId);
          const style = getStatusBadgeStyle(status?.name ?? '', status?.color ?? undefined);
          return (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border inline-block" style={style}>
              {status?.name}
            </span>
          );
        })()}
      </div>
      
      <div className="p-2 w-[160px] flex items-center gap-2 overflow-hidden">
        {assigneeUser?.avatarUrl ? (
          <img src={assigneeUser.avatarUrl} alt={assigneeName} className="h-6 w-6 rounded-full object-cover shrink-0 border" />
        ) : (
          <UserIcon className="h-6 w-6 p-1 rounded-full bg-muted text-muted-foreground shrink-0 border" />
        )}
        <span className="text-xs font-medium truncate">{assigneeName}</span>
      </div>

      <div className="p-2 w-16 text-center font-medium">{task.storyPoints}h</div>
    </div>
  );
}


export default function ProjectBoard() {
  const router = useRouter();
  const { id: projectId } = router.query;
  
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [project, setProject] = useState<ExtendedProject | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "sprints" | "releases" | "roadmap">("sprints");
  
  const [collapsedSprints, setCollapsedSprints] = useState<Record<string, boolean>>({});
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});

  const toggleSprint = (sprintId: string) => setCollapsedSprints(prev => ({ ...prev, [sprintId]: !prev[sprintId] }));
  const toggleParent = (parentId: string) => setCollapsedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));

  useEffect(() => {
    if (sprints.length > 0) {
      setCollapsedSprints(prev => {
        const newState = { ...prev };
        let hasChanges = false;
        sprints.forEach(sprint => {
          if (newState[sprint.id] === undefined) {
            newState[sprint.id] = sprint.status !== 'ACTIVE';
            hasChanges = true;
          }
        });
        return hasChanges ? newState : prev;
      });
    }
  }, [sprints]);
  const [activeSprintFilter, setActiveSprintFilter] = useState<string>("all");
  const [sprintStatusFilter, setSprintStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartStatus, setDragStartStatus] = useState<string | null>(null);
  const [lastOverStatus, setLastOverStatus] = useState<string | null>(null);

  // Task Details Modal
  const [selectedTask, setSelectedTask] = useState<ExtendedTask | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editBlockedReason, setEditBlockedReason] = useState("");
  const [editOwnerId, setEditOwnerId] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("unassigned");
  const [editEpicId, setEditEpicId] = useState<string | null>(null);
  const [editSprintId, setEditSprintId] = useState<string | null>(null);
  const [editReleaseId, setEditReleaseId] = useState<string | null>(null);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  
  // Chat state
  const [commentText, setCommentText] = useState("");
  const [chatAttachments, setChatAttachments] = useState<Attachment[]>([]);
  const [taskComments, setComments] = useState<(Comment & { user: User, attachments: Attachment[] })[]>([]);
  const [taskHistory, setTaskHistory] = useState<(TaskHistory & { user: User })[]>([]);
  
  // Worklog state
  const [worklogHours, setWorklogHours] = useState("");
  const [worklogNotes, setWorklogNotes] = useState("");

  // Burndown state
  const [showBurndownFor, setShowBurndownFor] = useState<string | null>(null);
  const [burndownData, setBurndownData] = useState<BurndownDataPoint[] | null>(null);
  const [isLoadingBurndown, setIsLoadingBurndown] = useState(false);
  const [worklogDate, setWorklogDate] = useState(new Date().toISOString().split('T')[0]);

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string, message: string, onConfirm: () => void }>({
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Project Settings State
  const [openProjectSettings, setOpenProjectSettings] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectPrefix, setEditProjectPrefix] = useState("");
  const [editProjectStartDate, setEditProjectStartDate] = useState("");
  const [editProjectDeadline, setEditProjectDeadline] = useState("");
  const [editProjectIsPrivate, setEditProjectIsPrivate] = useState(false);

  // Members Management State
  const [openMembersDialog, setOpenMembersDialog] = useState(false);
  const [projectMembers, setProjectMembers] = useState<{id: string, name: string | null, email: string}[]>([]);
  const [newMemberId, setNewMemberId] = useState("");

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editProjectName,
        prefix: editProjectPrefix,
        startDate: editProjectStartDate || null,
        deadline: editProjectDeadline || null,
        isPrivate: editProjectIsPrivate,
      }),
    });
    if (res.ok) {
      setOpenProjectSettings(false);
      fetchData();
      toast.success("Project updated successfully");
    } else {
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      toast.success("Project deleted successfully");
      router.push("/");
    } else {
      toast.error("Failed to delete project");
    }
  };

  const fetchMembers = async () => {
    const res = await fetch(`/api/projects/${projectId}/members`);
    if (res.ok) {
      setProjectMembers(await res.json());
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberId) return;
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: newMemberId }),
    });
    if (res.ok) {
      toast.success("Member added successfully");
      setNewMemberId("");
      fetchMembers();
    } else {
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Member removed successfully");
      fetchMembers();
    } else {
      toast.error("Failed to remove member");
    }
  };

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
      const [tasksRes, statusesRes, sprintsRes, usersRes, meRes, projectRes, tagsRes, releasesRes] = await Promise.all([
        fetch(`/api/tasks?projectId=${projectId}`),
        fetch(`/api/statuses?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}/sprints`),
        fetch("/api/users"),
        fetch("/api/auth/me"),
        fetch(`/api/projects/${projectId}`),
        fetch("/api/tags"),
        fetch(`/api/projects/${projectId}/releases`)
      ]);
      
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (statusesRes.ok) setStatuses(await statusesRes.json());
      if (sprintsRes.ok) setSprints(await sprintsRes.json());
      if (releasesRes.ok) setReleases(await releasesRes.json());
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
      setEditDesc(data.description || "");
      setEditType(data.type);
      setEditCategory(data.category || "");
      setEditDeadline(data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : "");
      setEditStartDate(data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "");
      setEditPriority(data.priority);
      setEditBlockedReason(data.blockedReason || "");
      setEditOwnerId(data.ownerId);
      setEditAssigneeId(data.assigneeId || "unassigned");
      setEditEpicId(data.epic?.id || null);
      setEditSprintId(data.sprint?.id || "none");
      setEditReleaseId(data.releaseId || "");
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
        type: editType,
        category: editCategory,
        deadline: editDeadline || null,
        startDate: editType === "EPIC" ? (editStartDate || null) : undefined,
        priority: editPriority,
        blockedReason: editBlockedReason || null,
        ownerId: editOwnerId,
        assigneeId: editAssigneeId === "unassigned" ? null : editAssigneeId,
        epicId: editType !== "EPIC" ? editEpicId : null,
        sprintId: editSprintId === "none" ? null : editSprintId || null,
        releaseId: editReleaseId === "none" ? null : editReleaseId || null,
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
  const [taskFormEpicId, setTaskFormEpicId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [statusId, setStatusId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [blockedReason, setBlockedReason] = useState("");
  const [type, setType] = useState("TASK");
  const [category, setCategory] = useState("General");
  const [assigneeId, setAssigneeId] = useState("unassigned");
  const [taskFormSprintId, setTaskFormSprintId] = useState<string | null>("none");
  const [taskFormReleaseId, setTaskFormReleaseId] = useState<string | null>("none");
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

  const [openReleaseForm, setOpenReleaseForm] = useState(false);
  const [releaseName, setReleaseName] = useState("");
  const [releaseDescription, setReleaseDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

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

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: releaseName, description: releaseDescription, releaseDate: releaseDate || null }),
    });
    if (res.ok) {
      setOpenReleaseForm(false);
      setReleaseName("");
      setReleaseDescription("");
      setReleaseDate("");
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
        deadline,
        startDate: type === "EPIC" ? startDate : undefined,
        assigneeId: assigneeId === "unassigned" ? null : assigneeId,
        parentId: taskFormParentId,
        epicId: type !== "EPIC" ? taskFormEpicId : null,
        blockedReason: blockedReason || null,
        sprintId: taskFormSprintId === "none" ? null : taskFormSprintId,
        releaseId: taskFormReleaseId === "none" ? null : taskFormReleaseId,
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
      setTaskFormReleaseId("none");
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

    if (viewMode === 'sprints') {
      const overData = over.data.current as { type?: string } | undefined;
      let newSprintId: string | null | undefined = undefined;
      
      if (overId.startsWith('sprint-')) {
        newSprintId = overId.replace('sprint-', '');
      } else if (overId === 'backlog') {
        newSprintId = null;
      } else if (overData?.type === 'sprint' || overData?.type === 'backlog') {
        const overTask = tasks.find(t => t.id === over.id);
        if (overTask) {
          newSprintId = overTask.sprintId;
        }
      }

      if (newSprintId !== undefined && activeTask.sprintId !== newSprintId) {
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, sprintId: newSprintId } : t));
      }
      return;
    }

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
      if (viewMode === 'sprints') {
        fetchData();
        return;
      }
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

    if (viewMode === 'sprints') {
      let newSprintId: string | null | undefined = undefined;
      const overData = over.data.current as { type?: string } | undefined;
      
      if (overId.startsWith('sprint-')) {
        newSprintId = overId.replace('sprint-', '');
      } else if (overId === 'backlog') {
        newSprintId = null;
      } else if (overData?.type === 'sprint' || overData?.type === 'backlog') {
        const overTask = tasks.find(t => t.id === over.id);
        if (overTask) newSprintId = overTask.sprintId;
      }

      if (newSprintId !== undefined) {
        await fetch(`/api/tasks/${active.id}`, {
          method: 'PATCH',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sprintId: newSprintId })
        });
        fetchData();
      } else {
        fetchData();
      }
      return;
    }

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

  const renderHierarchicalTasks = (taskList: ExtendedTask[]) => {
    // Find all tasks that are subtasks of another task in this same list
    const subtaskIds = new Set(
      taskList.filter(t => t.parentId && taskList.some(p => p.id === t.parentId)).map(t => t.id)
    );

    // Top-level tasks for this list are tasks that are not subtasks of another task in this list
    const topLevelTasks = taskList.filter(t => !subtaskIds.has(t.id));

    return topLevelTasks.map(parentTask => {
      // Find all subtasks of this parent task in this list
      const childTasks = taskList.filter(t => t.parentId === parentTask.id);

      return (
        <div key={parentTask.id} className="w-full">
          {/* Render Parent Task */}
          <SprintDraggableTask 
            task={parentTask} 
            statuses={statuses} 
            handleOpenTask={handleOpenTask} 
            users={users} 
            updateTaskAssignee={updateTaskAssignee} 
            hasChildren={childTasks.length > 0}
            isCollapsed={collapsedParents[parentTask.id]}
            onToggleCollapse={(e) => { e.stopPropagation(); toggleParent(parentTask.id); }}
          />
          
          {/* Render Child Tasks with Left Indentation */}
          {childTasks.length > 0 && !collapsedParents[parentTask.id] && (
            <div className="pl-6 border-l-2 border-dashed border-muted/50 ml-5 my-1.5 space-y-1.5">
              {childTasks.map(childTask => (
                <SprintDraggableTask 
                  key={childTask.id} 
                  task={childTask} 
                  statuses={statuses} 
                  handleOpenTask={handleOpenTask} 
                  users={users} 
                  updateTaskAssignee={updateTaskAssignee} 
                />
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{project?.name || "Project Board"}</h1>
              {project && (currentUser?.role === 'ADMIN' || currentUser?.id === project?.ownerId) && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Settings className="h-4 w-4" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditProjectName(project.name);
                      setEditProjectPrefix(project.prefix);
                      setEditProjectStartDate(project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "");
                      setEditProjectDeadline(project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : "");
                      setEditProjectIsPrivate(project.isPrivate || false);
                      setOpenProjectSettings(true);
                    }}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Project
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      fetchMembers();
                      setOpenMembersDialog(true);
                    }}>
                      <UserIcon className="h-4 w-4 mr-2" />
                      Manage Members
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => showConfirm("Delete Project", "Are you sure you want to delete this project? All tasks, sprints, and data will be permanently removed.", handleDeleteProject)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="text-muted-foreground text-sm flex items-center flex-wrap gap-2 mt-1">
              <Clock className="h-4 w-4" /> Total Story Points: <span className="font-semibold text-foreground">{totalStoryPoints} hrs</span>
              {project?.owner && (
                <span className="inline-flex items-center gap-1.5 ml-2 border px-2 py-0.5 rounded text-xs bg-muted/50 text-muted-foreground shrink-0">
                  <span className="font-semibold text-foreground">PM:</span>
                  {project.owner.avatarUrl ? (
                    <img src={project.owner.avatarUrl} alt={project.owner.name || ""} className="h-4 w-4 rounded-full object-cover border" />
                  ) : (
                    <UserIcon className="h-3 w-3" />
                  )}
                  <span className="text-foreground font-medium">{project.owner.name || project.owner.email}</span>
                </span>
              )}
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
              <Button variant={viewMode === "releases" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("releases")}>Releases</Button>
              <Button variant={viewMode === "roadmap" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("roadmap")}>Roadmap</Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const headers = ["Ticket ID", "Title", "Type", "Priority", "Status", "Story Points", "Assignee", "Deadline", "Created At"];
                const rows = tasks.map(t => [
                  t.ticketId,
                  `"${t.title.replace(/"/g, '""')}"`,
                  t.type,
                  t.priority || "MEDIUM",
                  statuses.find(s => s.id === t.statusId)?.name || "",
                  t.storyPoints,
                  users.find(u => u.id === t.assigneeId)?.email || "",
                  t.deadline ? new Date(t.deadline).toLocaleDateString() : "",
                  new Date(t.createdAt).toLocaleDateString()
                ]);
                const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `project-${project?.prefix}-tasks.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                Export CSV
              </Button>

              <Label className="cursor-pointer">
                <Input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !statuses.length) return;
                  const text = await file.text();
                  const lines = text.split("\n").filter(l => l.trim() !== "");
                  if (lines.length <= 1) return; // Only headers or empty
                  
                  const defaultStatusId = statuses[0].id;
                  let imported = 0;
                  
                  for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, '').trim());
                    if (cols.length < 2) continue; // Skip invalid rows
                    // Assume CSV: Title, Description, Type, Priority, Story Points
                    const [title, desc, type, priority, points] = cols;
                    
                    if (title) {
                      await fetch("/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title,
                          description: desc || "",
                          type: type || "TASK",
                          priority: priority || "MEDIUM",
                          storyPoints: parseFloat(points) || 0,
                          statusId: defaultStatusId,
                          projectId
                        })
                      });
                      imported++;
                    }
                  }
                  
                  alert(`Imported ${imported} tasks successfully!`);
                  e.target.value = '';
                  fetchData();
                }} />
                <Button variant="outline" size="sm" className="pointer-events-none">Import CSV</Button>
              </Label>
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
                    <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={(val) => setType(val || "TASK")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TASK">Task</SelectItem><SelectItem value="BUG">Bug</SelectItem><SelectItem value="EPIC">Epic</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={(val) => setCategory(val || "General")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Description</Label><RichTextEditor content={description} onChange={setDescription} users={users} /></div>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={(val) => setPriority(val || "MEDIUM")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="CRITICAL">Critical</SelectItem></SelectContent></Select></div>
                    {type === "EPIC" && (
                      <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    )}
                    <div className="space-y-2"><Label>Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {type !== "EPIC" && (
                      <div className="space-y-2">
                        <Label>Epic</Label>
                        <Select value={taskFormEpicId || "none"} onValueChange={(val) => setTaskFormEpicId(val === "none" ? null : val)}>
                          <SelectTrigger>
                            <span className="truncate">{taskFormEpicId === "none" || !taskFormEpicId ? "None" : (tasks.find(t => t.id === taskFormEpicId)?.title || taskFormEpicId)}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {tasks.filter(t => t.type === "EPIC").map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.ticketId} - {t.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                    <div className="space-y-2">
                      <Label>Release</Label>
                      <Select value={taskFormReleaseId || "none"} onValueChange={(val) => setTaskFormReleaseId(val === "none" ? null : val)}>
                        <SelectTrigger>
                          <span className="truncate">{taskFormReleaseId === "none" || !taskFormReleaseId ? "Unreleased" : (releases.find(r => r.id === taskFormReleaseId)?.name || taskFormReleaseId)}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unreleased</SelectItem>
                          {releases.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
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
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e) => {setActiveId(String(e.active.id)); setDragStartStatus(tasks.find(t => t.id === String(e.active.id))?.statusId || null); setLastOverStatus(null)}} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex-1 overflow-auto space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
              <div>
                <h3 className="font-bold">Sprints</h3>
                <p className="text-xs text-muted-foreground mt-1">Plan and manage your active sprints</p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={sprintStatusFilter} onValueChange={(val) => setSprintStatusFilter(val || "all")}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Status Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Sprints</SelectItem>
                    <SelectItem value="ACTIVE" className="text-xs">Active</SelectItem>
                    <SelectItem value="PLANNED" className="text-xs">Planned</SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs">Completed</SelectItem>
                  </SelectContent>
                </Select>

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
            </div>
            
            {sprints.filter(sprint => sprintStatusFilter === "all" || sprint.status === sprintStatusFilter).map(sprint => {
              const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
              const sprintDone = sprintTasks.filter(task => isDoneStatus(statuses.find(s => s.id === task.statusId)?.name || task.status?.name)).length;
              return (
                <div key={sprint.id} className="border rounded-xl bg-card overflow-hidden">
                  <div className="bg-muted/30 p-4 border-b flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSprint(sprint.id)}>
                    <div className="flex items-center gap-2">
                      {collapsedSprints[sprint.id] ? <ChevronRight className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      <div>
                        <h3 className="font-bold flex items-center gap-2">
                          {sprint.name}
                          {(() => {
                            const total = sprintTasks.length;
                            const partial = sprint.status === 'COMPLETED' && total > 0 && sprintDone < total;
                            const label = partial
                              ? `Completed partially (${sprintDone}/${total})`
                              : sprint.status === 'COMPLETED'
                                ? `Completed (${sprintDone}/${total})`
                                : sprint.status === 'ACTIVE'
                                  ? `Active (${sprintDone}/${total})`
                                  : 'Planned';
                            const bg = partial ? '#fdcb6e'
                              : sprint.status === 'COMPLETED' ? '#00b894'
                              : sprint.status === 'ACTIVE' ? '#74b9ff'
                              : '#b2bec3';
                            const fg = sprint.status === 'COMPLETED' && !partial ? '#ffffff' : '#1e293b';
                            return (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: bg, color: fg }}>
                                {label}
                              </span>
                            );
                          })()}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {sprint.startDate && new Date(sprint.startDate).toLocaleDateString()} - {sprint.endDate && new Date(sprint.endDate).toLocaleDateString()}
                          {sprint.goal && ` • Goal: ${sprint.goal}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm" onClick={e => e.stopPropagation()}>
                      <div className="text-right">
                        <span className="font-bold">{sprintTasks.length}</span> issues
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="font-bold">{sprintDone}</span> done
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="font-bold">{sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)}</span> hrs
                      </div>
                      
                      {sprint.status === "ACTIVE" && (
                        <Button variant={showBurndownFor === sprint.id ? "secondary" : "ghost"} size="sm" onClick={async () => {
                          if (showBurndownFor === sprint.id) {
                            setShowBurndownFor(null);
                          } else {
                            setShowBurndownFor(sprint.id);
                            setIsLoadingBurndown(true);
                            try {
                              const res = await fetch(`/api/projects/${projectId}/sprints/${sprint.id}/burndown`);
                              if (res.ok) setBurndownData(await res.json());
                              else setBurndownData(null);
                            } catch(e) { setBurndownData(null); }
                            setIsLoadingBurndown(false);
                          }
                        }}>
                          <CircleDashed className="h-4 w-4 mr-2" /> Burndown
                        </Button>
                      )}

                      <Button variant="outline" size="sm" onClick={async () => {
                        const newStatus = sprint.status === "PLANNED" ? "ACTIVE" : sprint.status === "ACTIVE" ? "COMPLETED" : "PLANNED";
                        await fetch(`/api/sprints/${sprint.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
                        fetchData();
                      }}>
                        {sprint.status === "PLANNED" ? "Start Sprint" : sprint.status === "ACTIVE" ? "Complete Sprint" : "Reopen Sprint"}
                      </Button>
                    </div>
                  </div>
                  {!collapsedSprints[sprint.id] && (
                    <>
                      {showBurndownFor === sprint.id && (
                        <div className="p-6 border-b bg-card">
                          <h4 className="font-bold mb-4">Sprint Burndown</h4>
                          {isLoadingBurndown ? (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
                          ) : burndownData ? (
                            <BurndownChart data={burndownData} height={300} />
                          ) : (
                            <div className="h-[300px] flex items-center justify-center text-destructive">Failed to load burndown data. Does the sprint have a start and end date?</div>
                          )}
                        </div>
                      )}
                      <div className="p-2">
                        <SprintDroppableArea id={`sprint-${sprint.id}`} isSprint>
                          <SortableContext items={sprintTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            {sprintTasks.length === 0 ? (
                              <div className="text-center py-8 text-xs text-muted-foreground italic flex-1 flex items-center justify-center">No tasks in this sprint. Drag tasks here to assign them.</div>
                            ) : (
                              renderHierarchicalTasks(sprintTasks)
                            )}
                          </SortableContext>
                        </SprintDroppableArea>
                      </div>
                    </>
                  )}
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
                <SprintDroppableArea id="backlog">
                  <SortableContext items={tasks.filter(t => !t.sprintId && !isDoneStatus(statuses.find(s => s.id === t.statusId)?.name || t.status?.name)).map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {(() => {
                      const backlogTasks = tasks.filter(t => !t.sprintId && !isDoneStatus(statuses.find(s => s.id === t.statusId)?.name || t.status?.name));
                      return backlogTasks.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground italic flex-1 flex items-center justify-center">Backlog is empty. Drag tasks here to move them out of sprints.</div>
                      ) : (
                        renderHierarchicalTasks(backlogTasks)
                      );
                    })()}
                  </SortableContext>
                </SprintDroppableArea>
              </div>
            </div>
          </div>
          <DragOverlay>{activeTask ? <div className="w-[500px] shadow-2xl opacity-80"><SprintDraggableTask task={activeTask} statuses={statuses} handleOpenTask={()=>{}} users={users} updateTaskAssignee={updateTaskAssignee} /></div> : null}</DragOverlay>
          </DndContext>
        ) : viewMode === "releases" ? (
          <div className="flex-1 overflow-auto space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
              <div>
                <h3 className="font-bold">Releases / Fix Versions</h3>
                <p className="text-xs text-muted-foreground mt-1">Manage product versions and deployments</p>
              </div>
              <Dialog open={openReleaseForm} onOpenChange={setOpenReleaseForm}>
                <DialogTrigger render={<Button variant="outline" className="gap-2"><PlusCircle className="h-4 w-4" /> Create Release</Button>} />
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>Create Release</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateRelease} className="space-y-4">
                    <div className="space-y-2"><Label>Name</Label><Input required value={releaseName} onChange={(e) => setReleaseName(e.target.value)} placeholder="e.g. v1.0.0" /></div>
                    <div className="space-y-2"><Label>Description</Label><Input value={releaseDescription} onChange={(e) => setReleaseDescription(e.target.value)} placeholder="What's in this release?" /></div>
                    <div className="space-y-2"><Label>Release Date</Label><Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} /></div>
                    <Button type="submit" className="w-full">Create Release</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {releases.map(release => {
              const releaseTasks = tasks.filter(t => t.releaseId === release.id);
              const releaseDone = releaseTasks.filter(task => isDoneStatus(statuses.find(s => s.id === task.statusId)?.name || task.status?.name)).length;
              return (
                <div key={release.id} className="border rounded-xl bg-card overflow-hidden">
                  <div className="bg-muted/30 p-4 border-b flex justify-between items-center">
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        {release.name} 
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${release.status === 'RELEASED' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}>{release.status}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {release.releaseDate && `Date: ${new Date(release.releaseDate).toLocaleDateString()}`}
                        {release.description && ` • ${release.description}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <span className="font-bold">{releaseTasks.length}</span> issues
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="font-bold">{releaseDone}</span> done
                      </div>
                      <Button variant="outline" size="sm" onClick={async () => {
                        const newStatus = release.status === "UNRELEASED" ? "RELEASED" : "UNRELEASED";
                        await fetch(`/api/releases/${release.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
                        fetchData();
                      }}>
                        {release.status === "UNRELEASED" ? "Mark Released" : "Revert to Unreleased"}
                      </Button>
                    </div>
                  </div>
                  <div className="p-2 flex flex-col gap-2">
                    {releaseTasks.length === 0 ? (
                      <div className="text-center py-4 text-xs text-muted-foreground italic">No tasks in this release.</div>
                    ) : (
                      releaseTasks.map(task => (
                        <div key={task.id} className="p-2 border rounded-md text-sm bg-background flex items-center justify-between cursor-pointer hover:border-primary" onClick={() => handleOpenTask(task)}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{task.ticketId}</span>
                            <span className="font-medium">{task.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-muted px-2 py-1 rounded">{statuses.find(s => s.id === task.statusId)?.name}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "roadmap" ? (
          <div className="bg-background rounded-lg border shadow-sm flex flex-col overflow-hidden p-6 mt-4 min-h-[500px]">
            <h2 className="text-xl font-bold mb-4">Project Roadmap</h2>
            <div className="flex-1 overflow-auto border rounded relative">
              <div className="min-w-[800px]">
                {/* Timeline Header */}
                <div className="flex border-b bg-muted/30 sticky top-0 z-10">
                  <div className="w-1/3 p-4 font-semibold border-r bg-background">Epic</div>
                  <div className="w-2/3 flex relative">
                    {/* Render a 6 month timeline */}
                    {[...Array(6)].map((_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + i);
                      return (
                        <div key={i} className="flex-1 p-2 text-center text-sm font-semibold border-r last:border-r-0">
                          {d.toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Timeline Body */}
                <div className="divide-y">
                  {tasks.filter(t => t.type === "EPIC").map(epic => {
                    const today = new Date();
                    const epicStart = epic.startDate ? new Date(epic.startDate) : new Date();
                    const epicEnd = epic.deadline ? new Date(epic.deadline) : new Date(new Date().setMonth(new Date().getMonth() + 1));
                    
                    const minDate = new Date();
                    const maxDate = new Date();
                    maxDate.setMonth(maxDate.getMonth() + 6);
                    
                    const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24);
                    const startDiff = Math.max(0, (epicStart.getTime() - minDate.getTime()) / (1000 * 3600 * 24));
                    const endDiff = Math.min(totalDays, (epicEnd.getTime() - minDate.getTime()) / (1000 * 3600 * 24));
                    
                    const leftPercent = Math.max(0, Math.min(100, (startDiff / totalDays) * 100));
                    const widthPercent = Math.max(2, Math.min(100 - leftPercent, ((endDiff - startDiff) / totalDays) * 100));

                    return (
                      <div key={epic.id} className="flex hover:bg-muted/10 group">
                        <div className="w-1/3 p-4 border-r bg-background shrink-0">
                          <div className="font-medium hover:underline cursor-pointer" onClick={() => setSelectedTask(epic)}>
                            {epic.ticketId}: {epic.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {tasks.filter(t => t.epic?.id === epic.id).length} issues
                          </div>
                        </div>
                        <div className="w-2/3 relative py-4 bg-grid-pattern">
                          <div 
                            className="absolute h-8 bg-primary rounded-full top-1/2 -translate-y-1/2 flex items-center px-4 text-xs font-semibold text-primary-foreground shadow-md cursor-pointer hover:brightness-110 transition-all overflow-hidden whitespace-nowrap"
                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                            onClick={() => setSelectedTask(epic)}
                            title={`${epic.title} (${epicStart.toLocaleDateString()} - ${epicEnd.toLocaleDateString()})`}
                          >
                            {epic.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {tasks.filter(t => t.type === "EPIC").length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No epics found. Create an Epic to visualize it on the roadmap.
                    </div>
                  )}
                </div>
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
                  {(() => {
                    const filteredTasks = tasks.filter(t => activeSprintFilter === "all" || (activeSprintFilter === "none" && !t.sprintId) || t.sprintId === activeSprintFilter);
                    
                    // Sort top-level tasks based on sortBy criteria
                    const sortedParents = filteredTasks.filter(t => !t.parentId || !filteredTasks.some(p => p.id === t.parentId)).sort((a, b) => {
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
                    });

                    const orderedTasks: { task: ExtendedTask, isSubtask: boolean }[] = [];
                    sortedParents.forEach(parent => {
                      orderedTasks.push({ task: parent, isSubtask: false });
                      const children = filteredTasks.filter(t => t.parentId === parent.id);
                      children.forEach(child => {
                        orderedTasks.push({ task: child, isSubtask: true });
                      });
                    });

                    return orderedTasks.map(({ task, isSubtask }) => {
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
                          <td className={`p-3 font-medium ${isSubtask ? 'pl-8' : ''}`}>
                            <div className="flex items-center gap-1.5">
                              {isSubtask && <span className="text-muted-foreground/50 font-mono">↳</span>}
                              <span className={isSubtask ? 'text-muted-foreground' : ''}>{task.title}</span>
                            </div>
                          </td>
                          <td className="p-3"><div className="flex items-center gap-1.5">{task.type === 'BUG' ? <Bug className="h-3 w-3 text-destructive" /> : <Code className="h-3 w-3 text-primary" />}<span className="text-xs">{task.type}</span></div></td>
                          <td className="p-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityStyles[task.priority || "MEDIUM"] || priorityStyles.MEDIUM}`}><Flag className="h-3 w-3" />{task.priority || "MEDIUM"}</span></td>
                          <td className="p-3"><div onClick={(e) => e.stopPropagation()}><Select value={task.statusId} onValueChange={(val) => updateTaskStatus(task.id, val || "")}><SelectTrigger className="h-8 text-xs w-[140px] font-semibold" style={{ backgroundColor: (currentStatus?.color || '#ccc') + '20', color: '#374151', borderLeft: `4px solid ${currentStatus?.color || '#ccc'}` }}><span className="truncate">{currentStatus?.name || "Status"}</span></SelectTrigger><SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}</SelectContent></Select></div></td>
                          <td className="p-3"><div onClick={(e) => e.stopPropagation()}><Select value={task.assigneeId || "unassigned"} onValueChange={(val) => updateTaskAssignee(task.id, val || "unassigned")}><SelectTrigger className="h-8 text-xs w-[150px]"><div className="flex items-center gap-1.5 overflow-hidden"><UserIcon className="h-3 w-3 flex-shrink-0" /><span className="truncate">{getUserDisplay(task.assigneeId, "Unassigned", task.assignee)}</span></div></SelectTrigger><SelectContent><SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id} className="text-xs">{u.name || u.email}</SelectItem>)}</SelectContent></Select></div></td>
                          <td className="p-3 text-center font-medium">{task.storyPoints}h</td>
                          <td className="p-3 text-right"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); showConfirm("Delete?", `Delete ${task.title}?`, () => deleteTask(task.id)); }}><Trash2 className="h-4 w-4" /></Button></td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
             </table>
          </div>
        )}
      </main>

      {/* Task Details Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="w-[90vw] max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-none">
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT: Task Info */}
            <div className="flex-1 p-8 overflow-y-auto bg-background">
              <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start mb-6 gap-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
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
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted pl-2.5 pr-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {selectedTask?.assignee?.avatarUrl ? (
                      <img src={selectedTask.assignee.avatarUrl} alt={selectedTask.assignee.name || ""} className="h-4.5 w-4.5 rounded-full object-cover border" />
                    ) : (
                      <UserIcon className="h-3 w-3" />
                    )}
                    <span className="text-muted-foreground font-bold">Assignee:</span>
                    {selectedTask && (
                      <Select 
                        value={selectedTask.assigneeId || "unassigned"} 
                        onValueChange={(val) => updateTaskAssignee(selectedTask.id, val || "unassigned")}
                      >
                        <SelectTrigger className="h-5 border-none bg-transparent hover:bg-muted-foreground/10 text-[10px] font-bold uppercase px-1.5 py-0 shadow-none focus:ring-0 gap-1">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="unassigned" className="text-xs font-bold">Unassigned</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id} className="text-xs font-bold">
                              {u.name || u.email}
                            </SelectItem>
                          ))}
                          {selectedTask.assignee && !users.some(u => u.id === selectedTask.assigneeId) && (
                            <SelectItem value={selectedTask.assigneeId!} className="text-xs font-bold">
                              {selectedTask.assignee.name || selectedTask.assignee.email}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
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
                <div className="flex items-center gap-2 shrink-0">
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
                  <h3 className="text-sm font-bold uppercase tracking-tight text-primary flex items-center gap-2">
                    <Edit3 className="h-4 w-4" /> Edit Task Attributes
                  </h3>
                  
                  {/* Task Title */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Task Title</Label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="font-semibold text-lg w-full" />
                  </div>

                  {/* Attribute Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-xl border border-muted-foreground/10">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Type</Label>
                      <Select value={editType} onValueChange={(val) => setEditType(val || "TASK")}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="TASK">Task</SelectItem>
                          <SelectItem value="BUG">Bug</SelectItem>
                          <SelectItem value="EPIC">Epic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Status</Label>
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
                        <SelectTrigger className="w-full">
                          <span className="truncate">{statuses.find(s => s.id === selectedTask?.statusId)?.name || "Status"}</span>
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Priority</Label>
                      <Select value={editPriority} onValueChange={(val) => setEditPriority(val || "MEDIUM")}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Story Points (hrs)</Label>
                      <Input type="number" step="0.5" value={editPoints} onChange={(e) => setEditPoints(e.target.value)} className="w-full" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Assign To</Label>
                      <Select value={editAssigneeId} onValueChange={(val) => setEditAssigneeId(val || "unassigned")}>
                        <SelectTrigger className="w-full">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              {editAssigneeId === "unassigned" 
                                ? "Unassigned" 
                                : (users.find(u => u.id === editAssigneeId)?.name || 
                                   users.find(u => u.id === editAssigneeId)?.email || 
                                   (selectedTask?.assigneeId === editAssigneeId && (selectedTask?.assignee?.name || selectedTask?.assignee?.email)) ||
                                   editAssigneeId)}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                          {selectedTask?.assignee && !users.some(u => u.id === selectedTask.assigneeId) && (
                            <SelectItem value={selectedTask.assigneeId!}>{selectedTask.assignee.name || selectedTask.assignee.email}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Owner / Creator</Label>
                      <Select value={editOwnerId} onValueChange={(val) => setEditOwnerId(val || "")}>
                        <SelectTrigger className="w-full">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              {users.find(u => u.id === editOwnerId)?.name || 
                               users.find(u => u.id === editOwnerId)?.email || 
                               (selectedTask?.ownerId === editOwnerId && (selectedTask?.owner?.name || selectedTask?.owner?.email)) ||
                               editOwnerId || "Select Owner"}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                          {selectedTask?.owner && !users.some(u => u.id === selectedTask.ownerId) && (
                            <SelectItem value={selectedTask.ownerId!}>{selectedTask.owner.name || selectedTask.owner.email}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Sprint</Label>
                      <Select value={editSprintId || "none"} onValueChange={(val) => setEditSprintId(val === "none" ? null : (val || null))}>
                        <SelectTrigger className="w-full">
                          <span className="truncate">{!editSprintId || editSprintId === "none" ? "Backlog" : (sprints.find(s => s.id === editSprintId)?.name || editSprintId)}</span>
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="none">Backlog</SelectItem>
                          {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {editType !== "EPIC" ? (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Epic</Label>
                        <Select value={editEpicId || "none"} onValueChange={(val) => setEditEpicId(val === "none" ? null : val)}>
                          <SelectTrigger className="w-full">
                            <span className="truncate">{!editEpicId || editEpicId === "none" ? "None" : (tasks.find(t => t.id === editEpicId)?.title || editEpicId)}</span>
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="none">None</SelectItem>
                            {tasks.filter(t => t.type === "EPIC" && t.id !== selectedTask?.id).map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.ticketId} - {t.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Start Date</Label>
                        <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="w-full" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Parent Task</Label>
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
                        <SelectTrigger className="w-full">
                          <span className="truncate">{selectedTask?.parent ? selectedTask.parent.title : "None"}</span>
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="none">None</SelectItem>
                          {tasks.filter(t => t.id !== selectedTask?.id && t.type !== "EPIC").map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.ticketId} - {t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Release</Label>
                      <Select value={editReleaseId || "none"} onValueChange={(val) => setEditReleaseId(val === "none" ? null : (val || null))}>
                        <SelectTrigger className="w-full">
                          <span className="truncate">{!editReleaseId || editReleaseId === "none" ? "Unreleased" : (releases.find(r => r.id === editReleaseId)?.name || editReleaseId)}</span>
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="none">Unreleased</SelectItem>
                          {releases.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Deadline</Label>
                      <Input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="w-full" />
                    </div>

                    {/blocked/i.test(selectedTask?.status?.name || "") && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Blocked Reason</Label>
                        <Input required value={editBlockedReason} onChange={(e) => setEditBlockedReason(e.target.value)} placeholder="What is blocking this task?" className="w-full" />
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Tags</Label>
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
                      <SelectTrigger className="w-[180px]"><span className="truncate">Add Tag...</span></SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="new" className="font-bold text-primary">+ Create New Tag</SelectItem>
                        {tags.filter(t => !editTagIds.includes(t.id)).map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Description</Label>
                    <RichTextEditor content={editDesc} onChange={setEditDesc} users={users} />
                  </div>

                  {/* Attachments */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Attachments</Label>
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
                      <TabsTrigger value="activity" className="gap-2"><History className="h-4 w-4" /> Activity</TabsTrigger>
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
                                      {(() => {
                                        const style = getStatusBadgeStyle(sub.status?.name ?? '', sub.status?.color ?? undefined);
                                        return (
                                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border inline-block" style={style}>
                                            {sub.status?.name}
                                          </span>
                                        );
                                      })()}
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

                    {/* The history tab has been merged into the Activity Stream on the right */}
                  </Tabs>
                </>
              )}
            </div>

            {/* RIGHT: Activity Stream */}
            <div className="w-[440px] flex flex-col bg-muted/10 border-l">
              <div className="p-5 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-lg"><History className="h-4 w-4 text-primary" /></div>
                  <h3 className="font-bold text-sm">Activity Stream</h3>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                {[
                  ...taskComments.map(c => ({ ...c, streamType: 'comment' as const, date: new Date(c.createdAt).getTime() })),
                  ...taskHistory.map(h => ({ ...h, streamType: 'history' as const, date: new Date(h.createdAt).getTime() }))
                ].sort((a: any, b: any) => a.date - b.date).map(item => {
                  if (item.streamType === 'history') {
                    const h = item as any;
                    return (
                      <div key={`hist-${h.id}`} className="relative pl-12 mb-4">
                        <div className="absolute left-0 top-0.5 w-10 h-10 rounded-full bg-background border flex items-center justify-center shadow-sm z-10 text-muted-foreground">
                          <History className="h-4 w-4" />
                        </div>
                        <div className="bg-muted/30 p-3 rounded-xl border">
                          <p className="text-xs">
                            <span className="font-bold text-foreground">{h.user.name || h.user.email}</span>{" "}
                            {h.oldStatus === "Task edited" || h.oldStatus === "Edit" ? (
                              <>edited the task: <span className="font-mono bg-background px-1 py-0.5 rounded text-[10px] mx-1 font-bold text-primary">{h.newStatus}</span></>
                            ) : h.oldStatus === "Owner changed" || h.oldStatus === "Assignee changed" ? (
                              <>{h.oldStatus.toLowerCase()}: <span className="font-mono bg-background px-1 py-0.5 rounded text-[10px] mx-1 font-bold text-primary">{h.newStatus}</span></>
                            ) : (
                              <>changed status from <span className="font-mono bg-background px-1 py-0.5 rounded text-[10px] mx-1">{h.oldStatus || "Created"}</span> to <span className="font-mono bg-background px-1 py-0.5 rounded text-[10px] mx-1 font-bold text-primary">{h.newStatus}</span></>
                            )}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-1">{new Date(h.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  }
                  
                  const comment = item as any;
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
                            {comment.attachments.map((a: any) => (
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
                  <RichTextEditor minHeight="min-h-[80px]" content={commentText} onChange={setCommentText} users={users} />
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
      {/* Edit Project Modal */}
      <Dialog open={openProjectSettings} onOpenChange={setOpenProjectSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Project Name</Label><Input required value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Prefix</Label><Input required value={editProjectPrefix} onChange={(e) => setEditProjectPrefix(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" required value={editProjectStartDate} onChange={(e) => setEditProjectStartDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Deadline</Label><Input type="date" required value={editProjectDeadline} onChange={(e) => setEditProjectDeadline(e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2 py-2">
              <input type="checkbox" id="editPrivate" className="h-4 w-4" checked={editProjectIsPrivate} onChange={(e) => setEditProjectIsPrivate(e.target.checked)} />
              <Label htmlFor="editPrivate">Private Project (Only members can view)</Label>
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members Management Modal */}
      <Dialog open={openMembersDialog} onOpenChange={setOpenMembersDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Project Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <form onSubmit={handleAddMember} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label>Add Member</Label>
                <Select value={newMemberId} onValueChange={(val) => setNewMemberId(val || "")}>
                  <SelectTrigger><SelectValue placeholder="Select a user to add" /></SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(u => !projectMembers.some(pm => pm.id === u.id))
                      .map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={!newMemberId}>Add</Button>
            </form>
            
            <div className="space-y-2 border rounded-md p-4 bg-muted/20">
              <h3 className="text-sm font-semibold mb-3">Current Members ({projectMembers.length})</h3>
              {projectMembers.length === 0 ? (
                <div className="text-xs text-muted-foreground italic text-center py-4">No members added yet.</div>
              ) : (
                <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                  {projectMembers.map(member => (
                    <li key={member.id} className="flex items-center justify-between bg-card border rounded p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{member.name || member.email}</span>
                        {member.id === project?.ownerId && <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">PM</span>}
                      </div>
                      {member.id !== project?.ownerId && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(member.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
