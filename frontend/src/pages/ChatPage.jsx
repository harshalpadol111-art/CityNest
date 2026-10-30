import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getConversationMessages, markConversationMessageRead, sendConversationMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function ChatPage() {
  const { conversationId } = useParams(); const { user } = useAuth();
  const [messages, setMessages] = useState([]); const [text, setText] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [sending, setSending] = useState(false); const bottomRef = useRef(null);
  const load = useCallback(async () => {
    try {
      const data = await getConversationMessages(conversationId);
      const nextMessages = Array.isArray(data) ? data : [];
      setMessages(nextMessages);
      const unreadIncoming = nextMessages.filter((message) => message.sender_id !== user?.id && !message.is_read);
      await Promise.all(unreadIncoming.map((message) => markConversationMessageRead(conversationId, message.id).catch(() => null)));
    } catch (err) {
      setError(err.message || "Unable to load conversation.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id]);
  useEffect(() => { load(); const timer = setInterval(load, 7000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const submit = async (e) => { e.preventDefault(); if (!text.trim() || sending) return; setSending(true); try { const item = await sendConversationMessage(conversationId, text.trim()); setMessages((current) => [...current, item]); setText(""); } catch (err) { setError(err.message || "Message failed."); } finally { setSending(false); } };
  return <div className="chat-page"><div className="chat-header"><div><Link to="/dashboard" className="back-link">← Dashboard</Link><span className="premium-label">CONVERSATION</span><h1>CityNest messages</h1></div><span className="chat-status">Live conversation</span></div><div className="chat-window">{loading ? <div className="chat-empty">Loading conversation…</div> : error ? <div className="chat-empty form-error">{error}</div> : messages.length === 0 ? <div className="chat-empty"><strong>Start the conversation.</strong><span>Ask about availability, pricing or the listing.</span></div> : messages.map((message) => { const mine = message.sender_id === user?.id; return <div className={`chat-bubble-row ${mine ? "mine" : ""}`} key={message.id}><div className="chat-bubble"><p>{message.message_text}</p><small>{new Date(message.sent_at).toLocaleString()}</small></div></div>; })}<div ref={bottomRef} /></div><form className="chat-composer" onSubmit={submit}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" maxLength={2000} /><button className="premium-primary" disabled={sending || !text.trim()}>{sending ? "Sending…" : "Send ↗"}</button></form></div>;
}
export default ChatPage;
