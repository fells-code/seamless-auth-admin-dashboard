/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Bumping this resets the boundary, so a route change clears a stale error. */
  resetKey?: string;
};

type State = { error: Error | null };

/**
 * Keeps a render error inside one screen instead of unmounting the console.
 *
 * React unmounts the whole tree when an error escapes rendering, which left an
 * empty page with no message and no way back other than a manual reload. A
 * class component is required: there is no hook equivalent of
 * `componentDidCatch`.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    // Without this a boundary that has caught keeps rendering the error state
    // forever, so navigating away from the broken screen would not recover.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div
          role="alert"
          className="w-full max-w-md rounded-2xl border border-subtle bg-surface p-6 text-center shadow-lg"
        >
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-[var(--highlight)]">
            <AlertTriangle size={22} />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-semibold tracking-tight">
              This screen could not be displayed
            </h1>
            <p className="text-sm text-muted">
              Something went wrong while rendering this page. The rest of the
              console is still available.
            </p>

            {import.meta.env.DEV && (
              <p className="break-words text-xs text-muted">{error.message}</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={this.retry}
              className="btn btn-primary"
            >
              Try again
            </button>
            <a href="/" className="btn btn-secondary">
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
