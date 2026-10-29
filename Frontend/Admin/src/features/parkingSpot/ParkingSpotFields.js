import React from "react";

export default function ParkingSpotFields({ spot, locations = [] }) {
  const [parkingId, setParkingId] = React.useState(spot?.parkingId || "");
  const selectedLocation = locations.find(location => location.id === parkingId);
  return <>
    <label>Vehicle type<select name="vehicleType" defaultValue={spot?.vehicle || "Car"}>
      <option>Car</option><option>Two wheeler</option><option>SUV / Van</option>
    </select></label>
    <label>Parking location<select name="parkingId" value={parkingId} onChange={event => setParkingId(event.target.value)}>
      <option value="">Create a new location</option>
      {parkingId && !selectedLocation && <option value={parkingId}>{spot?.location || "Current location"}</option>}
      {locations.map(location => <option value={location.id} key={location.id}>{location.name} — {location.address}</option>)}
    </select></label>
    {parkingId ? <p>{selectedLocation?.address || spot?.area}</p> : <>
      <label>Location<input name="location" defaultValue={spot?.location || ""} placeholder="Parking location" maxLength={150} required /></label>
      <label>Address<input name="area" defaultValue={spot?.area || ""} placeholder="Street, area and city" maxLength={500} required /></label>
    </>}
    <label>Rate per hour (₹)<input name="rate" type="number" min="0.01" max="99999999.99" step="0.01" defaultValue={spot?.rate ?? ""} placeholder="13.00" required /></label>
    <label>Total capacity<input name="totalSlots" type="number" min="1" max="100000" step="1" defaultValue={spot?.totalSlots ?? ""} placeholder="4" required /></label>
    <small>Available spaces are calculated from bookings.</small>
  </>;
}
