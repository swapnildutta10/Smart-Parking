import React from "react";

function AddParkingSpot({ onAdd }) {
  return (
    <form className="pn-admin-spot-form" onSubmit={onAdd}>
      <label>
        Spot ID
        <input name="spotId" placeholder="A-24" required />
      </label>
      <label>
        Vehicle type
        <select name="vehicleType" defaultValue="Car">
          <option>Car</option>
          <option>Two wheeler</option>
          <option>SUV / Van</option>
          <option>EV</option>
        </select>
      </label>
      <label>
        Location
        <input name="location" placeholder="Parking location" required />
      </label>
      <label>
        Rate per day
        <input name="rate" type="number" min="1" placeholder="13" required />
      </label>
      <label>
        Spaces available
        <input name="available" type="number" min="1" placeholder="4" required />
      </label>
      <button className="pn-admin-submit" type="submit">
        Add parking spot <span aria-hidden="true">+</span>
      </button>
    </form>
  );
}

export default AddParkingSpot;
