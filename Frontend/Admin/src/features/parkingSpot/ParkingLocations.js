import React from "react";

export default function ParkingLocations({ locations, loading, error, notice, busy, disabled, onCreate }) {
  return <section className="pn-admin-slots-page">
    <div className="pn-dash-topbar"><div><p className="pn-dash-kicker">Parking network</p><h1>Parking locations</h1></div><span>{locations.length} locations</span></div>
    {loading && <p role="status">Loading locations…</p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="pn-admin-slots-layout">
      <div className="pn-data-card"><div className="pn-data-card-head"><h2>Locations</h2></div>
        {locations.map(location => <article className="pn-admin-spot-row" key={location.id}>
          <div><strong>{location.name}</strong><small>{location.address}</small></div>
        </article>)}
        {!loading && !error && !locations.length && <p>No locations yet. Create one to add inventory.</p>}
      </div>
      <div className="pn-data-card"><div className="pn-data-card-head"><h2>Create location</h2></div>
        <form className="pn-admin-spot-form" onSubmit={onCreate}>
          <fieldset disabled={busy || disabled} style={{ border: 0, padding: 0, display: "contents" }}>
            <label>Location name<input name="name" required maxLength={150} placeholder="Parking location" /></label>
            <label>Address<input name="address" required maxLength={500} placeholder="Street, area and city" /></label>
            <button className="pn-admin-submit" type="submit">{busy ? "Saving…" : "Create location"}</button>
          </fieldset>
        </form>
        <p>After creating a location, add its vehicle types, rates and capacity under Parking inventory.</p>
      </div>
    </div>
  </section>;
}
