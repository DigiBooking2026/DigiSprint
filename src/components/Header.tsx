"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";

import { useEffect, useState } from "react";
import { User } from "@/generated/prisma";

export function Header() {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(res => {
      if (res.ok) res.json().then(setUser);
    });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <img 
              src="/logo.png" 
              alt="DigiSprint Logo" 
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            />
            <span>DigiSprint</span>
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Projects
            </Link>
            {user?.role === 'ADMIN' && (
              <Link href="/admin/users" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
