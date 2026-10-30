import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteFoodPlace,
  deleteMarketplaceItem,
  deleteProperty,
  getConversations,
  getMyFoodPlaces,
  getMyMarketplaceItems,
  getMyProperties,
  getOwnerVisitRequests,
  updateOwnerVisitRequest,
} from "../lib/api";

function OwnerDashboardPage() {
  const [data, setData] = useState({ properties: [], food: [], marketplace: [] });
  const [conversations, setConversations] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [properties, food, marketplace, conversationData, visitData] = await Promise.all([
        getMyProperties(),
        getMyFoodPlaces(),
        getMyMarketplaceItems(),
        getConversations(),
        getOwnerVisitRequests(),
      ]);
      setData({ properties: properties || [], food: food || [], marketplace: marketplace || [] });
      setConversations((conversationData || []).filter((item) => item.owner_id));
      setVisits(Array.isArray(visitData) ? visitData : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load Owner Studio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const removeListing = async (type, id) => {
    const label = type === "property" ? "property" : type === "food" ? "food listing" : "marketplace item";
    if (!window.confirm(`Remove this ${label}? It will no longer appear in public discovery.`)) return;
    setBusy(`${type}-${id}`);
    try {
      if (type === "property") await deleteProperty(id);
      if (type === "food") await deleteFoodPlace(id);
      if (type === "marketplace") await deleteMarketplaceItem(id);
      await load();
    } catch (requestError) {
      setError(requestError.message || "Unable to remove listing.");
    } finally {
      setBusy("");
    }
  };

  const updateVisit = async (visitId, status) => {
    setBusy(`visit-${visitId}`);
    try {
      await updateOwnerVisitRequest(visitId, status);
      setVisits((current) => current.map((item) => item.id === visitId ? { ...item, status } : item));
    } catch (requestError) {
      setError(requestError.message || "Unable to update visit request.");
    } finally {
      setBusy("");
    }
  };

  const allListings = data.properties.length + data.food.length + data.marketplace.length;
  const inquiryCount = conversations.filter((item) => item.owner_id).length;
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="owner-page">
      <div className="owner-shell">
        <div className="owner-hero-new">
          <div><span className="section-eyebrow">CITYNEST · OWNER STUDIO</span><h1>Your listings.<br /><em>Your inquiries.</em></h1><p>Publish, update and manage every listing. See who contacted you and respond from one inbox.</p></div>
          <div className="owner-actions"><Link to="/owner/create?type=property" className="owner-main-action">+ Add property</Link><Link to="/owner/create?type=food" className="owner-light-action">+ Add food</Link><Link to="/owner/create?type=marketplace" className="owner-light-action">+ Sell an item</Link></div>
        </div>

        {loading ? <div className="cn-detail-state"><div className="cn-spinner" /> Loading Owner Studio…</div> : error ? <div className="form-error">{error}<button className="secondary-button" onClick={load}>Retry</button></div> : <>
          <div className="owner-stats">
            <button type="button" className="owner-stat-card" onClick={() => scrollTo("owner-listings")}><small>Total listings</small><strong>{allListings}</strong></button>
            <button type="button" className="owner-stat-card" onClick={() => scrollTo("owner-stays")}><small>Stays</small><strong>{data.properties.length}</strong></button>
            <button type="button" className="owner-stat-card" onClick={() => scrollTo("owner-food")}><small>Food</small><strong>{data.food.length}</strong></button>
            <button type="button" className="owner-stat-card" onClick={() => scrollTo("owner-inbox")}><small>Conversations</small><strong>{conversations.length}</strong></button>
            <button type="button" className="owner-stat-card" onClick={() => scrollTo("owner-inbox")}><small>Listing inquiries</small><strong>{inquiryCount}</strong></button>
          </div>

          <section id="owner-inbox" className="owner-section owner-inbox">
            <div className="owner-section-head"><div><span className="section-eyebrow">INBOX</span><h2>People contacting you</h2></div><Link to="/dashboard">Open full dashboard →</Link></div>
            {!conversations.length ? <div className="owner-empty">No inquiries yet. When someone clicks Contact owner or Contact seller, the conversation and their available contact details appear here.</div> : <div className="owner-list">{conversations.map((conversation) => <Link className="owner-list-item owner-inquiry" to={`/messages/${conversation.id}`} key={conversation.id}><div><strong>{conversation.other_party_name || "CityNest user"}</strong><span>{conversation.other_party_email || "Email unavailable"}{conversation.other_party_phone ? ` · ${conversation.other_party_phone}` : ""}</span><span>{conversation.listing_type} · {conversation.listing_title}</span><p>{conversation.last_message_text || "Conversation started — waiting for the first message."}</p></div><b>{conversation.unread_count ? `${conversation.unread_count} unread` : "Open chat →"}</b></Link>)}</div>}
          </section>

          <section className="owner-section">
            <div className="owner-section-head"><div><span className="section-eyebrow">VISITS</span><h2>Property visit requests</h2></div></div>
            {!visits.length ? <div className="owner-empty">No property visit requests yet.</div> : <div className="owner-list">{visits.map((visit) => <div className="owner-list-item owner-inquiry" key={visit.id}><div><strong>{visit.requester_name || `User #${visit.user_id}`}</strong><span>{visit.requester_email || "Email unavailable"}{visit.requester_phone ? ` · ${visit.requester_phone}` : ""}</span><span>{visit.property_title || `Property #${visit.property_id}`} · {new Date(visit.requested_at).toLocaleString("en-IN")}</span><p>{visit.message || "No message included."}</p></div><div className="owner-visit-actions">{visit.status === "pending" ? <><button className="owner-light-action" disabled={busy === `visit-${visit.id}`} onClick={() => void updateVisit(visit.id, "confirmed")}>Confirm</button><button className="owner-light-action danger" disabled={busy === `visit-${visit.id}`} onClick={() => void updateVisit(visit.id, "declined")}>Decline</button></> : <b>{visit.status}</b>}</div></div>)}</div>}
          </section>

          <div id="owner-listings" />
          <OwnerSection id="owner-stays" label="YOUR STAYS" title="Properties" action="View public listings" href="/stay" items={data.properties} empty="No property listings yet." render={(item) => <><div><strong>{item.title}</strong><span>₹{Number(item.monthly_rent || 0).toLocaleString("en-IN")}/month · {item.address}</span></div><b>{item.status}</b></>} detailPrefix="/stay/" editType="property" onRemove={removeListing} busy={busy} />
          <OwnerSection id="owner-food" label="YOUR FOOD" title="Mess & meal listings" action="View food" href="/food" items={data.food} empty="No food listings yet." render={(item) => <><div><strong>{item.name}</strong><span>₹{Number(item.monthly_price || item.daily_price || 0).toLocaleString("en-IN")} · {item.address}</span></div><b>{item.status}</b></>} detailPrefix="/food/" editType="food" onRemove={removeListing} busy={busy} />
          <OwnerSection label="YOUR MARKETPLACE" title="Items for sale" action="Open marketplace" href="/marketplace" items={data.marketplace} empty="No marketplace listings yet." render={(item) => <><div><strong>{item.title}</strong><span>₹{Number(item.price || 0).toLocaleString("en-IN")} · {item.condition}</span></div><b>{item.status}</b></>} detailPrefix="/marketplace/" editType="marketplace" onRemove={removeListing} busy={busy} />
        </>}
      </div>
    </div>
  );
}

function OwnerSection({ id, label, title, action, href, items, empty, render, detailPrefix, editType, onRemove, busy }) {
  return <section id={id} className="owner-section"><div className="owner-section-head"><div><span className="section-eyebrow">{label}</span><h2>{title}</h2></div><Link to={href}>{action} →</Link></div><div className="owner-list">{items.map((item) => <div className="owner-list-item" key={item.id}><Link className="owner-list-main" to={`${detailPrefix}${item.id}`}>{render(item)}</Link><div className="owner-list-actions"><Link className="owner-light-action" to={`/owner/create?type=${editType}&edit=${item.id}`}>Edit</Link><button className="owner-light-action danger" disabled={busy === `${editType}-${item.id}`} onClick={() => void onRemove(editType, item.id)}>Remove</button></div></div>)}{!items.length && <div className="owner-empty">{empty}</div>}</div></section>;
}

export default OwnerDashboardPage;
