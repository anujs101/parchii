"use client"

import { useState, useEffect } from "react"
import { QrCode, Plus, Calendar, MapPin, Users, TrendingUp, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton"
import Link from "next/link"
import Image from "next/image"

// Mock events data for the carousel
const carouselEvents = [
  {
    id: 1,
    title: "Solana Developer Conference 2025",
    subtitle: "The Future of Blockchain Development",
    date: "March 15-17, 2025",
    location: "San Francisco, CA",
    image: "/placeholder.svg?height=1080&width=1920&text=Solana+Dev+Conference",
    gradient: "from-purple-900 via-blue-900 to-indigo-900",
    category: "Technology",
    attendees: "2.5K+",
    price: "0.5 SOL",
    description:
      "Join the most comprehensive Solana developer conference featuring workshops, networking, and the latest in blockchain innovation.",
  },
  {
    id: 2,
    title: "Crypto Music Festival",
    subtitle: "Where Music Meets Web3",
    date: "April 20-22, 2025",
    location: "Miami Beach, FL",
    image: "/placeholder.svg?height=1080&width=1920&text=Crypto+Music+Festival",
    gradient: "from-pink-900 via-purple-900 to-blue-900",
    category: "Music",
    attendees: "10K+",
    price: "1.2 SOL",
    description: "Experience the intersection of music and cryptocurrency with top artists and exclusive NFT drops.",
  },
  {
    id: 3,
    title: "NFT Art Exhibition",
    subtitle: "Digital Renaissance",
    date: "May 5-7, 2025",
    location: "New York, NY",
    image: "/placeholder.svg?height=1080&width=1920&text=NFT+Art+Exhibition",
    gradient: "from-emerald-900 via-teal-900 to-cyan-900",
    category: "Art",
    attendees: "1.8K+",
    price: "0.3 SOL",
    description: "Discover groundbreaking digital art and meet the artists shaping the future of creative expression.",
  },
  {
    id: 4,
    title: "DeFi Summit 2025",
    subtitle: "Decentralized Finance Revolution",
    date: "June 10-12, 2025",
    location: "Austin, TX",
    image: "/placeholder.svg?height=1080&width=1920&text=DeFi+Summit",
    gradient: "from-orange-900 via-red-900 to-pink-900",
    category: "Finance",
    attendees: "3.2K+",
    price: "0.8 SOL",
    description: "Explore the latest in decentralized finance protocols, yield farming, and financial innovation.",
  },
  {
    id: 5,
    title: "Web3 Gaming Convention",
    subtitle: "Play to Earn Revolution",
    date: "July 15-17, 2025",
    location: "Los Angeles, CA",
    image: "/placeholder.svg?height=1080&width=1920&text=Web3+Gaming",
    gradient: "from-violet-900 via-purple-900 to-fuchsia-900",
    category: "Gaming",
    attendees: "5K+",
    price: "0.6 SOL",
    description: "Dive into the future of gaming with blockchain integration, NFT assets, and play-to-earn mechanics.",
  },
]

export default function HomePage() {
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % carouselEvents.length)
    }, 5000) // Change every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const currentEvent = carouselEvents[currentEventIndex]

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <Image src="/parchi-logo.png" alt="Parchi" width={40} height={40} className="rounded-lg" />
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Parchi
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/events" className="text-white/80 hover:text-cyan-400 transition-colors">
                Events
              </Link>
              <Link href="/organizer" className="text-white/80 hover:text-cyan-400 transition-colors">
                Organizer
              </Link>
              <Link href="/analytics" className="text-white/80 hover:text-cyan-400 transition-colors">
                Analytics
              </Link>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowQRScanner(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
                size="sm"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR
              </Button>

              <WalletConnectButton size="sm" />

              <Link href="/create-event">
                <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </Link>

              {/* Mobile Menu Toggle */}
              <Button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden bg-white/10 hover:bg-white/20 text-white border border-white/20"
                size="sm"
              >
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-white/10">
              <nav className="flex flex-col space-y-4 mt-4">
                <Link href="/events" className="text-white/80 hover:text-cyan-400 transition-colors">
                  Events
                </Link>
                <Link href="/organizer" className="text-white/80 hover:text-cyan-400 transition-colors">
                  Organizer
                </Link>
                <Link href="/analytics" className="text-white/80 hover:text-cyan-400 transition-colors">
                  Analytics
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Full-Screen Carousel */}
      <div className="relative h-screen w-full overflow-hidden">
        {/* Background with Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${currentEvent.gradient} transition-all duration-1000`}>
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Event Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Event Information */}
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-sm">
                    {currentEvent.category}
                  </Badge>
                  <h1 className="text-5xl lg:text-7xl font-bold leading-tight">{currentEvent.title}</h1>
                  <p className="text-xl lg:text-2xl text-white/80 font-light">{currentEvent.subtitle}</p>
                </div>

                <p className="text-lg text-white/70 leading-relaxed max-w-2xl">{currentEvent.description}</p>

                {/* Event Details */}
                <div className="flex flex-wrap gap-6 text-white/80">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    <span>{currentEvent.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-cyan-400" />
                    <span>{currentEvent.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <span>{currentEvent.attendees} attending</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 pt-4">
                  <Link href={`/events/${currentEvent.id}`}>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-4 text-lg"
                    >
                      Get Tickets - {currentEvent.price}
                    </Button>
                  </Link>
                  <Link href={`/events/${currentEvent.id}`}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg bg-transparent"
                    >
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Event Visual */}
              <div className="relative">
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={currentEvent.image || "/placeholder.svg"}
                    alt={currentEvent.title}
                    width={800}
                    height={450}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Floating Stats */}
                <div className="absolute -bottom-6 -right-6 bg-black/60 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{currentEvent.price}</div>
                    <div className="text-sm text-white/60">Starting Price</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex space-x-3">
            {carouselEvents.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentEventIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentEventIndex ? "bg-cyan-400 scale-125" : "bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => setCurrentEventIndex((prev) => (prev - 1 + carouselEvents.length) % carouselEvents.length)}
          className="absolute left-6 top-1/2 transform -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full p-3 transition-all duration-300"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentEventIndex((prev) => (prev + 1) % carouselEvents.length)}
          className="absolute right-6 top-1/2 transform -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full p-3 transition-all duration-300"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Quick Access Section */}
      <div className="relative z-10 bg-black/90 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <Link href="/events" className="group">
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Browse Events</h3>
                  <p className="text-white/60">Discover amazing events happening near you</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/organizer" className="group">
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6 text-center">
                  <Users className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Organizer Hub</h3>
                  <p className="text-white/60">Manage your events and track performance</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/analytics" className="group">
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Analytics</h3>
                  <p className="text-white/60">View detailed insights and metrics</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-black/90 border-white/20 max-w-md w-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">QR Scanner</h3>
                <Button
                  onClick={() => setShowQRScanner(false)}
                  className="bg-white/10 hover:bg-white/20 text-white"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center mb-4">
                <QrCode className="w-24 h-24 text-white/40" />
              </div>
              <p className="text-white/60 text-center">Position the QR code within the frame to scan your NFT ticket</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
