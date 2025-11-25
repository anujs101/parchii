// app/purchase-success/page.tsx
import React from "react";
import ClientPurchaseSuccess from "./ClientPurchaseSuccess";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Helper to safely pull a single string from searchParams
  const get = (k: string) => {
    const v = searchParams?.[k];
    if (Array.isArray(v)) return v[0] ?? "";
    return v ?? "";
  };

  const initialDetails = {
    eventTitle: get("event") || "Unknown Event",
    quantity: parseInt(get("quantity") || "1", 10) || 1,
    totalAmount: get("amount") || "0.000 SOL",
    transactionSignature: get("signature") || "",
    ticketPrice: parseFloat(get("price") || "0") || 0,
  };

  // Render client component and pass parsed params as props
  return <ClientPurchaseSuccess initialDetails={initialDetails} />;
}
// Keep page dynamic to avoid accidental SSG of other parts
  export const dynamic = "force-dynamic"; // note: harmless in server file
