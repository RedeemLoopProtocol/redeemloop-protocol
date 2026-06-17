import { useState } from "react";
import type { RedeemLoopPaymentIntent } from "@redeemloop/core";
import { RedeemLoopClient } from "@redeemloop/sdk";

import { useRedeemLoopClient } from "./context.js";
import {
  runRedeemLoopPayFlow,
  type RedeemLoopPayFlowInput,
  type RedeemLoopPayFlowResult,
  type RedeemLoopPayStep,
} from "./flow.js";

export type RedeemLoopPayButtonState = "idle" | "working" | "transfer_ready" | "paid" | "error";

export interface RedeemLoopPayButtonLabels {
  idle?: string;
  working?: string;
  transferReady?: string;
  paid?: string;
  error?: string;
}

export interface RedeemLoopPayButtonProps extends RedeemLoopPayFlowInput {
  client?: RedeemLoopClient;
  className?: string;
  disabled?: boolean;
  labels?: RedeemLoopPayButtonLabels;
  onStep?: (step: RedeemLoopPayStep) => void;
  onIntent?: (intent: RedeemLoopPaymentIntent) => void;
  onComplete?: (result: RedeemLoopPayFlowResult) => void;
  onError?: (error: Error) => void;
}

const defaultLabels: Required<RedeemLoopPayButtonLabels> = {
  idle: "Pay with voucher",
  working: "Preparing payment",
  transferReady: "Transfer request ready",
  paid: "Paid",
  error: "Check payment",
};

export function RedeemLoopPayButton(props: RedeemLoopPayButtonProps) {
  const contextClient = props.client ? undefined : useOptionalRedeemLoopClient();
  const client = props.client ?? contextClient;
  const labels = { ...defaultLabels, ...props.labels };
  const [state, setState] = useState<RedeemLoopPayButtonState>("idle");
  const [error, setError] = useState<string>("");

  async function handleClick() {
    if (!client) {
      const nextError = new Error("RedeemLoop client is required");
      setState("error");
      setError(nextError.message);
      props.onError?.(nextError);
      return;
    }

    setState("working");
    setError("");
    try {
      const result = await runRedeemLoopPayFlow(client, props, {
        onStep: props.onStep,
      });
      props.onIntent?.(result.intent);
      props.onComplete?.(result);
      setState(result.intent.status === "paid" ? "paid" : "transfer_ready");
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("RedeemLoop payment failed");
      setState("error");
      setError(nextError.message);
      props.onError?.(nextError);
    }
  }

  const label =
    state === "working"
      ? labels.working
      : state === "transfer_ready"
        ? labels.transferReady
        : state === "paid"
          ? labels.paid
          : state === "error"
            ? labels.error
            : labels.idle;

  return (
    <span style={{ display: "inline-grid", gap: "0.5rem" }}>
      <button
        type="button"
        className={props.className}
        onClick={handleClick}
        disabled={props.disabled || state === "working" || state === "paid"}
        data-redeemloop-state={state}
        style={
          props.className
            ? undefined
            : {
                minHeight: 44,
                border: "1px solid #171a1f",
                borderRadius: 6,
                background: state === "paid" ? "#176b58" : "#171a1f",
                color: "#ffffff",
                padding: "0 16px",
                fontWeight: 700,
                cursor: state === "working" || state === "paid" ? "not-allowed" : "pointer",
              }
        }
      >
        {label}
      </button>
      {error ? (
        <span role="alert" style={{ maxWidth: 320, color: "#991b1b", fontSize: 13 }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}

function useOptionalRedeemLoopClient(): RedeemLoopClient | null {
  try {
    return useRedeemLoopClient();
  } catch {
    return null;
  }
}
