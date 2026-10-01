import React from "react";

function MyVehicles({ vehicles, onAdd, onRemove }) {
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onAdd({
      type: formData.get("vehicleType"),
      plate: formData.get("plate").toString().trim().toUpperCase(),
    });
    event.currentTarget.reset();
  }

  return (
    <section className="pn-user-panel pn-user-feature-page">
      <div className="pn-user-panel-heading">
        <div>
          <h2>My vehicles</h2>
          <p>Keep vehicle details handy when reserving a spot</p>
        </div>
      </div>

      <form className="pn-form-card pn-user-vehicle-form" onSubmit={handleSubmit}>
        <label>
          Vehicle type
          <select name="vehicleType" defaultValue="Car" required>
            <option>Car</option>
            <option>Two wheeler</option>
            <option>SUV / Van</option>
            <option>EV</option>
          </select>
        </label>
        <label>
          License plate
          <input name="plate" placeholder="e.g. WB 20 AB 1234" required />
        </label>
        <button className="pn-btn-primary" type="submit">Add vehicle <span aria-hidden="true">+</span></button>
      </form>

      <div className="pn-user-vehicle-list" aria-label="Saved vehicles">
        {vehicles.map((vehicle) => (
          <article className="pn-user-vehicle-row" key={vehicle.id}>
            <span className="pn-user-vehicle-icon" aria-hidden="true">{vehicle.type === "Two wheeler" ? "▱" : "▰"}</span>
            <span><strong>{vehicle.type}</strong><small>{vehicle.plate}</small></span>
            <button className="pn-user-saved-remove" type="button" onClick={() => onRemove(vehicle.id)} aria-label={`Remove vehicle ${vehicle.plate}`} title="Remove vehicle">×</button>
          </article>
        ))}
        {vehicles.length === 0 && <p className="pn-user-feature-empty-copy">No vehicles saved. Add one above.</p>}
      </div>
    </section>
  );
}

export default MyVehicles;