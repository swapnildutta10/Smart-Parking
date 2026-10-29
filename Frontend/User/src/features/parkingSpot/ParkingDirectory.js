import BrandLogo from "../shared/BrandLogo";
import React from "react";
import ParkingSpotDetails from "./ParkingSpotDetails";
import SelectDateTime from "../booking/SelectDateTime";
import BookingConfirmation from "../booking/BookingConfirmation";
import BookingHistory from "../booking/BookingHistory";

function ParkingDirectory({ parkingSlots = [], parkingError, parkingLoading, onRetryParking, onBack, onLogin, onLogout, bookings, onAddBooking, onCancelBooking }) {
  // "directory" is the search/browse view; "bookings" swaps in the booking
  // history panel without leaving this screen.
  const [view, setView] = React.useState("directory");
  const [selectedSpot, setSelectedSpot] = React.useState(null);
  const [locationQuery, setLocationQuery] = React.useState("");
  const [parkingAreaQuery, setParkingAreaQuery] = React.useState("");
  const [availabilityFilter, setAvailabilityFilter] = React.useState("all");
  const [priceFilter, setPriceFilter] = React.useState("all");
  const [bookingSpot, setBookingSpot] = React.useState(null);
  const [confirmedBooking, setConfirmedBooking] = React.useState(null);

  async function handleConfirmBooking(draft) {
    const booking = await onAddBooking(draft);
    setBookingSpot(null);
    setConfirmedBooking(booking);
  }

  const filteredSlots = parkingSlots.filter((slot) => {
    const matchesLocation = slot.location.toLowerCase().includes(locationQuery.trim().toLowerCase());
    const matchesParkingArea = slot.area.toLowerCase().includes(parkingAreaQuery.trim().toLowerCase());
    const matchesAvailability = availabilityFilter === "all"
      || (availabilityFilter === "available" && slot.available > 0)
      || (availabilityFilter === "limited" && slot.available > 0 && slot.available <= 4)
      || (availabilityFilter === "full" && slot.available === 0);
    const rate = Number(slot.rate);
    const matchesPrice = priceFilter === "all"
      || (priceFilter === "under-10" && rate < 10)
      || (priceFilter === "10-15" && rate >= 10 && rate <= 15)
      || (priceFilter === "over-15" && rate > 15);

    return matchesLocation && matchesParkingArea && matchesAvailability && matchesPrice;
  });

  const hasActiveFilters = locationQuery || parkingAreaQuery || availabilityFilter !== "all" || priceFilter !== "all";

  function clearFilters() {
    setLocationQuery("");
    setParkingAreaQuery("");
    setAvailabilityFilter("all");
    setPriceFilter("all");
  }

  return (
    <div className="pn-scope pn-home">
      <header className="pn-home-header">
        <div className="pn-home-brand pn-brand-link">
          <BrandLogo />
        </div>
        <nav className="pn-home-nav" aria-label="Parking directory navigation">
          <button type="button" onClick={onBack}>Dashboard</button>
          <button type="button" className={view === "directory" ? "active" : ""} onClick={() => setView("directory")}>Find a spot</button>
          <button type="button" className={view === "bookings" ? "active" : ""} onClick={() => setView("bookings")}>My bookings</button>
          <button type="button" className="pn-logout" onClick={onLogout}>Log out</button>
        </nav>
      </header>

      <main className="pn-slots-panel container-fluid px-3 px-lg-5">
        {view === "bookings" ? (
          <>
            <div className="pn-slots-heading row align-items-end justify-content-between gx-3">
              <div className="col-lg-8 col-md-10">
                <p className="pn-kicker mb-3">Reservation history</p>
                <h1 className="display-5 fw-semibold mb-2">My bookings</h1>
                <p className="mb-0 text-secondary">View, track and cancel your parking reservations.</p>
              </div>
            </div>
            <BookingHistory
              bookings={bookings}
              onCancel={onCancelBooking}
              onFindSpot={() => setView("directory")}
            />
          </>
        ) : (
        <>
        <div className="pn-slots-heading row align-items-end justify-content-between gx-3">
          <div className="col-lg-8 col-md-10">
            <p className="pn-kicker mb-3">Parking directory</p>
            <h1 className="display-5 fw-semibold mb-2">Find a space that fits.</h1>
            <p className="mb-0 text-secondary">Search by place, area, availability now, or your hourly budget.</p>
          </div>
        </div>

        <div className="pn-parking-filters" role="search" aria-label="Filter parking spots">
          <label className="pn-search-field">
            <span aria-hidden="true">⌕</span>
            <input type="search" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Search location" aria-label="Search by location" />
          </label>
          <label className="pn-search-field">
            <span aria-hidden="true">⌘</span>
            <input type="search" value={parkingAreaQuery} onChange={(event) => setParkingAreaQuery(event.target.value)} placeholder="Search parking area" aria-label="Search by parking area" />
          </label>
          <label className="pn-filter-field">
            <span>Availability</span>
            <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
              <option value="all">Any availability</option>
              <option value="available">Available now</option>
              <option value="limited">Limited spaces</option>
              <option value="full">Fully booked</option>
            </select>
          </label>
          <label className="pn-filter-field">
            <span>Hourly price</span>
            <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
              <option value="all">Any price</option>
              <option value="under-10">Under ₹10</option>
              <option value="10-15">₹10 - ₹15</option>
              <option value="over-15">Over ₹15</option>
            </select>
          </label>
          {hasActiveFilters && <button className="pn-clear-filters" type="button" onClick={clearFilters}>Clear filters</button>}
        </div>

        <div className="pn-results-meta" aria-live="polite">
          <strong>{filteredSlots.length} {filteredSlots.length === 1 ? "spot" : "spots"} found</strong>
          <span>{hasActiveFilters ? "Matching your preferences" : "All listed locations"}</span>
        </div>
        {parkingLoading && <p role="status">Loading parking locations…</p>}
        {parkingError && <p role="alert">{parkingError} <button type="button" onClick={onRetryParking}>Retry</button></p>}

        {filteredSlots.length > 0 ? (
          <div className="row g-4">
            {filteredSlots.map((slot) => (
              <div className="col-lg-4 col-md-6" key={slot.id}>
                <article className="pn-slot-card card h-100 border-0 shadow-sm">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="pn-slot-id">{slot.id}</span>
                      <span className="pn-vehicle-tag badge rounded-pill">{slot.vehicle}</span>
                    </div>
                    <h2 className="card-title h6 fw-bold mb-2 text-dark">{slot.location}</h2>
                    <p className="pn-slot-area mb-3">{slot.area}</p>
                    <p className="mb-4 text-muted small fw-semibold">
                      <strong className={slot.available > 0 ? "text-success" : "text-danger"}>
                        {slot.available > 0 ? `${slot.available} spaces available` : "Fully booked"}
                      </strong>
                    </p>
                    <div className="pn-slot-card-bottom d-flex justify-content-between align-items-center pt-3">
                      <strong className="text-dark fs-5 fw-bold">₹{slot.rate}/hour</strong>
                      <div className="pn-slot-card-actions d-flex gap-2">
                        <button type="button" className="btn btn-outline-success rounded-pill px-3 py-2 fw-bold" onClick={() => setSelectedSpot(slot)}>
                          View spot
                        </button>
                        <button
                          type="button"
                          className="btn btn-success rounded-pill px-3 py-2 fw-bold pn-btn-book"
                          onClick={() => setBookingSpot(slot)}
                        >
                          <span aria-hidden="true">🎟</span> Book now
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        ) : (
          <div className="pn-empty-results">
            <span className="pn-empty-results-icon" aria-hidden="true">⌕</span>
            <h2>No spots match those filters</h2>
            <p>Try a nearby area, a wider price range, or reset your filters.</p>
            <button className="pn-btn-secondary" type="button" onClick={clearFilters}>Show all spots</button>
          </div>
        )}
        </>
        )}
      </main>

      <ParkingSpotDetails spot={selectedSpot} onClose={() => setSelectedSpot(null)} onReserve={() => { setBookingSpot(selectedSpot); setSelectedSpot(null); }} />

      <SelectDateTime
        spot={bookingSpot}
        onClose={() => setBookingSpot(null)}
        onConfirm={handleConfirmBooking}
      />

      <BookingConfirmation
        booking={confirmedBooking}
        onClose={() => setConfirmedBooking(null)}
        onViewBookings={() => {
          setConfirmedBooking(null);
          setView("bookings");
        }}
      />
    </div>
  );
}

export default ParkingDirectory;
