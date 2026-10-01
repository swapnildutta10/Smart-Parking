import React from "react";

function EditParkingSpot({ spot, onSave, onCancel }) {
  return (
    <form className="pn-admin-spot-form" onSubmit={onSave}>
      <label>
        Spot ID
        <input name="spotId" defaultValue={spot.id} required />
      </label>
      <label>
        Vehicle type
        <select name="vehicleType" defaultValue={spot.vehicle}>
          <option>Car</option>
          <option>Two wheeler</option>
          <option>SUV / Van</option>
          <option>EV</option>
        </select>
      </label>
      <label>
        Location
        <input name="location" defaultValue={spot.location} required />
      </label>
      <label>
        Rate per day
        <input name="rate" type="number" min="1" defaultValue={spot.rate} required />
      </label>
      <label>
        Spaces available
        <input name="available" type="number" min="0" defaultValue={spot.available} required />
      </label>
      <div className="pn-admin-edit-actions">
        <button className="pn-admin-submit" type="submit">
          Save changes <span aria-hidden="true">✓</span>
        </button>
        <button className="pn-admin-cancel" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default EditParkingSpot;
