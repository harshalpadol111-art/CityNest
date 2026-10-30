import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RegisterPage() {
  const navigate = useNavigate(); const { register, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [submitting, setSubmitting] = useState(false);
  if (isAuthenticated) return <div className="auth-page"><div className="auth-card"><span className="premium-label">ACCOUNT</span><h1>You're already signed in.</h1><Link className="premium-primary" to="/dashboard">Open dashboard ↗</Link></div></div>;
  const submit = async (event) => { event.preventDefault(); setError(""); setSuccess(""); setSubmitting(true); try { await register(form); setSuccess("Account created. You can now sign in."); setTimeout(() => navigate("/login"), 700); } catch (err) { setError(err.message || "Unable to create account."); } finally { setSubmitting(false); } };
  return <div className="auth-page"><div className="auth-side register-side"><span className="premium-kicker"><span /> JOIN CITYNEST</span><h1>Make a new city<br /><em>feel familiar.</em></h1><p>One account for accommodation, local food, secondhand essentials and conversations with people who can help you settle in.</p><div className="auth-side-note">Simple · Local · Student-friendly</div></div><div className="auth-card"><span className="premium-label">GET STARTED</span><h2>Create your account.</h2><p className="auth-subtitle">It takes less than a minute.</p><form onSubmit={submit} className="premium-form"><label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required minLength={2} placeholder="Your full name" /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" /></label><label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} placeholder="At least 8 characters" /></label>{error && <div className="form-error">{error}</div>}{success && <div className="form-success">{success}</div>}<button className="premium-primary full" disabled={submitting}>{submitting ? "Creating…" : "Create account ↗"}</button></form><p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p></div></div>;
}
export default RegisterPage;
