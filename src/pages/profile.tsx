import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ text: string, type: "error" | "success" } | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 max-w-2xl mt-8">
        <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>
        
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
