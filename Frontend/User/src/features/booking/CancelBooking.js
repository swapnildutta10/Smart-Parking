import React from "react";

function CancelBooking({ onCancel }) {
  const [confirming, setConfirming] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  if (!confirming) {
    return (
      <button
        type="button"
        className="pn-btn-danger-outline"
        onClick={() => setConfirming(true)}
      >
        Cancel booking
      </button>
    );
  }

  return (
    <div className="pn-booking-cancel-confirm">
      <p>Cancel this booking? This can&rsquo;t be undone.</p>
      {error && <p role="alert">{error}</p>}
      <div className="pn-booking-cancel-actions">
        <button
          type="button"
          className="pn-btn-secondary"
          onClick={() => setConfirming(false)}
        >
          Keep booking
        </button>
        <button
          type="button"
          className="pn-btn-danger"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError("");
            try { await onCancel(); setConfirming(false); }
            catch (e) { setError(e.message || "Could not cancel the booking."); }
            finally { setSaving(false); }
          }}
        >
          {saving ? "Cancelling…" : "Yes, cancel"}
        </button>
      </div>
    </div>
  );
}

export default CancelBooking;
