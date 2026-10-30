import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createFoodPlace,
  createMarketplaceItem,
  createProperty,
  generateListingCopy,
  getCities,
  getLocalities,
  getMyFoodPlaces,
  getMyMarketplaceItems,
  getMyProperties,
  updateFoodPlace,
  updateMarketplaceItem,
  updateProperty,
  uploadPropertyImages,
} from "../lib/api";

const initialProperty = { title: "", description: "", property_type: "PG", address: "", monthly_rent: "", security_deposit: "", available_for: "Students", furnishing: "Fully Furnished", city_id: "", locality_id: "", is_available: true, images: [] };
const initialFood = { name: "", description: "", address: "", food_type: "North Indian", monthly_price: "", daily_price: "", contact_phone: "", city_id: "", locality_id: "" };
const initialMarket = { title: "", description: "", category: "Furniture", price: "", condition: "Good", image_url: "", city_id: "", locality_id: "" };

function Field({ label, required = false, children, hint }) {
  return <label className="listing-field"><span>{label}{required && <b className="required-star"> *</b>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function CreateListingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const editing = Boolean(editId);
  const [type, setType] = useState(params.get("type") || "property");
  const [cities, setCities] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [property, setProperty] = useState(initialProperty);
  const [food, setFood] = useState(initialFood);
  const [market, setMarket] = useState(initialMarket);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(editing);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  const activeCity = type === "property" ? property.city_id : type === "food" ? food.city_id : market.city_id;
  const setActive = (key, value) => {
    if (type === "property") setProperty((current) => ({ ...current, [key]: value }));
    if (type === "food") setFood((current) => ({ ...current, [key]: value }));
    if (type === "marketplace") setMarket((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => { getCities().then((data) => setCities(Array.isArray(data) ? data : [])).catch(() => setCities([])); }, []);

  useEffect(() => {
    if (!activeCity) { setLocalities([]); return; }
    getLocalities(activeCity).then((data) => setLocalities(Array.isArray(data) ? data : [])).catch(() => setLocalities([]));
  }, [activeCity]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    if (!editing) return;
    let mounted = true;
    setLoadingEdit(true);
    const load = async () => {
      try {
        if (type === "property") {
          const items = await getMyProperties();
          const item = (items || []).find((entry) => Number(entry.id) === Number(editId));
          if (!item) throw new Error("Property not found in your listings.");
          if (!mounted) return;
          setProperty({ title: item.title || "", description: item.description || "", property_type: item.property_type || "PG", address: item.address || "", monthly_rent: item.monthly_rent || "", security_deposit: item.security_deposit || "", available_for: item.available_for || "Students", furnishing: item.furnishing || "Fully Furnished", city_id: String(item.city_id), locality_id: String(item.locality_id), is_available: item.is_available !== false, images: item.images || [] });
          setPreviews(item.images || []);
        } else if (type === "food") {
          const items = await getMyFoodPlaces();
          const item = (items || []).find((entry) => Number(entry.id) === Number(editId));
          if (!item) throw new Error("Food listing not found in your listings.");
          if (!mounted) return;
          setFood({ name: item.name || "", description: item.description || "", address: item.address || "", food_type: item.food_type || "", monthly_price: item.monthly_price || "", daily_price: item.daily_price || "", contact_phone: item.contact_phone || "", city_id: String(item.city_id), locality_id: String(item.locality_id) });
        } else {
          const items = await getMyMarketplaceItems();
          const item = (items || []).find((entry) => Number(entry.id) === Number(editId));
          if (!item) throw new Error("Marketplace item not found in your listings.");
          if (!mounted) return;
          setMarket({ title: item.title || "", description: item.description || "", category: item.category || "", price: item.price ?? "", condition: item.condition || "Good", image_url: item.image_url || "", city_id: String(item.city_id), locality_id: item.locality_id ? String(item.locality_id) : "" });
        }
      } catch (requestError) {
        if (mounted) setError(requestError.message || "Unable to load listing for editing.");
      } finally {
        if (mounted) setLoadingEdit(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [editing, editId, type]);

  const canSubmit = useMemo(() => {
    if (type === "property") return Boolean(property.title && property.description && property.property_type && property.address && property.monthly_rent && property.available_for && property.furnishing && property.city_id && property.locality_id && (editing ? property.images?.length || files.length : files.length));
    if (type === "food") return Boolean(food.name && food.address && food.city_id && food.locality_id && (food.monthly_price || food.daily_price));
    return Boolean(market.title && market.category && market.price !== "" && market.condition && market.city_id);
  }, [type, property, food, market, files, editing]);

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []).slice(0, 10);
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
    setError("");
  };

  const generateWithAI = async () => {
    setAiLoading(true); setAiMessage(""); setError("");
    try {
      const draft = type === "property" ? property : type === "food" ? food : market;
      const result = await generateListingCopy(type, draft);
      if (type === "property") setProperty((current) => ({ ...current, title: result.title || current.title, description: result.description || current.description }));
      if (type === "food") setFood((current) => ({ ...current, name: result.title || current.name, description: result.description || current.description }));
      if (type === "marketplace") setMarket((current) => ({ ...current, title: result.title || current.title, description: result.description || current.description }));
      setAiMessage(result.ai_powered ? "AI improved the draft. Review it before saving." : "Draft improved with CityNest's local assistant.");
    } catch (requestError) {
      setError(requestError.message || "AI assistant is unavailable.");
    } finally { setAiLoading(false); }
  };

  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    if (!canSubmit) { setError("Please complete every required field before saving."); return; }
    setLoading(true);
    try {
      if (type === "property") {
        let images = property.images || [];
        if (files.length) {
          const upload = await uploadPropertyImages(files);
          images = upload.urls;
        }
        const payload = { ...property, city_id: Number(property.city_id), locality_id: Number(property.locality_id), monthly_rent: Number(property.monthly_rent), security_deposit: property.security_deposit === "" ? null : Number(property.security_deposit), images };
        if (editing) await updateProperty(editId, payload); else await createProperty(payload);
        setMessage(editing ? "Property updated successfully." : "Property published successfully.");
      } else if (type === "food") {
        const payload = { ...food, city_id: Number(food.city_id), locality_id: Number(food.locality_id), monthly_price: food.monthly_price ? Number(food.monthly_price) : null, daily_price: food.daily_price ? Number(food.daily_price) : null };
        if (editing) await updateFoodPlace(editId, payload); else await createFoodPlace(payload);
        setMessage(editing ? "Food listing updated successfully." : "Food listing published successfully.");
      } else {
        const payload = { ...market, city_id: Number(market.city_id), locality_id: market.locality_id ? Number(market.locality_id) : null, price: Number(market.price) };
        if (editing) await updateMarketplaceItem(editId, payload); else await createMarketplaceItem(payload);
        setMessage(editing ? "Marketplace item updated successfully." : "Marketplace item published successfully.");
      }
      setTimeout(() => navigate("/owner"), 500);
    } catch (requestError) {
      setError(requestError.message || "Unable to save this listing.");
    } finally { setLoading(false); }
  };

  if (loadingEdit) return <div className="cn-detail-state"><div className="cn-spinner" /><strong>Loading listing…</strong><span>Preparing the editor.</span></div>;

  return <div className="listing-page">
    <div className="listing-shell">
      <Link to="/owner" className="listing-back">← Back to Owner Studio</Link>
      <div className="listing-header"><div><span className="section-eyebrow">OWNER STUDIO · {editing ? "EDIT" : "PUBLISH"}</span><h1>{editing ? "Update your listing." : "Add a listing."}</h1><p>Keep every public detail accurate so people can confidently contact you.</p></div><div className="listing-tabs">{[["property", "Stay"], ["food", "Food"], ["marketplace", "Marketplace"]].map(([value, label]) => <button type="button" key={value} disabled={editing} className={type === value ? "active" : ""} onClick={() => { setType(value); setError(""); setMessage(""); }}>{label}</button>)}</div></div>

      <div className="ai-listing-toolbar"><div><strong>AI listing assistant</strong><span>Improve wording without inventing facts.</span></div><button type="button" className="secondary-button" onClick={generateWithAI} disabled={aiLoading}>{aiLoading ? "Improving…" : "✦ Improve with AI"}</button></div>
      {aiMessage && <div className="cn-inline-note">{aiMessage}</div>}

      <form className="listing-form" onSubmit={submit}>
        {type === "property" && <>
          <div className="form-section-card"><div className="form-section-title"><span>01</span><div><h2>Property basics</h2><p>These details appear first on the public listing.</p></div></div><div className="listing-grid two"><Field label="Property title" required><input value={property.title} onChange={(e) => setActive("title", e.target.value)} placeholder="Premium student room near MGM" /></Field><Field label="Property type" required><select value={property.property_type} onChange={(e) => setActive("property_type", e.target.value)}><option>PG</option><option>Room</option><option>Hostel</option><option>Apartment</option><option>Flat</option><option>Shared Apartment</option></select></Field><Field label="Description" required><textarea rows="5" value={property.description} onChange={(e) => setActive("description", e.target.value)} /></Field><Field label="Full address" required><textarea rows="5" value={property.address} onChange={(e) => setActive("address", e.target.value)} /></Field></div></div>
          <div className="form-section-card"><div className="form-section-title"><span>02</span><div><h2>Location & pricing</h2><p>Make it easy for people to judge distance and cost.</p></div></div><div className="listing-grid three"><Field label="City" required><select value={property.city_id} onChange={(e) => { setActive("city_id", e.target.value); setActive("locality_id", ""); }}><option value="">Select city</option>{cities.map((city) => <option value={city.id} key={city.id}>{city.name}</option>)}</select></Field><Field label="Locality" required><select value={property.locality_id} onChange={(e) => setActive("locality_id", e.target.value)} disabled={!property.city_id}><option value="">Select locality</option>{localities.map((locality) => <option value={locality.id} key={locality.id}>{locality.name}</option>)}</select></Field><Field label="Monthly rent (₹)" required><input type="number" min="1" value={property.monthly_rent} onChange={(e) => setActive("monthly_rent", e.target.value)} /></Field><Field label="Security deposit (₹)"><input type="number" min="0" value={property.security_deposit} onChange={(e) => setActive("security_deposit", e.target.value)} /></Field><Field label="Available for" required><select value={property.available_for} onChange={(e) => setActive("available_for", e.target.value)}><option>Students</option><option>Working Professionals</option><option>Students & Professionals</option><option>Boys</option><option>Girls</option><option>Families</option></select></Field><Field label="Furnishing" required><select value={property.furnishing} onChange={(e) => setActive("furnishing", e.target.value)}><option>Fully Furnished</option><option>Semi Furnished</option><option>Unfurnished</option></select></Field></div></div>
          <div className="form-section-card"><div className="form-section-title"><span>03</span><div><h2>Property photos</h2><p>{editing ? "Keep the existing photos or upload a new set." : "Upload clear photos from your laptop."}</p></div></div><Field label="Photos" required hint="At least one photo is required."><input className="file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleFiles} /></Field>{previews.length > 0 && <div className="upload-preview-grid">{previews.map((src, index) => <div className="upload-preview" key={`${src}-${index}`}><img src={src} alt={`Property ${index + 1}`} /><span>{index === 0 ? "Cover photo" : `Photo ${index + 1}`}</span></div>)}</div>}</div>
        </>}

        {type === "food" && <div className="form-section-card"><div className="form-section-title"><span>01</span><div><h2>Food listing details</h2><p>Give people enough information to choose your meal plan.</p></div></div><div className="listing-grid two"><Field label="Mess / food name" required><input value={food.name} onChange={(e) => setActive("name", e.target.value)} /></Field><Field label="Food type"><input value={food.food_type} onChange={(e) => setActive("food_type", e.target.value)} /></Field><Field label="Description"><textarea rows="4" value={food.description} onChange={(e) => setActive("description", e.target.value)} /></Field><Field label="Address" required><textarea rows="4" value={food.address} onChange={(e) => setActive("address", e.target.value)} /></Field><Field label="City" required><select value={food.city_id} onChange={(e) => { setActive("city_id", e.target.value); setActive("locality_id", ""); }}><option value="">Select city</option>{cities.map((city) => <option value={city.id} key={city.id}>{city.name}</option>)}</select></Field><Field label="Locality" required><select value={food.locality_id} onChange={(e) => setActive("locality_id", e.target.value)} disabled={!food.city_id}><option value="">Select locality</option>{localities.map((locality) => <option value={locality.id} key={locality.id}>{locality.name}</option>)}</select></Field><Field label="Monthly price (₹)"><input type="number" min="1" value={food.monthly_price} onChange={(e) => setActive("monthly_price", e.target.value)} /></Field><Field label="Daily price (₹)"><input type="number" min="1" value={food.daily_price} onChange={(e) => setActive("daily_price", e.target.value)} /></Field><Field label="Contact phone"><input value={food.contact_phone} onChange={(e) => setActive("contact_phone", e.target.value)} /></Field></div></div>}

        {type === "marketplace" && <div className="form-section-card"><div className="form-section-title"><span>01</span><div><h2>Item details</h2><p>Be clear about condition and price so buyers know what to expect.</p></div></div><div className="listing-grid two"><Field label="Item title" required><input value={market.title} onChange={(e) => setActive("title", e.target.value)} /></Field><Field label="Category" required><input value={market.category} onChange={(e) => setActive("category", e.target.value)} /></Field><Field label="Description"><textarea rows="4" value={market.description} onChange={(e) => setActive("description", e.target.value)} /></Field><Field label="Price (₹)" required><input type="number" min="0" value={market.price} onChange={(e) => setActive("price", e.target.value)} /></Field><Field label="Condition" required><select value={market.condition} onChange={(e) => setActive("condition", e.target.value)}><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Used</option></select></Field><Field label="City" required><select value={market.city_id} onChange={(e) => { setActive("city_id", e.target.value); setActive("locality_id", ""); }}><option value="">Select city</option>{cities.map((city) => <option value={city.id} key={city.id}>{city.name}</option>)}</select></Field><Field label="Locality"><select value={market.locality_id} onChange={(e) => setActive("locality_id", e.target.value)} disabled={!market.city_id}><option value="">Select locality</option>{localities.map((locality) => <option value={locality.id} key={locality.id}>{locality.name}</option>)}</select></Field><Field label="Image URL"><input value={market.image_url} onChange={(e) => setActive("image_url", e.target.value)} placeholder="https://..." /></Field></div></div>}

        {error && <div className="form-error">{error}</div>}{message && <div className="form-success">{message}</div>}
        <div className="listing-submit"><div><strong>{editing ? "Save your changes?" : "Ready to publish?"}</strong><span>People see these details immediately after publishing.</span></div><button className="publish-button" disabled={loading}>{loading ? "Saving…" : editing ? "Save changes →" : "Publish listing →"}</button></div>
      </form>
    </div>
  </div>;
}

export default CreateListingPage;
