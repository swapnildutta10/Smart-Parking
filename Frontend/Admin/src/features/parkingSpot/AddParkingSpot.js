import React from "react";
import ParkingSpotFields from "./ParkingSpotFields";

export default function AddParkingSpot({ onAdd, busy, disabled, locations }) {
  return <form className="pn-admin-spot-form" onSubmit={onAdd}>
    <fieldset disabled={busy || disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "contents" }}>
      <p>Spot IDs are assigned automatically when you save.</p>
      <ParkingSpotFields locations={locations} />
      <button className="pn-admin-submit" type="submit">{busy ? "Saving…" : "Add parking spot"} <span aria-hidden="true">+</span></button>
    </fieldset>
  </form>;
}
