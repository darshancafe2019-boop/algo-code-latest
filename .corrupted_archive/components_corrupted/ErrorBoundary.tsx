"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  title?: string;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Redacts sensitive tokens, API secrets, passwords, and private keys from error logs.
 */
function sanitizeErrorLog(raw: any): any {
  if (!raw) return raw;
  try {
    const jsonStr = typeof raw === "string" ? raw : JSON.stringify(raw);
    return jsonStr.replace(
      /(token|secret|password|key|auth|bearer|cookie|session)=([^&\s,]+)/gi,
      "$1=[REDACTED]"
    );
  } catch {
    return "[Unserializable Error Payload]";
  }
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  private unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
    const route = typeof window !== "undefined" ? window.location.pathname : "/";
    console.warn(`[ASYNC_PROMISE_REJECTION] Caught in ErrorBoundary context [${this.props.title || "Root"}]`, {
      component: this.props.title || "Root",
      route,
      reason: sanitizeErrorLog(event.reason),
      timestamp: new Date().toISOString(),
    });
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidMount() {
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", this.unhandledRejectionHandler);
    }
  }

  public componentWillUnmount() {
    if (typeof window !== "undefined") {
      window.removeEventListener("unhandledrejection", this.unhandledRejectionHandler);
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const route = typeof window !== "undefined" ? window.location.pathname : "/";
    const component = this.props.title || "Component";
    const errorClass = error?.name || "Error";
    const message = error?.message || "Unknown error";
    const timestamp = new Date().toISOString();

    console.error(`[REACT_ERROR_BOUNDARY] [${component}] caught an error:`, {
      component,
      errorClass,
      message: sanitizeErrorLog(message),
      route,
      timestamp,
      componentStack: errorInfo.componentStack ? sanitizeErrorLog(errorInfo.componentStack) : undefined,
    });
  }

  public handleRetry = () => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch {}
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const err = this.state.error as any;
      const errorMessage = typeof err === "object" && err !== null
        ? (typeof err.message === "string" ? err.message : JSON.stringify(err))
        : (typeof err === "string" ? err : "An unexpected error occurred in this module.");

      return (
        <div className="rounded-2xl border border-[var(--theme-loss)]/30 bg-[var(--theme-loss)]/10 p-5 backdrop-blur-md text-[var(--theme-loss)] my-3 shadow-lg select-none font-sans">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-5 w-5 text-[var(--theme-loss)] shrink-0" />
            <h3 className="font-bold text-sm text-[var(--theme-text-primary)]">
              {this.props.title || "Section Component Failed"}
            </h3>
          </div>
          <p className="text-xs text-[var(--theme-text-muted)] mb-3 font-mono break-all">
            {errorMessage}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-primary)] text-xs font-mono font-bold transition-colors border border-[var(--theme-border)] shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
