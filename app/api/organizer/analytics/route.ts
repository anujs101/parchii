import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export async function POST(req: Request) {
  const { eventIds } = await req.json();

  if (!Array.isArray(eventIds))
    return NextResponse.json({ error: "eventIds must be array" }, { status: 400 });

  const tickets = await prisma.ticket.findMany({
    where: { eventId: { in: eventIds } }
  });

  const totalLamports = tickets.reduce((acc, t) => acc + BigInt(t.purchasePrice), BigInt(0));
  const sol = Number(totalLamports) / 1e9;

  // FAKE — replace with real aggregation later
  const dailySales = [
    { day: "Mon", revenue: 0.32 },
    { day: "Tue", revenue: 0.48 },
    { day: "Wed", revenue: 0.96 },
    { day: "Thu", revenue: 2.8 },
    { day: "Fri", revenue: 3.84 }
  ];

  return NextResponse.json({
    revenue: sol,
    ticketsSold: tickets.length,
    dailySales
  });
}
