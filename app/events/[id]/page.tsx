"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, MapPin, User, FileText, MapIcon, Shield, Ticket, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { WalletInfo } from '@/components/wallet/WalletInfo'
import { PaymentButton } from '@/components/payment/PaymentButton'
import { useWallet } from "@solana/wallet-adapter-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface EventData {
  eventId: string
  name: string
  description: string
  venue: string
  startTime: string
  endTime: string
  priceLamports: string
  capacity: number
  category: string
  tags: string[]
  posterUrl: string
}

const ticketTiers = [
  {
    id: "early-bird",
    name: "Early Bird",
    type: "Popular",
    price: "0.080 SOL",
    usdPrice: "≈ $3.20 USD",
    description: "Limited time offer with full conference access",
    features: ["Full 3-day conference access", "Networking lunch included", "Digital certificate"],
    available: 45,
    total: 100,
    color: "bg-green-500/20 text-green-300 border-green-500/30",
  },
  {
    id: "standard",
    name: "Standard",
    type: "Regular",
    price: "0.120 SOL",
    usdPrice: "≈ $2.81 USD",
    description: "Regular conference ticket with all sessions",
    features: ["Full 3-day conference access", "Welcome kit and conference swag", "Digital certificate"],
    available: 190,
    total: 500,
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    id: "vip",
    name: "VIP Experience",
    type: "Premium",
    price: "0.250 SOL",
    usdPrice: "≈ $5.86 USD",
    description: "Premium access with exclusive perks",
    features: [
      "Full 3-day conference access",
      "VIP lounge access",
      "Priority seating",
      "Exclusive speaker meet & greet",
      "Private networking dinner",
      "Premium welcome kit",
    ],
    available: 8,
    total: 50,
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
]

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { connected } = useWallet()
  const { toast } = useToast()
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState("description")
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/events/${params.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch event')
        }
        const data = await response.json()
        setEventData(data.event)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [params.id])

  const updateQuantity = (ticketId: string, change: number) => {
    setTicketQuantities((prev) => ({
      ...prev,
      [ticketId]: Math.max(0, (prev[ticketId] || 0) + change),
    }))
  }

  const getTotalCost = () => {
    if (!eventData) return 0
    const priceInSol = parseInt(eventData.priceLamports) / 1000000000 // Convert lamports to SOL
    return getTotalTickets() * priceInSol
  }

  const getTotalTickets = () => {
    return Object.values(ticketQuantities).reduce((total, quantity) => total + quantity, 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading event...</div>
      </div>
    )
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">{error || 'Event not found'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center text-slate-300 hover:text-cyan-400 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Link>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-semibold">Events</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Header */}
            <div className="relative">
              <img
                src={eventData.posterUrl || "/placeholder.svg"}
                alt={eventData.name}
                className="w-full h-64 object-cover rounded-lg"
              />
              <div className="absolute top-4 left-4">
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Upcoming</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-white">{eventData.name}</h1>

              <div className="grid md:grid-cols-2 gap-4 text-slate-300">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="h-5 w-5" />
                  <span>{formatDate(eventData.startTime)} • {formatTime(eventData.startTime)} - {formatTime(eventData.endTime)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="h-5 w-5" />
                  <span>{eventData.venue}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="h-5 w-5" />
                  <span>Capacity: {eventData.capacity} attendees</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Shield className="h-5 w-5" />
                  <span>NFT Tickets • Verified Event</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
              {[
                { id: "description", label: "Description", icon: FileText },
                { id: "venue", label: "Venue", icon: MapIcon },
                { id: "organizer", label: "Organizer", icon: User },
                { id: "policies", label: "Policies", icon: Shield },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <Card className="backdrop-blur-md bg-white/10 border-slate-700/50">
              <CardContent className="p-6">
                {activeTab === "description" && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-4xl font-bold text-white mb-4">{eventData.name}</h1>
                      <p className="text-xl text-slate-300 leading-relaxed">
                        {eventData.description}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Event Category</h3>
                      <div className="mb-6">
                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                          {eventData.category}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-4">Event Details</h3>
                      <div className="space-y-3 text-slate-300">
                        <p><strong>Venue:</strong> {eventData.venue}</p>
                        <p><strong>Capacity:</strong> {eventData.capacity} attendees</p>
                        <p><strong>Ticket Price:</strong> {(parseInt(eventData.priceLamports) / 1000000000).toFixed(3)} SOL</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {eventData.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-cyan-300 border-cyan-500/30">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "venue" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Venue Information</h3>
                    <div className="space-y-2">
                      <p className="text-white font-medium">{eventData.venue}</p>
                      <p className="text-slate-300">{eventData.venue}</p>
                    </div>
                    <div className="w-full h-48 bg-slate-700/50 rounded-lg flex items-center justify-center">
                      <span className="text-slate-400">Map will be displayed here</span>
                    </div>
                  </div>
                )}

                {activeTab === "organizer" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Event Organizer</h3>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xl">SF</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{eventData.name}</h4>
                        <p className="text-slate-300 text-sm">Leading blockchain foundation</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "policies" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Select Tickets</h3>
                    <p className="text-slate-400 mb-6">Each ticket is minted as a unique NFT on Solana blockchain.</p>
                    <div className="space-y-3 text-slate-300">
                      <p>• Valid ID required for entry</p>
                      <p>• No outside food or beverages</p>
                      <p>• Photography allowed for personal use</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Similar Events */}
            <Card className="backdrop-blur-md bg-white/10 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  Similar Events
                  <Link href="/events" className="text-cyan-400 text-sm hover:underline">
                    View All →
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* TODO: Implement similar events functionality */}
                  {[].map((event: any) => (
                    <Card
                      key={event.id}
                      className="bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-0">
                        <img
                          src={event.image || "/placeholder.svg"}
                          alt={event.title}
                          className="w-full h-24 object-cover rounded-t-lg"
                        />
                        <div className="p-3">
                          <h4 className="text-white font-medium text-sm mb-1 line-clamp-2">{event.title}</h4>
                          <div className="text-slate-400 text-xs space-y-1">
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              <span>{event.date}</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span className="truncate">{event.venue}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card className="backdrop-blur-md bg-white/10 border-slate-700/50 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Ticket className="w-5 h-5 mr-2 text-cyan-400" />
                  Select Tickets
                </CardTitle>
                <div className="flex items-center text-sm text-slate-300">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                  Sale ends in 2 days
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wallet Connection Section */}
                {!connected && (
                  <Card className="bg-gradient-to-r from-cyan-600/10 to-blue-600/10 border-cyan-500/30">
                    <CardContent className="p-4 text-center">
                      <h4 className="text-cyan-300 font-medium mb-2">Connect Your Wallet</h4>
                      <p className="text-slate-300 text-sm mb-4">
                        Connect your Solana wallet to purchase NFT tickets
                      </p>
                      <WalletConnectButton size="sm" />
                    </CardContent>
                  </Card>
                )}

                {/* Wallet Info Display */}
                {connected && (
                  <WalletInfo className="mb-4" />
                )}

                <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">General Admission</h4>
                        <p className="text-slate-400">NFT Ticket with full event access</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-400">
                          {(parseInt(eventData.priceLamports) / 1000000000).toFixed(3)} SOL
                        </div>
                        <div className="text-sm text-slate-400">
                          ≈ ${((parseInt(eventData.priceLamports) / 1000000000) * 40).toFixed(2)} USD
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity('general', -1)}
                          disabled={!ticketQuantities['general']}
                          className="h-8 w-8 p-0 border-slate-600 hover:border-cyan-500"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-white font-medium w-8 text-center">
                          {ticketQuantities['general'] || 0}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity('general', 1)}
                          className="h-8 w-8 p-0 border-slate-600 hover:border-cyan-500"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-slate-400">
                        Available: {eventData.capacity}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {getTotalTickets() > 0 && connected && (
                  <>
                    <Separator className="bg-slate-700" />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-white">
                        <span className="font-medium">Total ({getTotalTickets()} tickets)</span>
                        <span className="font-bold text-cyan-400">{getTotalCost().toFixed(3)} SOL</span>
                      </div>
                      <PaymentButton
                        eventId={params.id}
                        ticketPrice={getTotalCost() / getTotalTickets()}
                        quantity={getTotalTickets()}
                        eventTitle={eventData.name}
                        onPaymentSuccess={(signature, ticketData) => {
                          console.log('Payment successful:', signature)
                          
                          // Show success message with ticket details
                          toast({
                            title: "🎫 Ticket Purchased Successfully!",
                            description: `Your NFT ticket has been minted! Transaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
                            duration: 8000,
                          })
                          
                          // You could also redirect to a success page or show ticket details
                          // For now, we'll just show the success message
                        }}
                        onPaymentError={(error) => {
                          console.error('Payment failed:', error)
                        }}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                      />
                      <p className="text-slate-400 text-xs text-center">
                        Tickets will be minted as NFTs to your connected wallet
                      </p>
                    </div>
                  </>
                )}

                {getTotalTickets() > 0 && !connected && (
                  <>
                    <Separator className="bg-slate-700" />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-white">
                        <span className="font-medium">Total ({getTotalTickets()} tickets)</span>
                        <span className="font-bold text-cyan-400">{getTotalCost().toFixed(3)} SOL</span>
                      </div>
                      <div className="text-center p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <p className="text-orange-300 text-sm mb-2">Connect wallet to purchase</p>
                        <WalletConnectButton size="sm" />
                      </div>
                    </div>
                  </>
                )}

                {/* NFT Information */}
                <Card className="bg-gradient-to-r from-cyan-600/10 to-blue-600/10 border-cyan-500/30">
                  <CardContent className="p-4">
                    <h4 className="text-cyan-300 font-medium mb-2">NFT Ticket Information</h4>
                    <ul className="space-y-1 text-slate-300 text-sm">
                      <li>• Tickets are minted as NFTs on Solana blockchain</li>
                      <li>• Each ticket is unique and verifiable</li>
                      <li>• Tickets can be transferred or resold</li>
                      <li>• QR codes are generated for event entry</li>
                    </ul>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
