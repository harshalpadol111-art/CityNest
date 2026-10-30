import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  deleteMarketplaceItem,
  getFavorites,
  getMyMarketplaceItems,
  getMyVisitRequests,
  getNotifications,
  getConversations,
  getFoodPlace,
  getMarketplaceItem,
  getProperty,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/api";

function DashboardPage() {
  const { user } = useAuth();
  const [favoriteDetails, setFavoriteDetails] = useState([]);
  const [visits, setVisits] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [favoriteData, visitData, conversationData, notificationData, marketplaceData] = await Promise.all([
        getFavorites(),
        getMyVisitRequests(),
        getConversations(),
        getNotifications(),
        getMyMarketplaceItems().catch(() => []),
      ]);

      const safeFavorites = Array.isArray(favoriteData) ? favoriteData : [];
      setVisits(Array.isArray(visitData) ? visitData : []);
      setConversations(Array.isArray(conversationData) ? conversationData : []);
      setNotifications(Array.isArray(notificationData) ? notificationData : []);
      setMyItems(Array.isArray(marketplaceData) ? marketplaceData : []);

      const details = await Promise.all(safeFavorites.map(async (favorite) => {
        try {
          if (favorite.property_id) return { ...favorite, type: "property", item: await getProperty(favorite.property_id) };
          if (favorite.food_place_id) return { ...favorite, type: "food", item: await getFoodPlace(favorite.food_place_id) };
          if (favorite.marketplace_item_id) return { ...favorite, type: "marketplace", item: await getMarketplaceItem(favorite.marketplace_item_id) };
        } catch {
          return null;
        }
        return null;
      }));
      setFavoriteDetails(details.filter(Boolean));
    } catch (requestError) {
      setError(requestError.message || "Unable to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
  const inquiryCount = useMemo(() => conversations.filter((item) => item.owner_id === user?.id).length, [conversations, user?.id]);

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationMessage("This browser does not support notifications.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationMessage(permission === "granted" ? "Notifications are enabled for CityNest." : "Notification permission was not granted.");
    } catch {
      setNotificationMessage("Could not request notification permission.");
    }
  };

  const markRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    } catch (requestError) {
      console.error(requestError);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (requestError) {
      console.error(requestError);
    }
  };

  if (loading) return <div className="cn-detail-state"><div className="cn-spinner" /><strong>Loading your dashboard...</strong><span>Gathering saved listings, visits and conversations.</span></div>;
  if (error) return <div className="cn-detail-state"><strong>Dashboard unavailable.</strong><p>{error}</p><button className="primary-button" onClick={load}>Try again</button></div>;

  return (
    <div className="cn-dashboard-page">
      <main className="cn-container">
        <section className="cn-dashboard-header">
          <div><span className="eyebrow">YOUR CITYNEST</span><h1>Welcome back, {user?.full_name?.split(" ")[0] || "there"}.</h1><p>Everything connected to your relocation journey, in one place.</p></div>
          <div className="cn-profile-card"><div className="cn-profile-avatar">{user?.full_name?.charAt(0)?.toUpperCase() || "U"}</div><div><strong>{user?.full_name}</strong><span>{user?.email}</span>{user?.phone && <span>{user.phone}</span>}<small>Role: {user?.role}</small></div></div>
        </section>

        <section className="cn-dashboard-stats">
          <button type="button" className="cn-stat-card" onClick={() => document.getElementById("dashboard-favorites")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <strong>{favoriteDetails.length}</strong><span>Saved listings</span>
          </button>
          <button type="button" className="cn-stat-card" onClick={() => document.getElementById("dashboard-visits")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <strong>{visits.length}</strong><span>Visit requests</span>
          </button>
          <button type="button" className="cn-stat-card" onClick={() => document.getElementById("dashboard-conversations")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <strong>{conversations.length}</strong><span>Conversations</span>
          </button>
          <button type="button" className="cn-stat-card" onClick={() => document.getElementById("dashboard-conversations")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <strong>{inquiryCount}</strong><span>Listing inquiries</span>
          </button>
        </section>



        <section className="cn-dashboard-grid">
          <div className="cn-dashboard-main">
            <section id="dashboard-favorites" className="cn-dashboard-section">
              <div className="cn-section-heading"><div><span className="eyebrow">SAVED</span><h2>Your favorites.</h2></div><Link to="/stay" className="secondary-button">Explore</Link></div>
              {favoriteDetails.length === 0 ? <div className="cn-state-card compact"><strong>No saved listings yet.</strong><p>Save a property, mess or marketplace item and it will appear here.</p></div> : <div className="cn-dashboard-list">{favoriteDetails.map((favorite) => { const item = favorite.item; const title = favorite.type === "food" ? item.name : item.title; const href = favorite.type === "property" ? `/stay/${item.id}` : favorite.type === "food" ? `/food/${item.id}` : `/marketplace/${item.id}`; return <Link className="cn-dashboard-list-item" to={href} key={favorite.id}><div><span>{favorite.type}</span><strong>{title}</strong><p>{favorite.type === "property" ? `₹${Number(item.monthly_rent).toLocaleString("en-IN")}/month` : favorite.type === "food" ? `${item.monthly_price ? `₹${Number(item.monthly_price).toLocaleString("en-IN")}/month` : "Local food"}` : `₹${Number(item.price).toLocaleString("en-IN")}`}</p></div><span>→</span></Link>; })}</div>}
            </section>

            <section id="dashboard-visits" className="cn-dashboard-section">
              <div className="cn-section-heading"><div><span className="eyebrow">VISITS</span><h2>Property visit requests.</h2></div></div>
              {visits.length === 0 ? <div className="cn-state-card compact"><strong>No visit requests.</strong><p>Request a visit from any available Stay listing.</p></div> : <div className="cn-dashboard-list">{visits.map((visit) => <Link className="cn-dashboard-list-item" to={`/stay/${visit.property_id}`} key={visit.id}><div><span>{visit.status}</span><strong>{visit.property_title || `Property #${visit.property_id}`}</strong><p>{new Date(visit.requested_at).toLocaleString("en-IN")}</p></div><span>→</span></Link>)}</div>}
            </section>

            <section id="dashboard-conversations" className="cn-dashboard-section">
              <div className="cn-section-heading"><div><span className="eyebrow">MESSAGES & INQUIRIES</span><h2>People contacting you.</h2></div></div>
              {conversations.length === 0 ? <div className="cn-state-card compact"><strong>No conversations yet.</strong><p>Contact a listing owner or publish a listing to receive inquiries here.</p></div> : <div className="cn-dashboard-list">{conversations.map((conversation) => <Link className="cn-dashboard-list-item" to={`/messages/${conversation.id}`} key={conversation.id}><div><span>{conversation.listing_type} · {conversation.unread_count || 0} unread</span><strong>{conversation.listing_title}</strong><p>{conversation.owner_id === user?.id ? `From ${conversation.other_party_name || "a CityNest user"}${conversation.other_party_email ? ` · ${conversation.other_party_email}` : ""}` : `With ${conversation.other_party_name || "listing owner"}`}</p>{conversation.owner_id === user?.id && conversation.other_party_phone && <p>{conversation.other_party_phone}</p>}{conversation.last_message_text && <small>{conversation.last_message_text}</small>}</div><span>Open →</span></Link>)}</div>}
            </section>
          </div>

          <aside className="cn-dashboard-sidebar">
            <section className="cn-dashboard-section compact-section"><div className="cn-section-heading"><div><span className="eyebrow">NOTIFICATIONS</span><h2>Stay informed.</h2></div>{unreadCount > 0 && <button className="text-button" onClick={markAllRead}>Mark all read</button>}</div>{notifications.length === 0 ? <p className="cn-muted">No notifications yet.</p> : <div className="cn-notification-list">{notifications.slice(0, 10).map((notification) => <button className={`cn-notification ${notification.is_read ? "" : "unread"}`} key={notification.id} onClick={() => markRead(notification.id)}><strong>{notification.title}</strong><p>{notification.message}</p><small>{new Date(notification.created_at).toLocaleString("en-IN")}</small></button>)}</div>}</section>
            {user?.role === "user" && <section className="cn-dashboard-section compact-section"><span className="eyebrow">SELL LOCALLY</span><h2>Have something to offer?</h2><p className="cn-muted">Apply for owner access to publish stays and messes. Marketplace selling is available to every logged-in user.</p><Link className="primary-button full" to="/owner/apply">Apply for owner access</Link></section>}
            <section className="cn-dashboard-section compact-section"><span className="eyebrow">PERMISSION-BASED</span><h2>Browser notifications.</h2><p className="cn-muted">Enable them when you want timely updates about messages and visit requests.</p><button className="primary-button full" onClick={enableNotifications}>Enable notifications</button>{notificationMessage && <p className="cn-form-success">{notificationMessage}</p>}</section>
            <section className="cn-dashboard-section compact-section"><span className="eyebrow">MARKETPLACE</span><h2>Your items.</h2>{myItems.length === 0 ? <p className="cn-muted">You have not listed anything yet.</p> : <div className="cn-dashboard-list">{myItems.slice(0, 8).map((item) => <div className="cn-dashboard-list-item" key={item.id}><Link to={`/marketplace/${item.id}`}><div><span>{item.status}</span><strong>{item.title}</strong><p>₹{Number(item.price).toLocaleString("en-IN")}</p></div></Link><div className="cn-search-actions"><Link className="text-button" to={`/marketplace/sell?type=marketplace&edit=${item.id}`}>Edit</Link><button className="text-button danger" onClick={async () => { if (!window.confirm("Remove this marketplace item?")) return; await deleteMarketplaceItem(item.id); setMyItems((items) => items.filter((entry) => entry.id !== item.id)); }}>Remove</button></div></div>)}</div>}<Link className="secondary-button full" to="/marketplace">Open marketplace</Link></section>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
