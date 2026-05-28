"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, BarChart3, Bug, CheckCircle2, Clock, Flame, Gauge, Timer, UserCheck } from "lucide-react";

type DeveloperStat = {
  user: { id: string; name: string | null; email: string };
  assignedTasks: number;
  updatedInPeriod: number;
  doneTasks: number;
  openTasks: number;
  notStartedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  bugTasks: number;
  openBugTasks: number;
  loggedTime: number;
  estimatedTime: number;
  doneEstimate: number;
  activeEstimate: number;
  completionRate: number;
  overdueRate: number;
  statusCounts: Record<string, number>;
  score: number;
};

type StatsResponse = {
  from: string;
  to: string;
  statuses: { name: string; color: string | null }[];
  totals: {
    tasks: number;
    updatedInPeriod: number;
    openTasks: number;
    doneTasks: number;
    bugs: number;
    openBugs: number;
    overdueTasks: number;
    loggedTime: number;
    estimatedTime: number;
    statusCounts: Record<string, number>;
  };
  developers: DeveloperStat[];
};

function dateInput(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

function fmtHours(value: number) {
  return `${Number(value || 0).toFixed(1)}h`;
}

function developerName(dev: DeveloperStat) {
  return dev.user.name || dev.user.email;
}

export default function StatsPage() {
  const [from, setFrom] = useState(dateInput(6));
  const [to, setTo] = useState(dateInput(0));
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    const res = await fetch(`/api/stats?${params.toString()}`);
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  const topDeveloper = stats?.developers[0];
  const atRiskDevelopers = useMemo(
    () => (stats?.developers || []).filter(dev => dev.overdueTasks > 0 || dev.openBugTasks > 0),
    [stats]
  );

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Developer Stats</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track hours, bugs, overdue work, status spread, and delivery signals by developer.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
            <div className="space-y-1">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={fetchStats} disabled={loading} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {loading ? "Loading..." : "Update"}
            </Button>
          </div>
        </div>

        {loading || !stats ? (
          <div className="rounded-lg border bg-background p-12 text-center text-muted-foreground">Loading stats...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Timer className="h-4 w-4 text-primary" /> Logged</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{fmtHours(stats.totals.loggedTime)}</div><p className="text-xs text-muted-foreground">recorded work</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" /> Estimated</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{fmtHours(stats.totals.estimatedTime)}</div><p className="text-xs text-muted-foreground">updated in range</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Done</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.totals.doneTasks}</div><p className="text-xs text-muted-foreground">completed updates</p></CardContent>
              </Card>
              <Card className={stats.totals.overdueTasks > 0 ? "border-destructive/40" : ""}>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive" /> Late</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.totals.overdueTasks}</div><p className="text-xs text-muted-foreground">open overdue</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Bug className="h-4 w-4 text-destructive" /> Bugs</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.totals.openBugs}/{stats.totals.bugs}</div><p className="text-xs text-muted-foreground">open / total</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Gauge className="h-4 w-4 text-amber-500" /> Top Dev</CardTitle></CardHeader>
                <CardContent><div className="truncate text-lg font-bold">{topDeveloper ? developerName(topDeveloper) : "None"}</div><p className="text-xs text-muted-foreground">score {topDeveloper?.score || 0}</p></CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /> Developer Performance</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="p-3">Developer</th>
                        <th className="p-3 text-right">Score</th>
                        <th className="p-3 text-right">Logged</th>
                        <th className="p-3 text-right">Estimate</th>
                        <th className="p-3 text-right">Done</th>
                        <th className="p-3 text-right">Open</th>
                        <th className="p-3 text-right">Late</th>
                        <th className="p-3 text-right">Bugs</th>
                        <th className="p-3 text-right">Done %</th>
                        <th className="p-3">Status Spread</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.developers.map((dev) => (
                        <tr key={dev.user.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-semibold">{developerName(dev)}</div>
                            <div className="text-xs text-muted-foreground">{dev.updatedInPeriod} tasks touched</div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold">{dev.score}</td>
                          <td className="p-3 text-right">{fmtHours(dev.loggedTime)}</td>
                          <td className="p-3 text-right">{fmtHours(dev.estimatedTime)}</td>
                          <td className="p-3 text-right">{dev.doneTasks}</td>
                          <td className="p-3 text-right">{dev.openTasks}</td>
                          <td className={`p-3 text-right font-semibold ${dev.overdueTasks > 0 ? "text-destructive" : ""}`}>{dev.overdueTasks}</td>
                          <td className={`p-3 text-right font-semibold ${dev.openBugTasks > 0 ? "text-destructive" : ""}`}>{dev.openBugTasks}/{dev.bugTasks}</td>
                          <td className="p-3 text-right">{dev.completionRate}%</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {stats.statuses.map(status => {
                                const count = dev.statusCounts[status.name] || 0;
                                if (!count) return null;
                                return (
                                  <span key={status.name} className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: `${status.color || "#64748b"}55`, color: status.color || undefined }}>
                                    {status.name}: {count}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-destructive" /> At Risk</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {atRiskDevelopers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No developer has overdue work or open bugs.</p>
                    ) : atRiskDevelopers.map(dev => (
                      <div key={dev.user.id} className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{developerName(dev)}</p>
                            <p className="text-xs text-muted-foreground">{dev.openTasks} open tasks</p>
                          </div>
                          <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive">{dev.score}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                          <div className="rounded bg-muted px-2 py-1"><span className="font-bold">{dev.overdueTasks}</span> late</div>
                          <div className="rounded bg-muted px-2 py-1"><span className="font-bold">{dev.openBugTasks}</span> bugs</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Status Totals</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {stats.statuses.map(status => {
                      const count = stats.totals.statusCounts[status.name] || 0;
                      const percent = stats.totals.tasks ? Math.round((count / stats.totals.tasks) * 100) : 0;
                      return (
                        <div key={status.name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold">{status.name}</span>
                            <span className="text-muted-foreground">{count} ({percent}%)</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full" style={{ width: `${percent}%`, backgroundColor: status.color || "#64748b" }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
