"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, MessageSquare, Clock, ArrowRight } from "lucide-react";

type ActivityItem = {
  id: string;
  type: 'history' | 'comment' | 'worklog';
  user: { name: string | null; email: string };
  task: { id: string; ticketId: string; title: string; projectId: string };
  action: string;
  details: string;
  createdAt: string;
};

export default function ActivityStreamPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/activity")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActivities(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'worklog': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'history': default: return <History className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Activity Stream</h1>
          <p className="text-muted-foreground mt-1">Global audit log of all project updates.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading activity...</div>
            ) : activities.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground italic border-2 border-dashed rounded-lg">
                No activity found.
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {activities.map(activity => (
                  <div key={activity.id} className="relative pl-12 group">
                    <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-background border flex items-center justify-center shadow-sm z-10">
                      {getActivityIcon(activity.type)}
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-xl border group-hover:border-primary/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                        <p className="text-sm text-foreground">
                          <span className="font-bold">{activity.user.name || activity.user.email}</span>
                          {" "}
                          <span className="text-muted-foreground">{activity.action}</span>
                          {" "}
                          <Link 
                            href={`/projects/${activity.task.projectId}?task=${activity.task.id}`}
                            className="font-mono font-bold bg-background px-1.5 py-0.5 rounded text-xs mx-1 border hover:text-primary hover:border-primary transition-colors inline-flex items-center gap-1"
                          >
                            {activity.task.ticketId}
                          </Link>
                          {" "}
                          <span className="font-medium text-foreground truncate max-w-[200px] inline-block align-bottom">{activity.task.title}</span>
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 border bg-background px-2 py-0.5 rounded-full">
                          {new Date(activity.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm bg-background p-3 rounded-lg border">
                        {activity.type === 'comment' ? (
                          <div 
                            className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground line-clamp-3" 
                            dangerouslySetInnerHTML={{ __html: activity.details }} 
                          />
                        ) : activity.type === 'worklog' ? (
                          <p className="font-mono text-primary font-bold text-xs">{activity.details}</p>
                        ) : (
                          <p className="text-muted-foreground font-mono text-xs">{activity.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
