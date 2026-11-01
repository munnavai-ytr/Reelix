// Error Boundary Component around Studio Tabs
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Copy, Check, RotateCcw } from 'lucide-react';
import { Logger } from '@/storage/logger';

interface Props {
  tabName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.logError(`ErrorBoundary [${this.props.tabName}]`, error, errorInfo.componentStack || undefined);
  }

  private handleCopy = () => {
    if (this.state.error) {
      navigator.clipboard.writeText(`${this.state.error.message}\n${this.state.error.stack || ''}`);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-8 max-w-lg mx-auto rounded-3xl bg-[#12121C] border border-rose-500/30 shadow-2xl space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Something went wrong in {this.props.tabName}</h3>
            <p className="text-xs font-mono text-rose-300 mt-2 bg-[#0A0A10] p-3 rounded-xl border border-rose-500/20 text-left line-clamp-4 break-words">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleCopy}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 border border-white/10 transition-colors"
            >
              {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{this.state.copied ? 'Copied' : 'Copy details'}</span>
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl brand-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/20 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload Tab</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
