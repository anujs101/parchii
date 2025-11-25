import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizer = searchParams.get("organizer");

  if (!organizer)
    return NextResponse.json({ error: "Organizer missing" }, { status: 400 });

  const events = await prisma.event.findMany({
    where: { organizerPubkey: organizer },
    orderBy: { startTime: "desc" },
    include: {
      tickets: {
        select: { status: true }
      }
    }
  });

  const mapped = events.map((e) => ({
    eventId: e.eventId,
    name: e.name,
    startTime: e.startTime,
    endTime: e.endTime,
    capacity: e.capacity,
    posterUrl: e.posterUrl,
    priceLamports: String(e.priceLamports),
    state: e.state,
    collectionPubkey: e.collectionPubkey,
    ticketsSold: e.tickets.filter(t => t.status === "ACTIVE" || t.status === "USED").length
  }));

  return NextResponse.json(mapped);
}
