import React from "react";

export default function About() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-federalBlue">Project profile</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">About AwakeMate</h1>
      </div>
      <section className="glass max-w-4xl rounded-xl p-6 text-slate-700">
        <p className="leading-7">
          AwakeMate is a full-stack AI drowsiness detection and focus monitoring system. The backend uses
          FastAPI, OpenCV, and MediaPipe Face Mesh to calculate Eye Aspect Ratio from live webcam frames. The
          frontend presents a premium AI SaaS dashboard with live telemetry, alarm state, focus score, session
          history, and analytics charts.
        </p>
      </section>
      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <section className="glass rounded-xl p-5">
          <h2 className="font-semibold text-slate-950">Resume Highlight</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Built a full-stack real-time computer vision system with WebSocket streaming, MediaPipe-based
            eye tracking, multi-level alarm logic, screenshot evidence capture, and CSV analytics.
          </p>
        </section>
        <section className="glass rounded-xl p-5">
          <h2 className="font-semibold text-slate-950">Use Cases</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Study productivity, desk-work focus tracking, fatigue awareness, and driver drowsiness prototyping.
          </p>
        </section>
      </div>
    </div>
  );
}
