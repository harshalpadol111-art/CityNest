import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  approveOwnerApplication,
  getAdminFoodPlaces,
  getAdminMarketplaceItems,
  getAdminProperties,
  getAdminReports,
  getOwnerApplications,
  getVerificationQueue,
  rejectOwnerApplication,
  setAdminFoodStatus,
  setAdminMarketplaceStatus,
  setAdminPropertyStatus,
  setOwnerVerification,
  updateAdminReport,
} from "../lib/api";

const REPORT_STATUSES = ["pending", "reviewed", "resolved", "dismissed"];

function AdminDashboardPage() {
  const [applications, setApplications] = useState([]);
  const [owners, setOwners] = useState([]);
  const [reports, setReports] = useState([]);
  const [properties, setProperties] = useState([]);
  const [food, setFood] = useState([]);
  const [marketplace, setMarketplace] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [apps, verification, reportData, propertyData, foodData, marketData] = await Promise.all([
        getOwnerApplications(),
        getVerificationQueue(),
        getAdminReports(),
        getAdminProperties(),
        getAdminFoodPlaces(),
        getAdminMarketplaceItems(),
      ]);

      setApplications(Array.isArray(apps) ? apps : []);
      setOwners(Array.isArray(verification) ? verification : []);
      setReports(Array.isArray(reportData) ? reportData : []);
      setProperties(Array.isArray(propertyData) ? propertyData : []);
      setFood(Array.isArray(foodData) ? foodData : []);
      setMarketplace(Array.isArray(marketData) ? marketData : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => ({
    pendingApplications: applications.filter((item) => item.status === "pending").length,
    verifiedOwners: owners.filter((item) => item.owner_verified).length,
    pendingReports: reports.filter((item) => item.status === "pending").length,
    activeListings: [
      ...properties.filter((item) => item.status === "active"),
      ...food.filter((item) => item.status === "active"),
      ...marketplace.filter((item) => item.status === "active"),
    ].length,
  }), [applications, owners, reports, properties, food, marketplace]);

  const applicationAction = async (id, action) => {
    setBusy(`application-${id}`);
    setError("");
    try {
      if (action === "approve") {
        await approveOwnerApplication(id);
      } else {
        await rejectOwnerApplication(id);
      }
      await load();
    } catch (requestError) {
      setError(requestError.message || "Owner application action failed.");
    } finally {
      setBusy(null);
    }
  };

  const verificationAction = async (owner) => {
    setBusy(`verification-${owner.id}`);
    setError("");
    try {
      const next = !owner.owner_verified;
      await setOwnerVerification(owner.id, next);
      setOwners((current) => current.map((item) => (
        item.id === owner.id
          ? { ...item, owner_verified: next }
          : item
      )));
    } catch (requestError) {
      setError(requestError.message || "Verification update failed.");
    } finally {
      setBusy(null);
    }
  };

  const reportAction = async (reportId, status) => {
    setBusy(`report-${reportId}`);
    setError("");
    try {
      const updated = await updateAdminReport(reportId, status);
      setReports((current) => current.map((report) => (
        report.id === reportId ? updated : report
      )));
    } catch (requestError) {
      setError(requestError.message || "Report update failed.");
    } finally {
      setBusy(null);
    }
  };

  const toggleListing = async (type, item) => {
    const key = `${type}-${item.id}`;
    setBusy(key);
    setError("");

    try {
      const isActive = item.status !== "active";
      if (type === "property") {
        await setAdminPropertyStatus(item.id, isActive);
        setProperties((current) => current.map((value) => (
          value.id === item.id ? { ...value, status: isActive ? "active" : "inactive" } : value
        )));
      } else if (type === "food") {
        await setAdminFoodStatus(item.id, isActive);
        setFood((current) => current.map((value) => (
          value.id === item.id ? { ...value, status: isActive ? "active" : "inactive" } : value
        )));
      } else {
        await setAdminMarketplaceStatus(item.id, isActive);
        setMarketplace((current) => current.map((value) => (
          value.id === item.id ? { ...value, status: isActive ? "active" : "inactive" } : value
        )));
      }
    } catch (requestError) {
      setError(requestError.message || "Listing moderation failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="cn-dashboard-page">
      <main className="cn-container">
        <section className="cn-dashboard-header">
          <div>
            <span className="eyebrow">ADMIN CONSOLE</span>
            <h1>Keep CityNest useful and trustworthy.</h1>
            <p>
              Review owner access, verify providers, resolve reports and moderate listings from one place.
            </p>
          </div>
          <button className="secondary-button" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh data"}
          </button>
        </section>

        {error && <div className="form-error">{error}</div>}

        <section className="cn-dashboard-stats">
          <button type="button" className="cn-stat-card" onClick={() => document.getElementById("admin-applications")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <strong>{stats.pendingApplications}</strong><span>Pending applications</span>
          </button>
          <button type="button" className="cn-stat-card" onClick={() => document.getElementById("admin-verification")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <strong>{stats.verifiedOwners}</strong><span>Verified owners</span>
          </button>
          <button type="button" className="cn-stat-card" onClick={() => document.getElementById("admin-reports")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <strong>{stats.pendingReports}</strong><span>Open reports</span>
          </button>
          <button type="button" className="cn-stat-card" onClick={() => document.getElementById("admin-listings")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <strong>{stats.activeListings}</strong><span>Active listings</span>
          </button>
        </section>

        {loading ? (
          <div className="cn-detail-state">
            <div className="cn-spinner" />
            <strong>Loading administration data…</strong>
          </div>
        ) : (
          <>
            <section id="admin-applications" className="cn-dashboard-section">
              <div className="cn-section-heading">
                <div>
                  <span className="eyebrow">OWNER ACCESS</span>
                  <h2>Applications.</h2>
                </div>
              </div>
              {applications.length === 0 ? (
                <div className="cn-state-card compact"><strong>No owner applications.</strong></div>
              ) : (
                <div className="cn-dashboard-list">
                  {applications.map((application) => (
                    <div className="cn-dashboard-list-item" key={application.id}>
                      <div>
                        <span>{application.applicant_type}</span>
                        <strong>Application #{application.id}</strong>
                        <p>{application.description}</p>
                      </div>
                      <div className="admin-actions">
                        <small>{application.status}</small>
                        {application.status === "pending" && (
                          <>
                            <button
                              className="primary-button"
                              disabled={busy === `application-${application.id}`}
                              onClick={() => void applicationAction(application.id, "approve")}
                            >
                              Approve
                            </button>
                            <button
                              className="secondary-button"
                              disabled={busy === `application-${application.id}`}
                              onClick={() => void applicationAction(application.id, "reject")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section id="admin-verification" className="cn-dashboard-section">
              <div className="cn-section-heading">
                <div>
                  <span className="eyebrow">TRUST</span>
                  <h2>Owner verification.</h2>
                </div>
              </div>
              <div className="cn-dashboard-list">
                {owners.map((owner) => (
                  <div className="cn-dashboard-list-item" key={owner.id}>
                    <div>
                      <span>{owner.email}</span>
                      <strong>{owner.full_name}</strong>
                      <p>{owner.owner_verified ? "Verified owner" : "Not verified"}</p>
                    </div>
                    <button
                      className={owner.owner_verified ? "secondary-button" : "primary-button"}
                      disabled={busy === `verification-${owner.id}`}
                      onClick={() => void verificationAction(owner)}
                    >
                      {owner.owner_verified ? "Remove verification" : "Verify owner"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section id="admin-reports" className="cn-dashboard-section">
              <div className="cn-section-heading">
                <div>
                  <span className="eyebrow">REPORTS</span>
                  <h2>Listing reports.</h2>
                </div>
              </div>
              {reports.length === 0 ? (
                <div className="cn-state-card compact"><strong>No reports have been submitted.</strong></div>
              ) : (
                <div className="cn-dashboard-list">
                  {reports.map((report) => (
                    <div className="cn-dashboard-list-item" key={report.id}>
                      <div>
                        <span>{report.listing_type} · listing #{report.listing_id}</span>
                        <strong>{report.reason}</strong>
                        <p>{report.description || "No additional description."}</p>
                      </div>
                      <div className="admin-report-actions">
                        <select
                          value={report.status}
                          disabled={busy === `report-${report.id}`}
                          onChange={(event) => void reportAction(report.id, event.target.value)}
                        >
                          {REPORT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div id="admin-listings" />
            <ModerationSection
              title="Stay listings"
              items={properties}
              type="property"
              getTitle={(item) => item.title}
              getMeta={(item) => `₹${Number(item.monthly_rent || 0).toLocaleString("en-IN")}/month · ${item.status}`}
              busy={busy}
              onToggle={toggleListing}
            />
            <ModerationSection
              title="Food listings"
              items={food}
              type="food"
              getTitle={(item) => item.name}
              getMeta={(item) => `${item.food_type || "Local food"} · ${item.status}`}
              busy={busy}
              onToggle={toggleListing}
            />
            <ModerationSection
              title="Marketplace listings"
              items={marketplace}
              type="marketplace"
              getTitle={(item) => item.title}
              getMeta={(item) => `₹${Number(item.price || 0).toLocaleString("en-IN")} · ${item.status}`}
              busy={busy}
              onToggle={toggleListing}
            />
          </>
        )}
      </main>
    </div>
  );
}

function ModerationSection({ title, items, type, getTitle, getMeta, busy, onToggle }) {
  return (
    <section className="cn-dashboard-section">
      <div className="cn-section-heading">
        <div>
          <span className="eyebrow">MODERATION</span>
          <h2>{title}.</h2>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="cn-state-card compact"><strong>No listings.</strong></div>
      ) : (
        <div className="cn-dashboard-list">
          {items.slice(0, 12).map((item) => {
            const active = item.status === "active";
            const key = `${type}-${item.id}`;
            return (
              <div className="cn-dashboard-list-item" key={item.id}>
                <div>
                  <span>{getMeta(item)}</span>
                  <strong>{getTitle(item)}</strong>
                  <Link className="admin-open-link" to={`/${type === "property" ? "stay" : type === "food" ? "food" : "marketplace"}/${item.id}`}>Open listing →</Link>
                </div>
                <button
                  className={active ? "secondary-button" : "primary-button"}
                  disabled={busy === key}
                  onClick={() => void onToggle(type, item)}
                >
                  {active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AdminDashboardPage;
