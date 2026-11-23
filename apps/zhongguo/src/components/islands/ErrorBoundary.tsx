import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="border border-border bg-surface p-8 text-center">
            <h2 className="font-serif text-xl font-bold mb-2 text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground">
              The flight planner could not be loaded. Please refresh the page and try again.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
