import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkBackendHealth } from "../lib/api";

const categories = [
  ["Stay", "Rooms, PGs & homes", "/stay", "🛏"],
  ["Food", "Mess & meal plans", "/food", "🍱"],
  ["Marketplace", "Buy & sell nearby", "/marketplace", "🛍"],
  ["Local life", "Built for newcomers", "/stay", "📍"],
];
const places = [
  { name: "MGM / N-6", text: "Student-friendly stays", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80" },
  { name: "CIDCO", text: "Connected, practical living", image: "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1000&q=80" },
  { name: "Garkheda", text: "Food, rooms & essentials", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80" },
  { name: "Be ready for day one", text: "Find what you need nearby", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80" },
];
function HomePage() {
  const [status, setStatus] = useState("checking"); const navigate = useNavigate();
  useEffect(() => { checkBackendHealth().then(d => setStatus(d?.status === "healthy" ? "connected" : "offline")).catch(() => setStatus("offline")); }, []);
  return <div className="oyo-home">
    <section className="home-hero-image">
      <div className="hero-overlay" />
      <div className="home-topline"><span>CHHATRAPATI SAMBHAJINAGAR</span><span>SMART RELOCATION PLATFORM</span></div>
      <div className="home-hero-content"><span className="home-pink-pill">CITYNEST · LIVE BETTER</span><h1>Find your place.<br /><strong>Settle in faster.</strong></h1><p>Stay, eat and buy locally — without the usual chaos of moving to a new city.</p>
        <div className="search-panel"><div className="search-cell"><small>Where do you want to live?</small><strong>Chhatrapati Sambhajinagar</strong></div><div className="search-cell"><small>Looking for</small><strong>Stay, food or essentials</strong></div><button onClick={() => navigate("/stay")}>Search</button></div>
      </div>
      <div className="hero-trust"><span className={status === "connected" ? "live-dot" : "live-dot off"} /> {status === "connected" ? "CityNest is live" : "CityNest"}<i /> Made for students & professionals</div>
    </section>

    <section className="category-strip"><div className="category-inner">{categories.map(([title,text,href,icon])=><Link to={href} className="category-card" key={title}><span className="category-icon">{icon}</span><div><strong>{title}</strong><small>{text}</small></div><b>→</b></Link>)}</div></section>
    <section className="home-section">
      <div className="home-banner" style={{ margin: 0 }}>
        <div><span>CITYNEST · ONE PLACE</span><h2>Stay, eat and buy locally.<br /><em>Everything connected.</em></h2></div>
        <Link to="/stay">Explore CityNest →</Link>
      </div>
    </section>

    <section className="home-section"><div className="home-section-title"><div><span>EXPLORE CITYNEST</span><h2>Everything you need to<br /><em>start feeling local.</em></h2></div><Link to="/stay">View all →</Link></div><div className="place-grid">{places.map((place,i)=><Link className={`place-card ${i===0 ? "large" : ""}`} to="/stay" key={place.name}><img src={place.image} alt=""/><div className="place-gradient"/><div className="place-copy"><strong>{place.name}</strong><span>{place.text}</span></div></Link>)}</div></section>

    <section className="home-section soft"><div className="home-section-title"><div><span>HOW IT WORKS</span><h2>One simple journey.<br /><em>Three useful tools.</em></h2></div><p>CityNest is built around the first few decisions you make after arriving in a new city.</p></div><div className="journey-grid"><div><small>01</small><h3>Find a base.</h3><p>Compare rooms, PGs, hostels and rentals by locality, rent, furnishing and ratings.</p></div><div><small>02</small><h3>Find your routine.</h3><p>Discover messes and meal plans with pricing, menus, contact and reviews.</p></div><div><small>03</small><h3>Make it yours.</h3><p>Buy useful secondhand furniture and essentials from people nearby.</p></div></div></section>

    <section className="home-banner"><div><span>MOVE WITH LESS FRICTION</span><h2>Your first week in a new city<br /><em>should feel this simple.</em></h2></div><Link to="/register">Get started →</Link></section>
  </div>;
}
export default HomePage;
