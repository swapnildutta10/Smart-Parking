import React from "react";
import ParkingSpotDetails from "../parkingSpot/ParkingSpotDetails";
import ScrollJourney from "./ScrollJourney";

function UserHome({ onRegister, onLogin, onLogout, onFindSpot, initialView = "home" }) {
  const [activeView, setActiveView] = React.useState(initialView);
  const [selectedSpot, setSelectedSpot] = React.useState(null);
  const [locationQuery, setLocationQuery] = React.useState("");
  const [parkingAreaQuery, setParkingAreaQuery] = React.useState("");
  const [availabilityFilter, setAvailabilityFilter] = React.useState("all");
  const [priceFilter, setPriceFilter] = React.useState("all");
  const [parkingSlots] = React.useState([
    { id: "A-12", vehicle: "Car", location: "Brainware University Main Gate", area: "University district", rate: "$13/day", available: 4 },
    { id: "B-07", vehicle: "Two wheeler", location: "Brainware University Student Parking", area: "University district", rate: "$4/day", available: 12 },
    { id: "C-18", vehicle: "SUV / Van", location: "Barasat Station Parking", area: "Barasat central", rate: "$18/day", available: 2 },
    { id: "E-03", vehicle: "EV", location: "Champadali More Parking", area: "Champadali", rate: "$16/day", available: 3 },
    { id: "D-21", vehicle: "Car", location: "Kazipara Road Parking", area: "Kazipara", rate: "$11/day", available: 7 },
    { id: "B-14", vehicle: "Two wheeler", location: "Barasat Station Parking", area: "Barasat central", rate: "$5/day", available: 8 },
  ]);

  const filteredSlots = parkingSlots.filter((slot) => {
    const matchesLocation = slot.location.toLowerCase().includes(locationQuery.trim().toLowerCase());
    const matchesParkingArea = slot.area.toLowerCase().includes(parkingAreaQuery.trim().toLowerCase());
    const matchesAvailability = availabilityFilter === "all"
      || (availabilityFilter === "available" && slot.available > 0)
      || (availabilityFilter === "limited" && slot.available > 0 && slot.available <= 4)
      || (availabilityFilter === "full" && slot.available === 0);
    const rate = Number.parseInt(slot.rate, 10);
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

  function showParkingView() {
    if (onFindSpot) {
      onFindSpot();
      return;
    }
    setSelectedSpot(null);
    setActiveView("parking");
  }

  return (
    <div className="pn-scope pn-home">
      <header className="pn-home-header">
        <a
          className="pn-home-brand"
          href="#user-home"
          onClick={() => setActiveView("home")}
        >
          <span>P</span> ParkNova
        </a>
        <nav className="pn-home-nav" aria-label="User portal navigation">
          <button
            type="button"
            className={activeView === "home" ? "active" : ""}
            onClick={() => setActiveView("home")}
          >
            Home
          </button>
          <button
            type="button"
            className={activeView === "parking" ? "active" : ""}
            onClick={showParkingView}
          >
            Find a spot
          </button>
          <button
            type="button"
            className={activeView === "profile" ? "active" : ""}
            onClick={() => setActiveView("profile")}
          >
            User profile
          </button>
          <button
            type="button"
            className={activeView === "update" ? "active" : ""}
            onClick={() => setActiveView("update")}
          >
            Update profile
          </button>
          <button type="button" className="pn-logout" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>

      {activeView === "home" && (
        <section className="pn-home-hero" id="user-home">
          <div>
            <p className="pn-kicker">Driver portal</p>
            <h1>Your parking, in one calm place.</h1>
            <p>
              Sign in to manage bookings, or create an account to start
              reserving smarter spaces.
            </p>
            <div className="pn-home-actions">
              <button className="pn-btn-primary" type="button" onClick={showParkingView}>
                Browse slots <span aria-hidden="true">→</span>
              </button>
              <button
                className="pn-btn-secondary"
                type="button"
                onClick={onRegister}
              >
                Register
              </button>
            </div>
            <div className="pn-quick-row">
              <button className="pn-quick-chip" type="button" onClick={showParkingView}>
                📍 Find a nearby spot
              </button>
              <span className="pn-quick-chip">⏱ Extend a booking</span>
              <span className="pn-quick-chip">💬 Contact support</span>
            </div>
          </div>

          <div className="pn-ticket" aria-label="Your next reserved trip">
            <div className="pn-ticket-top">
              <span>Next trip</span>
              <span className="pn-ticket-badge">Confirmed</span>
            </div>
            <div className="pn-ticket-slot">A-24</div>
            <p className="pn-ticket-loc">Brainware University Main Gate</p>

            <div className="pn-ticket-perf">
              <span className="pn-ticket-notch left" />
              <span className="pn-ticket-notch right" />
            </div>

            <div className="pn-ticket-details">
              <div>
                <span>Date</span>
                <strong>Today</strong>
              </div>
              <div>
                <span>Arrival</span>
                <strong>4:30 PM</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>3 hours</strong>
              </div>
              <div>
                <span>Rate</span>
                <strong>$13/day</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeView === "home" && <ScrollJourney onFindSpot={showParkingView} />}

      {activeView === "parking" && (
        <section className="pn-slots-panel container-fluid px-3 px-lg-5">
          <div className="pn-slots-heading row align-items-end justify-content-between gx-3">
            <div className="col-lg-8 col-md-10">
              <p className="pn-kicker mb-3">Parking directory</p>
              <h1 className="display-5 fw-semibold mb-2">Find a space that fits.</h1>
              <p className="mb-0 text-secondary">Search by place, area, availability, or your daily budget.</p>
            </div>
          </div>

          <div className="pn-parking-filters" role="search" aria-label="Filter parking spots">
            <label className="pn-search-field">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder="Search location"
                aria-label="Search by location"
              />
            </label>
            <label className="pn-search-field">
              <span aria-hidden="true">⌘</span>
              <input
                type="search"
                value={parkingAreaQuery}
                onChange={(event) => setParkingAreaQuery(event.target.value)}
                placeholder="Search parking area"
                aria-label="Search by parking area"
              />
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
              <span>Daily price</span>
              <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
                <option value="all">Any price</option>
                <option value="under-10">Under $10</option>
                <option value="10-15">$10 - $15</option>
                <option value="over-15">Over $15</option>
              </select>
            </label>
            {hasActiveFilters && (
              <button className="pn-clear-filters" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>

          <div className="pn-results-meta" aria-live="polite">
            <strong>{filteredSlots.length} {filteredSlots.length === 1 ? "spot" : "spots"} found</strong>
            <span>{hasActiveFilters ? "Matching your preferences" : "All listed locations"}</span>
          </div>

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
                      <strong className="text-dark fs-5 fw-bold">{slot.rate}</strong>
                      <button
                        type="button"
                        className="btn btn-outline-success rounded-pill px-3 py-2 fw-bold"
                        onClick={() => setSelectedSpot(slot)}
                      >
                        View spot
                      </button>
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
        </section>
      )}

      <ParkingSpotDetails
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
        onReserve={onLogin}
      />

      {activeView === "profile" && (
        <section className="pn-panel">
          <p className="pn-kicker">Account overview</p>
          <h1>User profile</h1>
          <div className="pn-profile-card">
            <strong>Olivia Martin</strong>
            <span>olivia@example.com</span>
            <span>Member since August 2026</span>
          </div>
          <button
            className="pn-btn-primary"
            type="button"
            onClick={() => setActiveView("update")}
          >
            Update profile <span aria-hidden="true">→</span>
          </button>
        </section>
      )}

      {activeView === "update" && (
        <section className="pn-panel">
          <p className="pn-kicker">Account settings</p>
          <h1>Update profile</h1>
          <form
            className="pn-form-card"
            onSubmit={(event) => event.preventDefault()}
          >
            <label>
              Full name
              <input defaultValue="Olivia Martin" />
            </label>
            <label>
              Email address
              <input defaultValue="olivia@example.com" type="email" />
            </label>
            <label>
              Phone number
              <input placeholder="Add your phone number" type="tel" />
            </label>
            <button className="pn-btn-primary" type="submit">
              Save changes <span aria-hidden="true">✓</span>
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

export default UserHome;
