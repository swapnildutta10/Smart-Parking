import React from "react";

function MyVehicles({ vehicles, loading, loadError, onAdd, onRemove }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const working = React.useRef(false);
  async function handleSubmit(event) {
    event.preventDefault();
    if (working.current) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    working.current = true; setBusy(true); setError("");
    try { await onAdd({
      type: formData.get("vehicleType"),
      plate: formData.get("plate").toString().trim().toUpperCase(),
    }); form.reset(); }
    catch (err) { setError(err.message || "Could not save vehicle."); }
    finally { working.current = false; setBusy(false); }
  }
  async function remove(id) {
    if (working.current) return;
    working.current = true; setBusy(true); setError("");
    try { await onRemove(id); }
    catch (err) { setError(err.message || "Could not remove vehicle."); }
    finally { working.current = false; setBusy(false); }
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
        <fieldset disabled={busy || loading} style={{ border: 0, padding: 0, display: "contents" }}>
        <label>
          Vehicle type
          <select name="vehicleType" defaultValue="Car" required>
            <option>Car</option>
            <option>Two wheeler</option>
            <option>SUV / Van</option>
          </select>
        </label>
        <label>
          License plate
          <input name="plate" maxLength={20} placeholder="e.g. WB 20 AB 1234" required />
        </label>
        <button className="pn-btn-primary" type="submit">{busy ? "Saving…" : "Add vehicle"} <span aria-hidden="true">+</span></button>
        </fieldset>
      </form>
      {loading && <p role="status">Loading saved vehicles…</p>}
      {(error || loadError) && <p role="alert">{error || loadError}</p>}

      <div className="pn-user-vehicle-list" aria-label="Saved vehicles">
        {vehicles.map((vehicle) => (
          <article className="pn-user-vehicle-row" key={vehicle.id}>
            <span className="pn-user-vehicle-icon" aria-hidden="true">{vehicle.type === "Two wheeler" ? "▱" : "▰"}</span>
            <span><strong>{vehicle.type}</strong><small>{vehicle.plate}</small></span>
            <button className="pn-user-saved-remove" type="button" disabled={busy} onClick={() => remove(vehicle.id)} aria-label={`Remove vehicle ${vehicle.plate}`} title="Remove vehicle">×</button>
          </article>
        ))}
        {!loading && !loadError && vehicles.length === 0 && <p className="pn-user-feature-empty-copy">No vehicles saved. Add one above.</p>}
      </div>
    </section>
  );
}

export default MyVehicles;
