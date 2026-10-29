import React from "react";
import ParkingSpotFields from "./ParkingSpotFields";

export default function EditParkingSpot({ spot, onSave, onCancel, busy, disabled, locations }) {
  return <form className="pn-admin-spot-form" onSubmit={onSave}>
    <fieldset disabled={busy || disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "contents" }}>
      <label>Spot ID<input value={spot.id} readOnly /></label>
      <ParkingSpotFields spot={spot} locations={locations} />
      <div className="pn-admin-edit-actions">
        <button className="pn-admin-submit" type="submit">{busy ? "Saving…" : "Save changes"} <span aria-hidden="true">✓</span></button>
        <button className="pn-admin-cancel" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </fieldset>
  </form>;
}
