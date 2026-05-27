import React, { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "firebase/auth";
import { Activity, LogIn, Mail, Phone, ShieldCheck, UserPlus } from "lucide-react";
import {
  auth,
  createRecaptcha,
  ensureUserProfile,
  firebaseMissingKeys,
  firebaseReady,
  googleProvider,
  sendPhoneOtp,
} from "../firebase";

export default function Auth() {
  const recaptchaRef = useRef(null);
  const verifierRef = useRef(null);
  const confirmationRef = useRef(null);
  const [view, setView] = useState("login");
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "", otp: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const describedBy = `${message ? "auth-message " : ""}${error ? "auth-error" : ""}`.trim() || undefined;

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) ensureUserProfile(result.user, result.user.displayName || "").catch(() => {});
      })
      .catch((exc) => setError(authError(exc, "Google login failed.")));
    return () => {
      verifierRef.current?.clear?.();
      verifierRef.current = null;
    };
  }, []);

  function reset(nextView) {
    setView(nextView);
    setStep("form");
    setMessage("");
    setError("");
    confirmationRef.current = null;
    setForm({ name: "", email: "", password: "", confirmPassword: "", phone: "", otp: "" });
  }

  function authError(exc, fallback) {
    const messages = {
      "auth/configuration-not-found": "Firebase Authentication is not enabled for this project. In Firebase Console, enable Authentication and turn on the Email/Password provider.",
      "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Console.",
      "auth/unauthorized-domain": "This local domain is not authorized in Firebase Authentication settings.",
      "auth/email-already-in-use": "An account already exists with this email. Please login instead.",
      "auth/invalid-credential": "Invalid email or password.",
      "auth/user-not-found": "No account found. Please sign up first.",
      "auth/wrong-password": "Incorrect password.",
      "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    };
    if (exc?.code && messages[exc.code]) return messages[exc.code];
    return exc?.message || fallback;
  }

  function actionCodeSettings() {
    return {
      url: window.location.origin,
      handleCodeInApp: false,
    };
  }

  async function handleSignup(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(credential.user, { displayName: form.name.trim() });
      await sendEmailVerification(credential.user, actionCodeSettings());
      ensureUserProfile(credential.user, form.name.trim()).catch(() => {});
      await signOut(auth);
      setMessage("Account created. Verification email sent. Verify your email, then login.");
      setView("login");
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch (exc) {
      setError(authError(exc, "Signup failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user, actionCodeSettings());
        await signOut(auth);
        setError("Email is not verified. A new verification email has been sent. Verify it, then login again.");
        return;
      }
      ensureUserProfile(credential.user, credential.user.displayName || "").catch(() => {});
    } catch (exc) {
      setError(authError(exc, "Login failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, form.email.trim(), actionCodeSettings());
      setMessage("Password reset request sent. Check inbox and spam for an email from Firebase or noreply.");
    } catch (exc) {
      setError(authError(exc, "Could not send reset email."));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      if (window.matchMedia("(max-width: 768px)").matches) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      const credential = await signInWithPopup(auth, googleProvider);
      await ensureUserProfile(credential.user, credential.user.displayName || "");
    } catch (exc) {
      setError(authError(exc, "Google login failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handlePhone(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (step === "form") {
        verifierRef.current?.clear?.();
        verifierRef.current = createRecaptcha("firebase-recaptcha");
        confirmationRef.current = await sendPhoneOtp(form.phone.trim(), verifierRef.current);
        setStep("otp");
        setMessage("OTP sent to your phone.");
      } else {
        const credential = await confirmationRef.current.confirm(form.otp.trim());
        await ensureUserProfile(credential.user, credential.user.phoneNumber || "");
      }
    } catch (exc) {
      setError(authError(exc, "Phone login failed."));
      verifierRef.current?.clear?.();
      verifierRef.current = null;
    } finally {
      setLoading(false);
    }
  }

  if (!firebaseReady) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <section className="glass w-full max-w-md rounded-xl p-6" role="alert">
          <h1 className="text-2xl font-semibold text-slate-950">Firebase setup required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Add Firebase web config values to `frontend/.env` before using real authentication.
          </p>
          <p className="mt-3 text-sm text-libertyRed">Missing: {firebaseMissingKeys.join(", ")}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="glass w-full max-w-md rounded-xl p-6" aria-labelledby="auth-title">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-federalBlue text-white shadow-neon" aria-hidden="true">
            <Activity size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 id="auth-title" className="text-2xl font-semibold text-slate-950">AwakeMate</h1>
            <p className="text-sm text-slate-500">
              {view === "login" ? "Login to continue" : view === "signup" ? "Create your account" : view === "phone" ? "Login with phone OTP" : "Reset your password"}
            </p>
          </div>
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin} className="grid gap-4" aria-describedby={describedBy}>
            <label htmlFor="login-email" className="text-sm text-slate-600">
              Email
              <input id="login-email" type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} required />
            </label>
            <label htmlFor="login-password" className="text-sm text-slate-600">
              Password
              <input id="login-password" type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} required />
            </label>
            <button disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-federalBlue px-4 py-3 font-semibold text-white transition hover:bg-patriotBlue disabled:opacity-60">
              <LogIn size={18} aria-hidden="true" />
              {loading ? "Checking" : "Login"}
            </button>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <button type="button" onClick={() => reset("forgot")} className="font-medium text-federalBlue">Forgot Password?</button>
              <button type="button" onClick={() => reset("phone")} className="font-medium text-federalBlue">Phone OTP</button>
              <button type="button" onClick={() => reset("signup")} className="font-medium text-libertyRed">Signup</button>
            </div>
          </form>
        )}

        {view === "signup" && (
          <form onSubmit={handleSignup} className="grid gap-4" aria-describedby={describedBy}>
            <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-federalBlue">
              Signup sends a Firebase verification email. You can login after verifying it.
            </p>
            <label htmlFor="signup-name" className="text-sm text-slate-600">
              Full name
              <input id="signup-name" autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
            </label>
            <label htmlFor="signup-email" className="text-sm text-slate-600">
              Email
              <input id="signup-email" type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} required />
            </label>
            <label htmlFor="signup-password" className="text-sm text-slate-600">
              Password
              <input id="signup-password" type="password" autoComplete="new-password" minLength={6} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} required />
            </label>
            <label htmlFor="signup-confirm-password" className="text-sm text-slate-600">
              Confirm password
              <input id="signup-confirm-password" type="password" autoComplete="new-password" minLength={6} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950" value={form.confirmPassword} onChange={(e) => setForm((c) => ({ ...c, confirmPassword: e.target.value }))} required />
            </label>
            <button disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-federalBlue px-4 py-3 font-semibold text-white transition hover:bg-patriotBlue disabled:opacity-60">
              <UserPlus size={18} aria-hidden="true" />
              {loading ? "Creating" : "Signup & Verify Email"}
            </button>
            <button type="button" onClick={() => reset("login")} className="text-sm font-medium text-federalBlue">Already have an account? Login</button>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgot} className="grid gap-4" aria-describedby={describedBy}>
            <label htmlFor="forgot-email" className="text-sm text-slate-600">
              Email
              <input id="forgot-email" type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} required />
            </label>
            <button disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-federalBlue px-4 py-3 font-semibold text-white transition hover:bg-patriotBlue disabled:opacity-60">
              <ShieldCheck size={18} aria-hidden="true" />
              Send Reset Email
            </button>
            <button type="button" onClick={() => reset("login")} className="text-sm font-medium text-federalBlue">Back to login</button>
          </form>
        )}

        {view === "phone" && (
          <form onSubmit={handlePhone} className="grid gap-4" aria-describedby={describedBy}>
            <label htmlFor="phone-number" className="text-sm text-slate-600">
              Phone number
              <input id="phone-number" type="tel" autoComplete="tel" placeholder="+919876543210" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950" value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} disabled={step === "otp"} required />
            </label>
            {step === "otp" && (
              <label htmlFor="phone-otp" className="text-sm text-slate-600">
                OTP
                <input id="phone-otp" inputMode="numeric" autoComplete="one-time-code" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950" value={form.otp} onChange={(e) => setForm((c) => ({ ...c, otp: e.target.value }))} required />
              </label>
            )}
            <div id="firebase-recaptcha" ref={recaptchaRef} />
            <button disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-federalBlue px-4 py-3 font-semibold text-white transition hover:bg-patriotBlue disabled:opacity-60">
              <Phone size={18} aria-hidden="true" />
              {step === "otp" ? "Verify OTP" : "Send OTP"}
            </button>
            <button type="button" onClick={() => reset("login")} className="text-sm font-medium text-federalBlue">Back to login</button>
          </form>
        )}

        {message && <p id="auth-message" role="status" className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-federalBlue">{message}</p>}
        {error && <p id="auth-error" role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-libertyRed">{error}</p>}

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
          <Mail size={17} aria-hidden="true" />
          Continue with Google
        </button>
      </section>
    </main>
  );
}
