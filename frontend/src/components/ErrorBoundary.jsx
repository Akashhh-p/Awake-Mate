import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-obsidian px-6 py-10 text-white">
          <section className="mx-auto max-w-3xl rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6">
            <p className="text-sm uppercase tracking-[0.28em] text-rose-200">Frontend error</p>
            <h1 className="mt-3 text-2xl font-semibold">AwakeMate could not render.</h1>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-rose-100">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
