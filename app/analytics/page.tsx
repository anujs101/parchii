"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pencil, Eye, Plus, BarChart2 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type EventRow = {
  eventId: string;
  name: string;
  startTime: string;
  endTime: string;
  capacity: number;
  priceLamports?: string | null;
  state: string;
  ticketsSold?: number;
  posterUrl?: string | null;
  collectionPubkey?: string | null;
};

export default function OrganizerDashboard(): JSX.Element {
  const router = useRouter();
  const { publicKey } = useWallet();
  const organizerPubkey = publicKey ? publicKey.toBase58() : null;

  const [events, setEvents] = useState<EventRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- API helpers ---
  async function fetchEvents(organizer: string | null) {
    if (!organizer) return [];
    const res = await fetch(`/api/organizer/events?organizer=${organizer}`);
    if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
    return res.json();
  }

  async function fetchAnalytics(eventIds: string[]) {
    const res = await fetch(`/api/organizer/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventIds }),
    });
    if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
    return res.json();
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        if (!organizerPubkey) {
          if (!mounted) return;
          setEvents([]);
          setAnalytics(null);
          setLoading(false);
          return;
        }

        const evts: EventRow[] = await fetchEvents(organizerPubkey);
        if (!mounted) return;
        setEvents(evts);

        const analyticsRes = await fetchAnalytics(evts.map((e) => e.eventId));
        if (!mounted) return;
        setAnalytics(analyticsRes);
      } catch (err: any) {
        console.error(err);
        if (!mounted) return;
        setError(err?.message ?? "Unknown error");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [organizerPubkey]);

  const filtered = useMemo(() => {
    if (!query) return events;
    return events.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));
  }, [events, query]);

  // navigate when whole row clicked
  const openEvent = (id: string) => {
    router.push(`/events/${id}`);
  };

  const openEdit = (id: string) => {
    router.push(`/events/${id}/edit`);
  };

  const openAnalytics = (id: string) => {
    router.push(`/events/${id}/analytics`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Organizer Dashboard</h1>
            <p className="text-slate-400 mt-2">Manage events, view analytics and verify entry — all in one place.</p>
          </div>

          <div className="flex items-center gap-4">
            <Input
              value={query}
              onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder="Search events..."
              className="w-80 bg-slate-800/60 border-slate-700"
            />
            <Button onClick={() => router.push('/create-event')} className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 shadow-md">
              <Plus />
              Create Event
            </Button>
          </div>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 shadow-inner">
            <CardHeader>
              <CardTitle className="text-sm text-slate-300">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-white">{analytics ? `${Number(analytics.revenue).toFixed(2)} SOL` : "—"}</div>
              <div className="text-sm text-slate-400 mt-1">Total revenue from sold tickets</div>
            </CardContent>
          </Card>

          <Card className="p-6 bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 shadow-inner">
            <CardHeader>
              <CardTitle className="text-sm text-slate-300">Tickets Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-white">{analytics ? analytics.ticketsSold : "—"}</div>
              <div className="text-sm text-slate-400 mt-1">Across all events</div>
            </CardContent>
          </Card>

          <Card className="p-6 bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 shadow-inner">
            <CardHeader>
              <CardTitle className="text-sm text-slate-300">Active Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-white">{events.filter((e) => e.state === "PUBLISHED").length}</div>
              <div className="text-sm text-slate-400 mt-1">Published & live</div>
            </CardContent>
          </Card>

          <Card className="p-6 bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 shadow-inner">
            <CardHeader>
              <CardTitle className="text-sm text-slate-300">Attendees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-white">{events.reduce((acc, e) => acc + (e.ticketsSold || 0), 0)}</div>
              <div className="text-sm text-slate-400 mt-1">Total minted tickets</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events list */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader className="flex items-center justify-between px-6 pt-6">
                <div>
                  <CardTitle className="text-lg text-white">Your Events</CardTitle>
                  <p className="text-sm text-slate-400">Manage events and view ticket sales</p>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {loading ? (
                  <div className="text-slate-300">Loading events...</div>
                ) : !organizerPubkey ? (
                  <Alert>
                    <AlertDescription className="text-slate-200">Connect your wallet to load organizer events.</AlertDescription>
                  </Alert>
                ) : filtered.length === 0 ? (
                  <Alert>
                    <AlertDescription className="text-slate-200">No events found. Create your first event to get started.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-2">
                    {filtered.map((evt) => (
                      <div
                        key={evt.eventId}
                        role="button"
                        tabIndex={0}
                        onClick={() => openEvent(evt.eventId)}
                        onKeyDown={(e) => e.key === "Enter" && openEvent(evt.eventId)}
                        className="group flex items-center justify-between gap-4 p-4 rounded-lg bg-gradient-to-br from-slate-800/20 to-slate-900/10 border border-slate-700 hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-36 h-20 flex-shrink-0 rounded overflow-hidden bg-slate-800 border border-slate-700 shadow-sm">
                            <img src={evt.posterUrl ?? "/placeholder.png"} alt={evt.name} className="w-full h-full object-cover" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-white font-semibold truncate text-lg">{evt.name}</div>
                            <div className="text-slate-400 text-sm mt-1">{new Date(evt.startTime).toLocaleString()}</div>
                            <div className="text-slate-400 text-sm mt-1">{evt.ticketsSold ?? 0}/{evt.capacity} tickets</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 opacity-90">
                          <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); openEvent(evt.eventId); }} title="Open">
                            <Eye />
                          </Button>

                          <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); openEdit(evt.eventId); }} title="Edit">
                            <Pencil />
                          </Button>

                          <Badge className="px-3 py-1 hidden sm:inline-flex">{evt.state}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analytics + quick actions */}
          <div>
            <Card className="mb-4 rounded-2xl overflow-hidden border border-slate-700 shadow-lg">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <BarChart2 className="text-cyan-400" />
                  <h3 className="text-white font-semibold">Revenue</h3>
                </div>
              </div>

              <CardContent className="p-4 bg-slate-900/40">
                {analytics ? (
                  <div style={{ height: 260 }} className="rounded-md overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.dailySales || []} margin={{ top: 10, right: 0, left: -10, bottom: 8 }}>
                        <defs>
                          <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} />
                        <CartesianGrid strokeDasharray="3 3" stroke="#0f1724" />
                        <Tooltip formatter={(value: any) => `${value} SOL`} contentStyle={{ background: '#0b1220' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#06b6d4" fill="url(#colorRevenue2)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-slate-400">No analytics available</div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-700 shadow-lg">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-white font-semibold">Quick Actions</h3>
              </div>
              <CardContent className="p-6 flex flex-col items-center gap-4 bg-slate-900/30">
                <Button className="w-full max-w-xs text-lg py-3 bg-gradient-to-r from-cyan-500 to-blue-500 shadow-md" onClick={() => router.push('/events/create')}>Create event</Button>
                <Button className="w-full max-w-xs py-3 border border-slate-700 text-white" variant="outline" onClick={() => router.push('/gate')}>Open Gate Verifier</Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating event preview */}
        {selectedEvent && (
          <div className="fixed right-6 bottom-6 z-50 w-96">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <img src={selectedEvent.posterUrl ?? "/placeholder.png"} alt={selectedEvent.name} className="w-20 h-12 object-cover rounded" />
                <div className="flex-1">
                  <div className="text-white font-semibold">{selectedEvent.name}</div>
                  <div className="text-slate-400 text-sm">{new Date(selectedEvent.startTime).toLocaleString()}</div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => openEvent(selectedEvent.eventId)}>Open</Button>
                    <Button variant="ghost" size="sm" onClick={() => openAnalytics(selectedEvent.eventId)}>Analytics</Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>Close</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {error && <div className="mt-6 text-red-400">{error}</div>}
      </div>
    </div>
  );
}
