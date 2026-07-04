import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserCircle, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const [user, setUser] = useState<{ name: string | null, email: string, role: string, avatarUrl: string | null } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ text: string, type: "error" | "success" } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        setUser(await res.json());
      }
    } catch (e) {
      console.error("Fetch user error:", e);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (newPassword.length < 6) {
      setMessage({ text: "New password must be at least 6 characters", type: "error" });
      return;
    }

    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setMessage({ text: "Password changed successfully!", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to change password", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "An error occurred", type: "error" });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Profile picture updated!");
        const updatedUser = await res.json();
        setUser(updatedUser);
        // Force reload to update header picture instantly
        window.location.reload();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to upload avatar.");
      }
    } catch (error) {
      toast.error("An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 max-w-2xl mt-8 space-y-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>View your profile details and update your profile picture.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center sm:flex-row gap-6">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary transition-all flex items-center justify-center bg-muted">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <UploadCloud className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div className="space-y-1 text-center sm:text-left flex-1">
                <h3 className="font-bold text-lg">{user?.name || "No name set"}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-muted text-muted-foreground mt-1">{user?.role}</span>
                <p className="text-xs text-muted-foreground pt-2">Click the photo to upload a new profile picture (max 5MB).</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password. You will need your current password to proceed.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              
              {message && (
                <div className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                  {message.text}
                </div>
              )}
              
              <Button type="submit">Update Password</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
