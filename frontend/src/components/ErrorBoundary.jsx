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
        <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
          <section className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6 shadow-neon">
            <p className="text-sm uppercase tracking-[0.28em] text-libertyRed">Frontend error</p>
            <h1 className="mt-3 text-2xl font-semibold">AwakeMate could not render.</h1>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-red-50 p-4 text-sm text-libertyRed">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
