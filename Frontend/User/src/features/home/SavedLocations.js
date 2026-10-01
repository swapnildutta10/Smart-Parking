import React from "react";

function SavedLocations({ locations, onRemove, onBook, onFindSpot }) {
  return (
    <section className="pn-user-panel pn-user-feature-page">
      <div className="pn-user-panel-heading">
        <div>
          <h2>Saved locations</h2>
          <p>Parking spots you want to find again quickly</p>
        </div>
        <button type="button" onClick={onFindSpot}>Find more</button>
      </div>

      {locations.length === 0 ? (
        <div className="pn-user-feature-empty">
          <span aria-hidden="true">☆</span>
          <h3>No saved locations yet</h3>
          <p>Save a spot from the parking directory and it will appear here.</p>
          <button className="pn-user-outline-action" type="button" onClick={onFindSpot}>Browse parking <span>→</span></button>
        </div>
      ) : (
        <div className="pn-user-saved-list">
          {locations.map((spot) => (
            <article className="pn-user-saved-row" key={spot.id}>
              <span className="pn-user-saved-id">{spot.id}</span>
              <div className="pn-user-saved-copy">
                <strong>{spot.location}</strong>
                <small>{spot.area} · {spot.vehicle} · ${spot.rate}/day</small>
              </div>
              <div className="pn-user-saved-actions">
                <button className="pn-user-outline-action" type="button" onClick={() => onBook(spot)}>Book this spot <span>→</span></button>
                <button className="pn-user-saved-remove" type="button" onClick={() => onRemove(spot.id)} aria-label={`Remove ${spot.location} from saved locations`} title="Remove saved location">×</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default SavedLocations;