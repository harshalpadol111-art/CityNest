import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <div className="auth-page"><div className="auth-card"><span className="premium-label">ACCOUNT</span><h1>You're already signed in.</h1><Link className="premium-primary" to="/dashboard">Open dashboard ↗</Link></div></div>;

  const submit = async (event) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try { await login(email, password); navigate(location.state?.from || "/dashboard", { replace: true }); }
    catch (err) { setError(err.message || "Unable to sign in."); }
    finally { setSubmitting(false); }
  };

  return <div className="auth-page"><div className="auth-side"><span className="premium-kicker"><span /> CITYNEST</span><h1>Welcome back<br /><em>to your city.</em></h1><p>Save places, message owners and keep your relocation journey in one place.</p><div className="auth-side-note">Chhatrapati Sambhajinagar · Maharashtra</div></div><div className="auth-card"><span className="premium-label">SIGN IN</span><h2>Welcome back.</h2><p className="auth-subtitle">Use your CityNest account to continue.</p><form onSubmit={submit} className="premium-form"><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Your password" /></label>{error && <div className="form-error">{error}</div>}<button className="premium-primary full" disabled={submitting}>{submitting ? "Signing in…" : "Sign in ↗"}</button></form><p className="auth-switch">New to CityNest? <Link to="/register">Create an account</Link></p></div></div>;
}
export default LoginPage;
