'use client';
// src/components/boundaries/ComponentErrorBoundary.tsx
//
// Error Boundary: Wraps every dynamically-rendered component.
// If a component crashes (bad props, unexpected data shape, etc.),
// this renders a contained fallback tile instead of crashing the whole page.
//
// This is the key resilience mechanism on the frontend side.

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  componentId?: string;
  componentType?: string;
  fallbackClassName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production: send to Sentry, Datadog, etc.
    console.error(
      `[ComponentErrorBoundary] Component "${this.props.componentType ?? 'unknown'}" ` +
      `(id: ${this.props.componentId ?? 'n/a'}) crashed:`,
      error,
      errorInfo
    );
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className={`
          flex flex-col gap-2 items-start justify-center
          rounded-lg border border-amber-200 bg-amber-50
          p-4 text-amber-800 min-h-[80px]
          ${this.props.fallbackClassName ?? ''}
        `}
        role="alert"
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Component failed to load
            {this.props.componentType ? ` (${this.props.componentType})` : ''}
          </span>
        </div>

        {process.env.NODE_ENV === 'development' && this.state.error && (
          <p className="text-xs font-mono text-amber-700 opacity-80 truncate max-w-full">
            {this.state.error.message}
          </p>
        )}

        <button
          onClick={this.handleReset}
          className="
            flex items-center gap-1 text-xs font-medium
            text-amber-700 hover:text-amber-900
            underline underline-offset-2 cursor-pointer
            bg-transparent border-none p-0
          "
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }
}

// HOC wrapper for functional components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentType?: string
) {
  const WithBoundary = (props: P & { componentId?: string }) => (
    <ComponentErrorBoundary
      componentId={props.componentId}
      componentType={componentType}
    >
      <WrappedComponent {...props} />
    </ComponentErrorBoundary>
  );
  WithBoundary.displayName = `WithErrorBoundary(${componentType ?? 'Component'})`;
  return WithBoundary;
}
