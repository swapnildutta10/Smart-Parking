import React from "react";
import { createPortal } from "react-dom";

const TOPICS = [
  { label: "Find parking", pattern: /park|spot|space|available|availability|price|cost|rate/, text: "Explore the parking options and rates on this page. Log in to browse locations and check availability before booking.", view: "parking", action: "Explore parking options" },
  { label: "My bookings", pattern: /book|reserv|cancel|extend/, text: "Log in to your account to view reservations, check booking details, and see available actions.", view: "account", action: "Open my account" },
  { label: "Payments", pattern: /pay|receipt|refund|upi|money/, text: "Log in and open Payment history to see your recorded payments, receipts, and bookings with a payment due.", view: "account", action: "Open my account" },
  { label: "Contact support", pattern: /help|support|contact|problem|issue|human/, text: "Need a hand? Find our contact details at the bottom of this page, or email support@parknova.com.", view: "contact", action: "View contact details" },
];

const GREETING = { role: "bot", text: "Hi! I’m ParkNova’s help bot. I can guide you through parking, bookings, and payments. What can I help with?" };

function AssistantAvatar() {
  return <span className="pn-chat-avatar" aria-hidden="true"><span className="pn-chat-orbit" /><span className="pn-chat-antenna" /><span className="pn-chat-face"><i /><i /><span /></span><span className="pn-chat-spark">✦</span></span>;
}

export default function HomeChatbot({ onNavigate }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState([GREETING]);
  const [isTyping, setIsTyping] = React.useState(false);
  const [typingText, setTypingText] = React.useState("");
  const replyTimer = React.useRef(null);
  const replyPending = React.useRef(false);
  const launcher = React.useRef(null);
  const input = React.useRef(null);
  const log = React.useRef(null);

  React.useEffect(() => () => window.clearTimeout(replyTimer.current), []);

  React.useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (open && log.current) log.current.scrollTop = messages.length === 1 ? 0 : log.current.scrollHeight;
  }, [open, messages, isTyping, typingText]);

  function resetChat() {
    window.clearTimeout(replyTimer.current);
    replyPending.current = false;
    setIsTyping(false);
    setTypingText("");
    setMessages([GREETING]);
    setDraft("");
    input.current?.focus();
  }

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  function ask(value) {
    const question = value.trim();
    if (!question || replyPending.current) return;
    const topic = TOPICS.find(item => item.pattern.test(question.toLowerCase()));
    const answer = topic || {
      text: /^(hi|hello|hey)\b/i.test(question)
        ? "Hello! Choose a topic below, or ask me about parking, bookings, or payments."
        : "I’m a simple help bot and couldn’t match that question. Try a topic below, or contact support for personal assistance.",
    };
    setMessages(current => [...current, { role: "user", text: question }].slice(-59));
    setDraft("");
    replyPending.current = true;
    setIsTyping(true);
    setTypingText("");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let characters = 0;
    function revealReply() {
      characters = reducedMotion ? answer.text.length : Math.min(characters + 4, answer.text.length);
      if (characters === answer.text.length) {
        setMessages(current => [...current, { role: "bot", ...answer }].slice(-60));
        setIsTyping(false);
        setTypingText("");
        replyPending.current = false;
        replyTimer.current = null;
        return;
      }
      setTypingText(answer.text.slice(0, characters));
      replyTimer.current = window.setTimeout(revealReply, 24);
    }
    replyTimer.current = window.setTimeout(revealReply, 650);
  }

  return createPortal(
    <aside className={`pn-chat${open ? " pn-chat--open" : ""}${draft.trim() ? " pn-chat--listening" : ""}`} aria-label="Parking help bot">
      {open && (
        <section className="pn-chat-panel" id="pn-home-chat" aria-labelledby="pn-chat-title" onKeyDown={event => { if (event.key === "Escape") close(); }}>
          <header className="pn-chat-header">
            <AssistantAvatar />
            <div className="pn-chat-heading"><span className="pn-chat-eyebrow">PARKNOVA CONCIERGE</span><strong id="pn-chat-title">Your parking copilot<span className="pn-chat-status-dot" aria-hidden="true" /></strong><small>Quick answers · Automated help</small></div>
            <button type="button" className="pn-chat-reset" aria-label="Start a new chat" title="Start a new chat" onClick={resetChat}>↺</button>
            <button type="button" onClick={close} aria-label="Close chat">×</button>
          </header>
          <div className="pn-chat-log" ref={log} role="log" aria-live="polite" aria-relevant="additions" tabIndex={0}>
            {messages.length === 1 && <div className="pn-chat-welcome"><div className="pn-chat-welcome-orb"><AssistantAvatar /><span className="pn-chat-orb-ring" /><span className="pn-chat-orb-ring pn-chat-orb-ring--outer" /></div><span className="pn-chat-welcome-tag">A SMALL ASSISTANT. A SMOOTHER JOURNEY.</span><h2>Less searching.<br /><span>More arriving.</span></h2><p>Let’s find your next move.</p></div>}
            {messages.map((message, index) => (
              <div className={`pn-chat-message pn-chat-message--${message.role}`} key={index}>
                <span className="pn-chat-speaker">{message.role === "user" ? "You" : "ParkNova"}</span>
                <p>{message.text}</p>
                {message.view && <button type="button" onClick={() => { onNavigate(message.view); close(); }}>{message.action} →</button>}
              </div>
            ))}
            {isTyping && <div className="pn-chat-message pn-chat-message--typing">
              <span className="pn-chat-speaker">ParkNova</span>
              <span className="pn-chat-sr-only" role="status">ParkNova is typing…</span>
              {typingText ? <p className="pn-chat-typewriter" aria-hidden="true">{typingText}<span className="pn-chat-cursor" /></p> : <span className="pn-chat-typing-dots" aria-hidden="true"><i /><i /><i /></span>}
            </div>}
          </div>
          <div className="pn-chat-topics-label"><span>QUICK PIT STOPS</span><span aria-hidden="true">↙ PICK A TOPIC</span></div>
          <div className="pn-chat-topics" aria-label="Suggested questions">
            {TOPICS.map((topic, index) => <button type="button" key={topic.label} disabled={isTyping} style={{ "--topic-order": index }} onClick={() => ask(topic.label)}><span aria-hidden="true">{["⌖", "▣", "₹", "♡"][index]}</span>{topic.label}<span aria-hidden="true">↗</span></button>)}
          </div>
          <form className="pn-chat-form" onSubmit={event => { event.preventDefault(); ask(draft); }}>
            <input ref={input} aria-label="Your message" placeholder="Ask a parking question…" value={draft} maxLength={500} onChange={event => setDraft(event.target.value)} />
            <button type="submit" disabled={!draft.trim() || isTyping} aria-label="Send message"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Z M7 12h14" /></svg></button>
          </form>
          <div className="pn-chat-footer"><span aria-hidden="true">✦</span> Powered by ParkNova · Guided answers</div>
        </section>
      )}
      <button className="pn-chat-launcher" ref={launcher} type="button" aria-expanded={open} aria-controls="pn-home-chat" onClick={() => open ? close() : setOpen(true)}>
        <AssistantAvatar />
        <span className="pn-chat-launcher-copy"><small aria-hidden="true">YOUR PARKING COPILOT</small><span>{open ? "Close chat" : "Need help?"}</span></span>
        <span className="pn-chat-launcher-arrow" aria-hidden="true">{open ? "×" : "↗"}</span>
      </button>
    </aside>,
    document.body
  );
}
