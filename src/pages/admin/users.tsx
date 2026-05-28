"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, UserCog, AlertTriangle, Power, PowerOff } from "lucide-react";
import { User } from "@/generated/prisma";

type AdminUser = User & { isActive: boolean };

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string, email: string } | null>(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [userToUpdateStatus, setUserToUpdateStatus] = useState<{ id: string, email: string, isActive: boolean } | null>(null);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetch("/api/admin/users"), fetch("/api/auth/me")])
      .then(async ([usersRes, meRes]) => {
        if (!isMounted) return;
        if (usersRes.ok) setUsers(await usersRes.json());
        if (meRes.ok) {
          const me = await meRes.json();
          setCurrentUserId(me.id);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateRole = async (userId: string, role: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) fetchUsers();
  };

  const openStatusConfirmation = (user: AdminUser) => {
    setUserToUpdateStatus({ id: user.id, email: user.email, isActive: user.isActive });
    setStatusConfirmOpen(true);
  };

  const confirmUpdateUserStatus = async () => {
    if (!userToUpdateStatus) return;

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userToUpdateStatus.id, isActive: !userToUpdateStatus.isActive }),
    });
    if (res.ok) {
      setStatusConfirmOpen(false);
      setUserToUpdateStatus(null);
      fetchUsers();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to update user status");
    }
  };

  const openDeleteConfirmation = (id: string, email: string) => {
    setUserToDelete({ id, email });
    setConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const res = await fetch(`/api/admin/users?userId=${userToDelete.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setConfirmOpen(false);
      setUserToDelete(null);
      fetchUsers();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <UserCog className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage user accounts and permissions.</p>
          </div>
        </div>

        {loading ? (
          <div>Loading users...</div>
        ) : (
          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(val) => updateRole(user.id, val || 'USER')}>
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">USER</SelectItem>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${user.isActive ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                        {user.isActive ? "Active" : "Deactivated"}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        disabled={user.id === currentUserId && user.isActive}
                        onClick={() => openStatusConfirmation(user)}
                      >
                        {user.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteConfirmation(user.id, user.email)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{userToDelete?.email}&quot;</span>?
            </p>
            <p className="text-sm text-muted-foreground/80 mt-2">
              This action is permanent and will remove all their access to DigiSprint.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteUser}>Confirm Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${userToUpdateStatus?.isActive ? "text-destructive" : "text-emerald-600"}`}>
              {userToUpdateStatus?.isActive ? <PowerOff className="h-5 w-5" /> : <Power className="h-5 w-5" />}
              {userToUpdateStatus?.isActive ? "Deactivate User?" : "Activate User?"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to {userToUpdateStatus?.isActive ? "deactivate" : "activate"} <span className="font-semibold text-foreground">&quot;{userToUpdateStatus?.email}&quot;</span>?
            </p>
            <p className="mt-2 text-sm text-muted-foreground/80">
              {userToUpdateStatus?.isActive
                ? "This user will not be able to log in and will be hidden from assignment and stats."
                : "This user will be able to log in again and appear in assignment and stats."}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setStatusConfirmOpen(false)}>Cancel</Button>
            <Button variant={userToUpdateStatus?.isActive ? "destructive" : "default"} onClick={confirmUpdateUserStatus}>
              {userToUpdateStatus?.isActive ? "Confirm Deactivate" : "Confirm Activate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
