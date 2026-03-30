import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                A runtime error prevented this screen from rendering.
              </p>
            </div>

            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground break-words border border-border rounded-lg px-3 py-2 bg-muted/30">
                {this.state.error.message}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button onClick={this.handleRetry} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button onClick={this.handleReload} size="sm">
                Reload App
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
