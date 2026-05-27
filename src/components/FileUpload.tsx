"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Paperclip, X, FileText, ImageIcon, Loader2 } from "lucide-react";
import { Attachment } from "@/generated/prisma";

interface FileUploadProps {
  projectId?: string;
  taskId?: string;
  onUploadComplete: (attachment: Attachment) => void;
}

export function FileUpload({ projectId, taskId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("projectId", projectId);
    if (taskId) formData.append("taskId", taskId);

    try {
      const res = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const attachment = await res.json();
        onUploadComplete(attachment);
      }
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
        Add Attachment
      </Button>
    </div>
  );
}

export function AttachmentList({ attachments, onRemove }: { attachments: Attachment[], onRemove?: (id: string) => void }) {
  if (!attachments?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((file) => (
        <div key={file.id} className="flex items-center gap-2 p-2 bg-muted rounded-md border text-sm">
          {file.type.startsWith("image/") ? (
            <ImageIcon className="h-4 w-4 text-blue-500" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline max-w-[150px] truncate">
            {file.name}
          </a>
          {onRemove && (
            <button onClick={() => onRemove(file.id)} className="text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
