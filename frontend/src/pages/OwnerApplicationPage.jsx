import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { createOwnerApplication, getMyOwnerApplications } from "../lib/api";

function OwnerApplicationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applicantType, setApplicantType] = useState("Property owner");
  const [description, setDescription] = useState("");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadApplications = async () => {
    try {
      const data = await getMyOwnerApplications();
      setApplications(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load your owner applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const pending = applications.find((application) => application.status === "pending");

  const submitApplication = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await createOwnerApplication({
        applicant_type: applicantType,
        description: description.trim(),
      });
      setDescription("");
      setSuccess("Your owner application has been submitted. An admin will review it shortly.");
      await loadApplications();
    } catch (requestError) {
      setError(requestError.message || "Unable to submit your owner application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role === "owner" || user?.role === "admin") {
    return (
      <div className="cn-detail-state">
        <span className="eyebrow">OWNER ACCESS</span>
        <strong>You already have platform access.</strong>
        <p>Your account is already approved for owner tools.</p>
        <button className="primary-button" onClick={() => navigate(user.role === "admin" ? "/admin" : "/owner")}>
          {user.role === "admin" ? "Open admin console" : "Open Owner Studio"}
        </button>
      </div>
    );
  }

  return (
    <div className="cn-dashboard-page">
      <main className="cn-container">
        <section className="cn-dashboard-header">
          <div>
            <span className="eyebrow">OWNER ACCESS</span>
            <h1>Become a CityNest owner.</h1>
            <p>
              Have a room, property, mess or local item to offer? Apply for owner access and start listing after admin approval.
            </p>
          </div>
          <div className="cn-profile-card">
            <div className="cn-profile-avatar">{user?.full_name?.charAt(0)?.toUpperCase() || "U"}</div>
            <div>
              <strong>{user?.full_name}</strong>
              <span>{user?.email}</span>
              <small>Role: {user?.role}</small>
            </div>
          </div>
        </section>

        <section className="cn-dashboard-grid" style={{ marginTop: 30 }}>
          <div className="cn-dashboard-main">
            <section className="cn-dashboard-section">
              <div className="cn-section-heading">
                <div>
                  <span className="eyebrow">APPLICATION</span>
                  <h2>Tell us what you want to list.</h2>
                </div>
              </div>

              {pending ? (
                <div className="cn-state-card compact" style={{ marginTop: 18 }}>
                  <strong>Application under review.</strong>
                  <p>Your request is pending admin approval. You do not need to submit another application.</p>
                  <span className="cn-form-success">Status: Pending</span>
                </div>
              ) : (
                <form className="cn-sell-form" onSubmit={submitApplication}>
                  <label className="cn-field">
                    <span>Applicant type</span>
                    <select value={applicantType} onChange={(event) => setApplicantType(event.target.value)} disabled={submitting}>
                      <option>Property owner</option>
                      <option>Food / mess owner</option>
                      <option>Marketplace seller</option>
                      <option>Property manager</option>
                      <option>Other local provider</option>
                    </select>
                  </label>

                  <label className="cn-field" style={{ marginTop: 15 }}>
                    <span>Why do you want owner access?</span>
                    <textarea
                      rows="6"
                      minLength={10}
                      maxLength={2000}
                      required
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Tell CityNest what you plan to list and where it is located."
                      disabled={submitting}
                    />
                  </label>

                  {error && <p className="cn-form-error">{error}</p>}
                  {success && <p className="cn-form-success">{success}</p>}

                  <button className="primary-button" type="submit" disabled={submitting || description.trim().length < 10}>
                    {submitting ? "Submitting application..." : "Submit owner application"}
                  </button>
                </form>
              )}
            </section>
          </div>

          <aside className="cn-dashboard-sidebar">
            <section className="cn-dashboard-section compact-section">
              <span className="eyebrow">HOW IT WORKS</span>
              <h2>One review before listing.</h2>
              <div className="cn-dashboard-list">
                <div className="cn-dashboard-list-item"><div><span>01</span><strong>Apply</strong><p>Submit your owner details and listing intent.</p></div></div>
                <div className="cn-dashboard-list-item"><div><span>02</span><strong>Admin review</strong><p>CityNest checks the request before granting access.</p></div></div>
                <div className="cn-dashboard-list-item"><div><span>03</span><strong>Start listing</strong><p>Approved owners get access to Owner Studio.</p></div></div>
              </div>
            </section>

            <section className="cn-dashboard-section compact-section">
              <span className="eyebrow">YOUR HISTORY</span>
              <h2>Previous applications.</h2>
              {loading ? <p className="cn-muted">Loading application history...</p> : applications.length === 0 ? <p className="cn-muted">No previous applications.</p> : <div className="cn-dashboard-list">{applications.map((application) => <div className="cn-dashboard-list-item" key={application.id}><div><span>{application.status}</span><strong>{application.applicant_type}</strong><p>{application.description}</p></div></div>)}</div>}
            </section>

            <Link className="secondary-button full" to="/dashboard">Back to dashboard</Link>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default OwnerApplicationPage;
