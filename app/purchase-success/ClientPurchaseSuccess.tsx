// app/purchase-success/ClientPurchaseSuccess.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Loader2,
  ExternalLink,
  Copy,
  ArrowLeft,
  Ticket,
  Wallet,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface PurchaseDetails {
  eventTitle: string;
  quantity: number;
  totalAmount: string;
  transactionSignature: string;
  ticketPrice: number;
}

type MintingStatus = "processing" | "minting" | "completed" | "failed";

export default function ClientPurchaseSuccess({
  initialDetails,
}: {
  initialDetails: PurchaseDetails;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [purchaseDetails] = useState<PurchaseDetails>(initialDetails);
  const [mintingStatus, setMintingStatus] = useState<MintingStatus>(
    "processing"
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // If no signature, redirect to events (client-side)
    if (!purchaseDetails.transactionSignature) {
      router.push("/events");
      return;
    }

    let mounted = true;

    const simulateMinting = async () => {
      setMintingStatus("processing");
      setProgress(25);
      await new Promise((r) => setTimeout(r, 2000));

      if (!mounted) return;
      setMintingStatus("minting");
      setProgress(50);

      await new Promise((r) => setTimeout(r, 1500));
      if (!mounted) return;
      setProgress(75);
      await new Promise((r) => setTimeout(r, 1500));

      if (!mounted) return;
      setMintingStatus("completed");
      setProgress(100);

      toast({
        title: "NFT Tickets Minted!",
        description: `${purchaseDetails.quantity} ticket${
          purchaseDetails.quantity > 1 ? "s" : ""
        } successfully minted to your wallet.`,
      });
    };

    simulateMinting();
    return () => {
      mounted = false;
    };
  }, [purchaseDetails, router, toast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Transaction signature copied to clipboard.",
    });
  };

  const openInExplorer = (signature: string) => {
    window.open(
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      "_blank"
    );
  };

  const generateTicketIds = () =>
    Array.from({ length: purchaseDetails.quantity }, (_, i) =>
      `${purchaseDetails.eventTitle.replace(/\s+/g, "-").toLowerCase()}-${
        Date.now()
      }-${i + 1}`
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/events">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">
                Payment Successful!
              </h1>
              <p className="text-slate-300">
                Your payment has been confirmed and your NFT tickets are being
                processed.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Ticket className="w-5 h-5 mr-2 text-cyan-400" />
                Purchase Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Event</span>
                  <span className="text-white font-medium">
                    {purchaseDetails.eventTitle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quantity</span>
                  <span className="text-white">
                    {purchaseDetails.quantity} ticket
                    {purchaseDetails.quantity > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Paid</span>
                  <span className="text-cyan-400 font-bold">
                    {purchaseDetails.totalAmount}
                  </span>
                </div>
              </div>

              <Separator className="bg-slate-700" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Transaction</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:text-white hover:bg-slate-700"
                      onClick={() =>
                        copyToClipboard(purchaseDetails.transactionSignature)
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:text-white hover:bg-slate-700"
                      onClick={() =>
                        openInExplorer(purchaseDetails.transactionSignature)
                      }
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs font-mono bg-slate-900 text-slate-300 p-2 rounded break-all">
                  {purchaseDetails.transactionSignature}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-cyan-400" />
                NFT Ticket Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-slate-300">{progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {mintingStatus === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  )}
                  <span
                    className={
                      mintingStatus === "processing"
                        ? "text-cyan-400"
                        : "text-green-400"
                    }
                  >
                    Payment Confirmed
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {mintingStatus === "minting" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  ) : mintingStatus === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-500" />
                  )}
                  <span
                    className={
                      mintingStatus === "minting"
                        ? "text-cyan-400"
                        : mintingStatus === "completed"
                        ? "text-green-400"
                        : "text-slate-500"
                    }
                  >
                    Minting NFT Tickets
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {mintingStatus === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-500" />
                  )}
                  <span
                    className={
                      mintingStatus === "completed"
                        ? "text-green-400"
                        : "text-slate-500"
                    }
                  >
                    Tickets Delivered to Wallet
                  </span>
                </div>
              </div>

              {mintingStatus === "completed" && (
                <div className="mt-6 p-4 bg-green-600/10 border border-green-600/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-green-400 font-medium">
                      NFT Tickets Successfully Minted!
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">
                    Your {purchaseDetails.quantity} NFT ticket
                    {purchaseDetails.quantity > 1 ? "s have" : " has"} been
                    minted and delivered to your connected wallet.
                  </p>

                  <div className="space-y-2">
                    <span className="text-slate-400 text-sm">Ticket IDs:</span>
                    {generateTicketIds().map((ticketId, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-900 p-2 rounded"
                      >
                        <span className="text-xs font-mono text-slate-300">
                          {ticketId}
                        </span>
                        <Badge className="bg-cyan-600/20 text-cyan-400 border-cyan-600/30">
                          NFT #{index + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {mintingStatus === "completed" && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-slate-300">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-white">Check Your Wallet</p>
                      <p className="text-sm">
                        Your NFT tickets are now in your connected Solana wallet
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-white">Event Day</p>
                      <p className="text-sm">
                        Present your NFT tickets for entry verification
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-white">Confirmation Email</p>
                      <p className="text-sm">
                        Check your email for purchase confirmation and event
                        details
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Link href="/events" className="flex-1">
                    <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                      Browse More Events
                    </Button>
                  </Link>
                  <Link href="/my-tickets" className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                      View My Tickets
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
