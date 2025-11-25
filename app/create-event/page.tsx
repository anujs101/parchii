"use client"

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { ArrowLeft, Upload, Calendar, MapPin, Eye, Ticket, Loader2, CheckCircle, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@solana/wallet-adapter-react"
import { CreateCollectionButton } from "@/components/collections/CreateCollectionButton"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg"]

export default function CreateEventPage() {
  const { connected, publicKey } = useWallet()
  const { toast } = useToast()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)
  const [collectionCreated, setCollectionCreated] = useState(false)
  
  const [eventData, setEventData] = useState({
    name: "",
    description: "",
    category: "OTHER",
    posterUrl: "",
    tags: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    venue: "",
    ticketPrice: "",
    capacity: "",
  })

  const posterInputRef = useRef<HTMLInputElement | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  useEffect(() => {
    return () => {
      if (posterPreview) {
        URL.revokeObjectURL(posterPreview)
      }
    }
  }, [posterPreview])

  const steps = [
    { id: 1, name: "Basic Info", icon: "1" },
    { id: 2, name: "Date & Time", icon: "2" },
    { id: 3, name: "Location", icon: "3" },
    { id: 4, name: "Tickets", icon: "4" },
    { id: 5, name: "Review", icon: "5" },
  ]

  const categories = [
    { value: "CONFERENCE", label: "Conference" },
    { value: "WORKSHOP", label: "Workshop" },
    { value: "MEETUP", label: "Meetup" },
    { value: "CONCERT", label: "Concert" },
    { value: "SPORTS", label: "Sports" },
    { value: "ART", label: "Art" },
    { value: "OTHER", label: "Other" }
  ]

  const validatePosterFile = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Unsupported file type. Please upload a PNG or JPG image.")
      return false
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError("File is too large. Maximum size is 10MB.")
      return false
    }

    return true
  }

  const handlePosterUpload = async (file: File) => {
    if (!validatePosterFile(file)) {
      return
    }

    setIsUploadingImage(true)
    setImageError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/uploads/event-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || "Failed to upload image")
      }

      const data = await response.json()

      if (!data?.success || !data?.url) {
        throw new Error(data?.error || "Image upload did not return a URL")
      }

      if (posterPreview) {
        URL.revokeObjectURL(posterPreview)
      }

      const objectUrl = URL.createObjectURL(file)
      setPosterPreview(objectUrl)
      setEventData((prev) => ({ ...prev, posterUrl: data.url }))
    } catch (error) {
      console.error("Poster upload failed", error)
      setImageError(error instanceof Error ? error.message : "Failed to upload image")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handlePosterInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void handlePosterUpload(file)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingOver(false)

    const file = event.dataTransfer.files?.[0]
    if (file) {
      void handlePosterUpload(file)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!isDraggingOver) {
      setIsDraggingOver(true)
    }
  }

  const handleDragLeave = () => {
    setIsDraggingOver(false)
  }

  const startDateTime =
    eventData.startDate && eventData.startTime
      ? new Date(`${eventData.startDate}T${eventData.startTime}`)
      : null
  const endDateTime =
    eventData.endDate && eventData.endTime
      ? new Date(`${eventData.endDate}T${eventData.endTime}`)
      : null

  const formattedStartDate = startDateTime
    ? startDateTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : null
  const formattedStartTime = startDateTime
    ? startDateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null
  const formattedEndDate = endDateTime
    ? endDateTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : null
  const formattedEndTime = endDateTime
    ? endDateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null

  const formattedPrice = eventData.ticketPrice
    ? `${Number.parseFloat(eventData.ticketPrice).toFixed(2)} SOL`
    : "Price TBD"
  const formattedCapacity = eventData.capacity ? Number.parseInt(eventData.capacity, 10).toLocaleString() : "—"
  const previewTags = eventData.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

  // Event creation functions
  const createEvent = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to create an event.",
        variant: "destructive"
      })
      return
    }

    // Validate required fields
    if (!eventData.name || !eventData.description || !eventData.startDate || !eventData.startTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    if (!eventData.posterUrl) {
      toast({
        title: "Event Image Required",
        description: "Please upload an event image before continuing.",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)

    try {
      // Combine date and time
      const startTime = new Date(`${eventData.startDate}T${eventData.startTime}`)
      const endTime = eventData.endDate && eventData.endTime 
        ? new Date(`${eventData.endDate}T${eventData.endTime}`)
        : new Date(startTime.getTime() + 3 * 60 * 60 * 1000) // Default 3 hours later

      // Create event
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: eventData.name,
          description: eventData.description,
          category: eventData.category,
          posterUrl: eventData.posterUrl || null,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          venue: eventData.venue || null,
          priceLamports: Math.floor(parseFloat(eventData.ticketPrice || "0") * 1e9), // Convert SOL to lamports
          capacity: parseInt(eventData.capacity || "100"),
          organizerPubkey: publicKey.toString(),
          tags: eventData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      const result = await response.json()
      setCreatedEventId(result.event.eventId)
      
      toast({
        title: "Event Created!",
        description: "Your event has been created successfully. Now create a collection to publish it.",
      })

      setCurrentStep(6) // Move to collection creation step

    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCollectionCreated = (collectionPubkey: string) => {
    setCollectionCreated(true)
    toast({
      title: "Success!",
      description: "Event published successfully with collection created.",
    })
    
    // Redirect to event page after a delay
    setTimeout(() => {
      if (createdEventId) {
        router.push(`/events/${createdEventId}`)
      }
    }, 2000)
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Event</h1>
          <p className="text-slate-300">Set up your blockchain-based event with NFT tickets</p>
          <div className="flex items-center mt-4">
            <div className="flex items-center text-green-400 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Draft saved automatically
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id ? "bg-cyan-600 border-cyan-600 text-white" : "border-slate-600 text-slate-400"
                }`}
              >
                {step.icon}
              </div>
              <div className="ml-2 mr-4">
                <div className={`text-sm font-medium ${currentStep >= step.id ? "text-cyan-400" : "text-slate-400"}`}>
                  {step.name}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${currentStep > step.id ? "bg-cyan-600" : "bg-slate-600"}`}></div>
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="backdrop-blur-md bg-white/10 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full flex items-center justify-center mr-3">
                    1
                  </div>
                  Basic Information
                </CardTitle>
                <p className="text-slate-300 text-sm">Essential details about your event</p>
                <div className="text-slate-400 text-sm">Step 1 of 5</div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Event Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">
                    Event Title *
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your event title"
                    value={eventData.name}
                    onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                  />
                  <p className="text-slate-400 text-sm">Choose a clear, descriptive title that attracts attendees</p>
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">
                    Event Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your event, what attendees can expect, agenda highlights..."
                    value={eventData.description}
                    onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400 min-h-[120px]"
                  />
                  <p className="text-slate-400 text-sm">
                    Provide detailed information to help attendees understand your event
                  </p>
                </div>

                {/* Event Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-white">
                    Event Category *
                  </Label>
                  <Select
                    value={eventData.category}
                    onValueChange={(value) => setEventData({ ...eventData, category: value })}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                      <SelectValue placeholder="Select event category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value} className="text-white hover:bg-slate-700">
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-slate-400 text-sm">Choose the category that best describes your event</p>
                </div>

                {/* Event Image */}
                <div className="space-y-2">
                  <Label className="text-white">Event Image *</Label>
                  <div
                    className={cn(
                      "border-2 border-dashed border-slate-600 rounded-lg p-8 text-center transition-colors",
                      isDraggingOver && "border-cyan-500 bg-cyan-500/10",
                      isUploadingImage && "opacity-75"
                    )}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {posterPreview || eventData.posterUrl ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-full max-w-xs aspect-video overflow-hidden rounded-lg border border-slate-700/60">
                          <img
                            src={posterPreview ?? eventData.posterUrl}
                            alt="Event poster preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-slate-300 text-sm">Drag & drop to replace or choose a different file.</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-white font-medium mb-2">Upload event image</h3>
                        <p className="text-slate-400 text-sm mb-4">PNG, JPG up to 10MB. Recommended: 1200x630px</p>
                      </>
                    )}
                    <input
                      ref={posterInputRef}
                      id="posterFile"
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handlePosterInputChange}
                    />
                    <Button
                      type="button"
                      onClick={() => posterInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Choose file"
                      )}
                    </Button>
                  </div>
                  {imageError ? (
                    <p className="text-sm text-red-400">{imageError}</p>
                  ) : eventData.posterUrl ? (
                    <p className="text-sm text-green-400">Image uploaded successfully.</p>
                  ) : null}
                  <p className="text-slate-400 text-sm">
                    This image will be stored on IPFS and displayed on your NFT tickets
                  </p>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-white">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={eventData.startDate}
                      onChange={(e) => setEventData({ ...eventData, startDate: e.target.value })}
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-white">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={eventData.startTime}
                      onChange={(e) => setEventData({ ...eventData, startTime: e.target.value })}
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                </div>

                {/* Venue */}
                <div className="space-y-2">
                  <Label htmlFor="venue" className="text-white">Venue</Label>
                  <Input
                    id="venue"
                    placeholder="Event venue or location"
                    value={eventData.venue}
                    onChange={(e) => setEventData({ ...eventData, venue: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>

                {/* Ticket Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketPrice" className="text-white">Ticket Price (SOL) *</Label>
                    <Input
                      id="ticketPrice"
                      type="number"
                      step="0.001"
                      placeholder="0.1"
                      value={eventData.ticketPrice}
                      onChange={(e) => setEventData({ ...eventData, ticketPrice: e.target.value })}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity" className="text-white">Capacity *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      placeholder="100"
                      value={eventData.capacity}
                      onChange={(e) => setEventData({ ...eventData, capacity: e.target.value })}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Event Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-white">
                    Event Tags
                  </Label>
                  <Input
                    id="tags"
                    placeholder="blockchain, web3, solana, nft (comma separated)"
                    value={eventData.tags}
                    onChange={(e) => setEventData({ ...eventData, tags: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                  />
                  <p className="text-slate-400 text-sm">Add relevant tags to help people discover your event</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-1">
            <Card className="backdrop-blur-md bg-white/10 border-slate-700/50 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-cyan-400" />
                  Live Preview
                </CardTitle>
                <p className="text-slate-300 text-sm">How your event will appear to attendees</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Event Preview */}
                  <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                    <div className="w-full h-32 rounded-lg flex items-center justify-center mb-4 overflow-hidden border border-slate-700/50 bg-slate-900/50">
                      {posterPreview || eventData.posterUrl ? (
                        <img
                          src={posterPreview ?? eventData.posterUrl}
                          alt="Event poster preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 text-sm">
                          <Upload className="w-8 h-8 mb-1" />
                          Event image will appear here
                        </div>
                      )}
                    </div>

                    <h3 className="text-white font-bold text-lg mb-2">{eventData.name || "Event Title"}</h3>

                    <p className="text-slate-300 text-sm mb-3 line-clamp-3">
                      {eventData.description || "Add a compelling event description to engage attendees."}
                    </p>

                    <div className="flex items-center text-slate-400 text-sm space-x-4 mb-3">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formattedStartDate ? (
                          <span>
                            {formattedStartDate}
                            {formattedStartTime ? ` • ${formattedStartTime}` : ""}
                            {formattedEndDate
                              ? formattedEndDate === formattedStartDate
                                ? formattedEndTime
                                  ? ` - ${formattedEndTime}`
                                  : ""
                                : ` → ${formattedEndDate}${formattedEndTime ? ` • ${formattedEndTime}` : ""}`
                              : ""}
                          </span>
                        ) : (
                          <span>Date not set</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center text-slate-400 text-sm mb-4">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{eventData.venue || "Location TBD"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-cyan-400">
                        <Ticket className="w-4 h-4 mr-1" />
                        <span>{formattedCapacity} capacity</span>
                      </div>
                      <span className="text-white font-semibold text-sm">{formattedPrice}</span>
                    </div>

                    {previewTags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {previewTags.map((tag) => (
                          <span key={tag} className="px-2 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* NFT Ticket Preview */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">NFT Ticket Preview</h4>
                    <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-lg p-4 border border-cyan-500/30">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">ET</span>
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">
                            {eventData.name || "Event Title"} - NFT Ticket
                          </div>
                          <div className="text-cyan-300 text-xs">
                            Minted on Solana blockchain • Collectible • Verifiable
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                      <div className="flex items-center text-slate-400 text-sm mb-2">
                        <div className="w-2 h-2 bg-slate-500 rounded-full mr-2"></div>
                        Preview Note
                      </div>
                      <p className="text-slate-400 text-xs">
                        This is how your event will appear on the marketplace. Make sure all information is accurate
                        before publishing.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {!createdEventId ? (
            <>
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                Save Draft
              </Button>
              <Button 
                onClick={createEvent}
                disabled={isCreating || !connected}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Event...
                  </>
                ) : !connected ? (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet to Create
                  </>
                ) : (
                  "Create Event"
                )}
              </Button>
            </>
          ) : !collectionCreated ? (
            <div className="w-full">
              <Card className="backdrop-blur-md bg-white/10 border-slate-700/50 mb-4">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                    Event Created Successfully!
                  </CardTitle>
                  <p className="text-slate-300 text-sm">
                    Now create a collection to publish your event and enable ticket sales.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 mb-4">
                    <h4 className="text-white font-medium mb-2">What happens next?</h4>
                    <ul className="text-slate-300 text-sm space-y-1">
                      <li>• Create an NFT collection for your tickets</li>
                      <li>• Your event will be published automatically</li>
                      <li>• Users can start purchasing tickets</li>
                    </ul>
                  </div>
                  
                  {connected && publicKey && (
                    <CreateCollectionButton
                      organizerPubkey={publicKey.toString()}
                      onCollectionCreated={handleCollectionCreated}
                      className="w-full"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="w-full text-center">
              <Card className="backdrop-blur-md bg-green-900/20 border-green-700/50">
                <CardContent className="pt-6">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">Event Published!</h3>
                  <p className="text-green-300 mb-4">
                    Your event has been created and published successfully. Redirecting to event page...
                  </p>
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-slate-300">Redirecting...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
