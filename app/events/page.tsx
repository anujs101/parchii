"use client"

import { useState, useEffect } from "react"
import { Search, Calendar, MapPin, Users, Star, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import Image from "next/image"

interface EventData {
  eventId: string;
  name: string;
  description: string;
  posterUrl: string;
  startTime: string;
  endTime: string;
  priceLamports: string;
  capacity: number;
  venue: string;
  category: string;
  tags: string[];
  state: string;
  organizerPubkey: string;
}

const categories = ["All", "CONFERENCE", "CONCERT", "ART", "WORKSHOP", "GAMING"]

export default function EventsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState("date")
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        const data = await response.json()
        
        if (data.success) {
          setEvents(data.events)
        } else {
          setError('Failed to fetch events')
        }
      } catch (err) {
        setError('Error loading events')
        console.error('Error fetching events:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const formatDate = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return startStr === endStr ? startStr : `${startStr} - ${endStr}`
  }

  const formatPrice = (priceLamports: string) => {
    const lamports = parseInt(priceLamports)
    const sol = lamports / 1000000000
    return `${sol.toFixed(3)} SOL`
  }

  const filteredEvents = events
    .filter(
      (event) =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === "All" || event.category === selectedCategory),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return parseInt(a.priceLamports) - parseInt(b.priceLamports)
        case "attendees":
          return b.capacity - a.capacity
        default:
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      }
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading events...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    )
  }

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
                  Events
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Discover Events</h1>
          <p className="text-white/70 text-lg">Find and book amazing events powered by Solana NFT tickets</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/40"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {categories.map((category) => (
                  <SelectItem key={category} value={category} className="text-white hover:bg-slate-700">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="date" className="text-white hover:bg-slate-700">
                  Date
                </SelectItem>
                <SelectItem value="price" className="text-white hover:bg-slate-700">
                  Price
                </SelectItem>
                <SelectItem value="attendees" className="text-white hover:bg-slate-700">
                  Popularity
                </SelectItem>
                <SelectItem value="rating" className="text-white hover:bg-slate-700">
                  Rating
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Link key={event.eventId} href={`/events/${event.eventId}`}>
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 group hover:scale-105">
                <CardContent className="p-0">
                  <div className="relative overflow-hidden">
                    <Image
                      src={event.posterUrl || "/placeholder-logo.png"}
                      alt={event.name}
                      width={400}
                      height={300}
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{event.category}</Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">{event.state}</Badge>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{event.name}</h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-white/70">
                        <Calendar className="w-4 h-4 mr-2 text-cyan-400" />
                        <span className="text-sm">{formatDate(event.startTime, event.endTime)}</span>
                      </div>
                      <div className="flex items-center text-white/70">
                        <MapPin className="w-4 h-4 mr-2 text-cyan-400" />
                        <span className="text-sm">{event.venue}</span>
                      </div>
                      <div className="flex items-center text-white/70">
                        <Users className="w-4 h-4 mr-2 text-cyan-400" />
                        <span className="text-sm">{event.capacity.toLocaleString()} capacity</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-yellow-400">
                        <Star className="w-4 h-4 mr-1 fill-current" />
                        <span className="text-sm font-medium">4.8</span>
                      </div>
                      <div className="text-cyan-400 font-bold text-lg">{formatPrice(event.priceLamports)}</div>
                    </div>

                    <div className="text-white/60 text-sm mb-4">NFT Ticket Event</div>

                    <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* No Results */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-white/40 text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
            <p className="text-white/60">Try adjusting your search criteria or browse all events</p>
          </div>
        )}
      </div>
    </div>
  )
}
