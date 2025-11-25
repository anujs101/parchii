"use client"

import { useState } from "react"
import { Plus, Calendar, Users, TrendingUp, DollarSign, Eye, Edit, Trash2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import Image from "next/image"

const organizerEvents = [
  {
    id: 1,
    title: "Solana Developer Conference 2025",
    date: "March 15-17, 2025",
    status: "upcoming",
    ticketsSold: 1250,
    totalTickets: 2500,
    revenue: "625 SOL",
    image: "/placeholder.svg?height=200&width=300&text=Solana+Conference",
  },
  {
    id: 2,
    title: "Web3 Workshop Series",
    date: "February 20, 2025",
    status: "upcoming",
    ticketsSold: 45,
    totalTickets: 100,
    revenue: "22.5 SOL",
    image: "/placeholder.svg?height=200&width=300&text=Web3+Workshop",
  },
  {
    id: 3,
    title: "Blockchain Meetup",
    date: "January 15, 2025",
    status: "completed",
    ticketsSold: 80,
    totalTickets: 80,
    revenue: "24 SOL",
    image: "/placeholder.svg?height=200&width=300&text=Blockchain+Meetup",
  },
]

const stats = [
  {
    title: "Total Events",
    value: "12",
    change: "+2 this month",
    icon: Calendar,
    color: "text-blue-400",
  },
  {
    title: "Total Attendees",
    value: "8,450",
    change: "+15% from last month",
    icon: Users,
    color: "text-green-400",
  },
  {
    title: "Revenue",
    value: "1,247 SOL",
    change: "+23% from last month",
    icon: DollarSign,
    color: "text-cyan-400",
  },
  {
    title: "Avg. Rating",
    value: "4.8",
    change: "+0.2 from last month",
    icon: TrendingUp,
    color: "text-purple-400",
  },
]

export default function OrganizerDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center text-white/80 hover:text-cyan-400 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
              <div className="flex items-center space-x-3">
                <Image src="/parchi-logo.png" alt="Parchi" width={32} height={32} className="rounded-lg" />
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Organizer Dashboard
                </span>
              </div>
            </div>
            <Link href="/create-event">
              <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back, Creator!</h1>
          <p className="text-white/70 text-lg">Manage your events and track your success</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              My Events
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">{stat.title}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-green-400 text-xs">{stat.change}</p>
                      </div>
                      <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Events */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {organizerEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Image
                          src={event.image || "/placeholder.svg"}
                          alt={event.title}
                          width={60}
                          height={60}
                          className="rounded-lg"
                        />
                        <div>
                          <h4 className="text-white font-medium">{event.title}</h4>
                          <p className="text-white/60 text-sm">{event.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            event.status === "upcoming"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : "bg-green-500/20 text-green-300 border-green-500/30"
                          }
                        >
                          {event.status}
                        </Badge>
                        <p className="text-cyan-400 font-medium mt-1">{event.revenue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizerEvents.map((event) => (
                <Card key={event.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardContent className="p-0">
                    <Image
                      src={event.image || "/placeholder.svg"}
                      alt={event.title}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          className={
                            event.status === "upcoming"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : "bg-green-500/20 text-green-300 border-green-500/30"
                          }
                        >
                          {event.status}
                        </Badge>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/20 text-red-400 hover:bg-red-500/10 bg-transparent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <h3 className="text-white font-bold mb-2">{event.title}</h3>
                      <p className="text-white/60 text-sm mb-4">{event.date}</p>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Tickets Sold</span>
                          <span className="text-white">
                            {event.ticketsSold}/{event.totalTickets}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full"
                            style={{ width: `${(event.ticketsSold / event.totalTickets) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">Revenue</span>
                        <span className="text-cyan-400 font-bold">{event.revenue}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-white/5 rounded-lg flex items-center justify-center">
                    <p className="text-white/40">Revenue chart will be displayed here</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Ticket Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-white/5 rounded-lg flex items-center justify-center">
                    <p className="text-white/40">Ticket sales chart will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
