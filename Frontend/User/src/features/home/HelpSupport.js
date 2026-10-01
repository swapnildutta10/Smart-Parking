import React from "react";

function HelpSupport() {
  const [requestSubmitted, setRequestSubmitted] = React.useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setRequestSubmitted(true);
    event.currentTarget.reset();
  }

  return (
    <section className="pn-user-support-grid">
      <article className="pn-user-panel pn-user-feature-page">
        <div className="pn-user-panel-heading">
          <div>
            <h2>Help &amp; support</h2>
            <p>Find answers or contact the ParkNova team</p>
          </div>
        </div>
        <div className="pn-user-support-contact">
          <span className="pn-user-stat-icon is-green" aria-hidden="true">@</span>
          <div><strong>Email support</strong><a href="mailto:support@parknova.com">support@parknova.com</a></div>
        </div>
        <div className="pn-user-support-faq">
          <details>
            <summary>How do I cancel a reservation?</summary>
            <p>Open My bookings, expand an upcoming reservation, and choose Cancel booking.</p>
          </details>
          <details>
            <summary>Where can I find my booking reference?</summary>
            <p>Open My bookings and select a reservation to see its reference and details.</p>
          </details>
          <details>
            <summary>Can I change my arrival time?</summary>
            <p>For now, cancel the reservation and create a new booking with the correct time.</p>
          </details>
        </div>
      </article>

      <article className="pn-user-panel pn-user-feature-page">
        <div className="pn-user-panel-heading">
          <div>
            <h2>Send a support request</h2>
            <p>Describe what you need help with</p>
          </div>
        </div>
        {requestSubmitted && (
          <p className="pn-user-support-success" role="status">
            Your request is ready. Support form delivery is not connected yet; please email support@parknova.com.
          </p>
        )}
        <form className="pn-form-card pn-user-support-form" onSubmit={handleSubmit}>
          <label>
            Topic
            <select name="topic" defaultValue="booking">
              <option value="booking">A booking</option>
              <option value="parking">A parking location</option>
              <option value="account">My account</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label>
            Message
            <textarea name="message" rows="4" placeholder="How can we help?" required />
          </label>
          <button className="pn-btn-primary" type="submit">Prepare request <span aria-hidden="true">→</span></button>
        </form>
      </article>
    </section>
  );
}

export default HelpSupport;