import React from "react";
import { Mail, Phone } from "lucide-react";

const faqs = [
  ["How do I change alert timing?", "Use Dashboard mode controls or Settings to choose threshold seconds for each mode."],
  ["Can each mode have its own alarm?", "Yes. Study, Work, and Driving can each use low, medium, very loud, or continuous alarms."],
  ["Where is my history saved?", "Sessions are saved in the local SQLite database. When signed in, history is linked to that account."],
  ["Why does the browser ask for camera access?", "AwakeMate uses live webcam frames locally for drowsiness detection during active sessions."],
];

export default function Help() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-libertyRed">Support</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Help</h1>
      </div>

      <section className="glass max-w-5xl rounded-xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map(([question, answer]) => (
            <div key={question} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="font-semibold text-slate-950">{question}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href="mailto:awakematee@gmail.com?subject=AwakeMate%20Support&body=Hi%20AwakeMate%20team%2C%0A%0AI%20need%20help%20with%3A%0A"
            aria-label="Write us at awakematee@gmail.com"
            className="flex items-center justify-center gap-2 rounded-xl bg-federalBlue px-4 py-3 font-semibold text-white transition hover:bg-patriotBlue"
          >
            <Mail size={18} aria-hidden="true" />
            Write us at awakematee@gmail.com
          </a>
          <a
            href="tel:+919912169094"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-50"
          >
            <Phone size={18} aria-hidden="true" />
            +91 9912169094
          </a>
        </div>
      </section>
    </div>
  );
}
