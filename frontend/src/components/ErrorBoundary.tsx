import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 text-[#1C2A1E]">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E8E3D7] shadow-lg text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-serif font-bold text-[#1A381E] mb-2">
              Something went wrong
            </h2>
            <p className="text-xs text-[#556755] mb-4 leading-relaxed">
              An unexpected display error occurred. You can reload the page or click below to restore the interface.
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 overflow-x-auto text-left font-mono mb-6 max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold py-3 px-4 rounded-full transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload EcoTrace Intelligence</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
