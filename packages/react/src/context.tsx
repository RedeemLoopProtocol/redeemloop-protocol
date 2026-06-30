import { createContext, useContext, useMemo, type ReactNode } from "react";
import { RedeemLoopClient } from "@redeemloop/sdk";

const RedeemLoopClientContext = createContext<RedeemLoopClient | null>(null);

export interface RedeemLoopProviderProps {
  client?: RedeemLoopClient;
  baseUrl?: string;
  apiKey?: string;
  children: ReactNode;
}

export function RedeemLoopProvider({ client, baseUrl = "http://localhost:3002", apiKey, children }: RedeemLoopProviderProps) {
  const resolvedClient = useMemo(() => client ?? new RedeemLoopClient(baseUrl, apiKey), [apiKey, baseUrl, client]);
  return <RedeemLoopClientContext.Provider value={resolvedClient}>{children}</RedeemLoopClientContext.Provider>;
}

export function useRedeemLoopClient(): RedeemLoopClient {
  const client = useContext(RedeemLoopClientContext);
  if (!client) throw new Error("useRedeemLoopClient must be used within RedeemLoopProvider or with a client prop");
  return client;
}
