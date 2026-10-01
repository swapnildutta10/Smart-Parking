import React from "react";

function CancelBooking({ onCancel }) {
  const [confirming, setConfirming] = React.useState(false);

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
          onClick={() => {
            onCancel();
            setConfirming(false);
          }}
        >
          Yes, cancel
        </button>
      </div>
    </div>
  );
}

export default CancelBooking;