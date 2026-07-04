"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, Bell, UserCircle } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useEffect, useState } from "react";
import { User, Notification } from "@/generated/prisma";
import { CommandMenu } from "./CommandMenu";

export function Header() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.isRead).length);
        }
      })
      .catch(console.error);
  }, []);

  const markAllAsRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((res) => {
      if (res.ok) res.json().then(setUser);
    });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl text-primary"
          >
            <Image
              src="/logo.png"
              alt="DigiSprint Logo"
              width={32}
              height={32}
              style={{ objectFit: "contain" }}
            />
            <span>DigiSprint</span>
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Projects
            </Link>
            <Link
              href="/tasks"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Tasks
            </Link>
            <Link
              href="/activity"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Activity
            </Link>
            {user?.role === "ADMIN" && (
              <>
                <Link
                  href="/stats"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Stats
                </Link>
                <Link
                  href="/admin/users"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Users
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <CommandMenu />
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-destructive animate-pulse" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 p-0 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <h4 className="font-bold text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] uppercase"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground italic">
                    You're all caught up!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                      onClick={() => {
                        if (!n.isRead) markAsRead(n.id);
                        if (n.link) router.push(n.link);
                      }}
                    >
                      <h5 className="font-semibold text-xs mb-1 flex items-center justify-between">
                        {n.title}
                        {!n.isRead && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[9px] text-muted-foreground/60 mt-2 block">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Link href="/profile">
            <Button variant="ghost" size="icon" title="Profile" className="overflow-hidden rounded-full h-8 w-8 flex items-center justify-center border bg-muted">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserCircle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              )}
              <span className="sr-only">Profile</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
