import React from "react";
import ParkingSpotDetails from "../parkingSpot/ParkingSpotDetails";
import SelectDateTime from "../Booking system/SelectDateTime";
import BookingConfirmation from "../Booking system/BookingConfirmation";
import BookingHistory from "../Booking system/BookingHistory";
import SavedLocations from "./SavedLocations";
import MyVehicles from "./MyVehicles";
import PaymentHistory from "./PaymentHistory";
import PaymentCheckout from "../Payment/PaymentCheckout";
import PaymentConfirmation from "../Payment/PaymentConfirmation";
import PaymentReceipt from "../Payment/PaymentReceipt";
import HelpSupport from "./HelpSupport";
import NotificationHistory from "../notification/NotificationHistory";

const parkingSlots = [
  { id: "A-12", vehicle: "Car", location: "Brainware University Main Gate", area: "University district", rate: 13, available: 4 },
  { id: "B-07", vehicle: "Two wheeler", location: "Brainware University Student Parking", area: "University district", rate: 4, available: 12 },
  { id: "C-18", vehicle: "SUV / Van", location: "Barasat Station Parking", area: "Barasat central", rate: 18, available: 2 },
  { id: "E-03", vehicle: "EV", location: "Champadali More Parking", area: "Champadali", rate: 16, available: 3 },
  { id: "D-21", vehicle: "Car", location: "Kazipara Road Parking", area: "Kazipara", rate: 11, available: 7 },
  { id: "B-14", vehicle: "Two wheeler", location: "Barasat Station Parking", area: "Barasat central", rate: 5, available: 8 },
];

const yearlyActivity = [
  { year: 2020, bookings: 1200 },
  { year: 2021, bookings: 2100 },
  { year: 2022, bookings: 3400 },
  { year: 2023, bookings: 5200 },
  { year: 2024, bookings: 7800 },
  { year: 2025, bookings: 10600 },
  { year: 2026, bookings: 12480 },
];

// Demo seat/bay layout for the "Live seat map" panel — which exact bays
// are open right now at the featured location (Brainware University Main
// Gate). true = available, false = already taken.
const SEAT_MAP_LOCATION = "Brainware University Main Gate";
const SEAT_LAYOUT = [
  true, false, false, true, false, false, true, false,
  false, false, true, false, false, false, false, false,
  false, false, false, false, false, false, false, false,
];

const parkingMix = [
  { label: "Two wheeler", value: 20, color: "#4aa8d8" },
  { label: "Car", value: 11, color: "#e2764d" },
  { label: "EV", value: 3, color: "#39a47b" },
  { label: "SUV / Van", value: 2, color: "#8a78d6" },
];

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "⌂", accent: "#f44336" },
  { key: "find", label: "Find a spot", icon: "⌖", accent: "#ffa117" },
  { key: "bookings", label: "My bookings", icon: "▣", accent: "#0fc70f" },
  { key: "notifications", label: "Notifications", icon: "♧", accent: "#2196f3" },
  { key: "saved", label: "Saved locations", icon: "☆", accent: "#b145e9" },
  { key: "vehicles", label: "My vehicles", icon: "▰", accent: "#f44336" },
  { key: "payments", label: "Payment history", icon: "$", accent: "#ffa117" },
  { key: "profile", label: "User profile", icon: "▤", accent: "#0fc70f" },
  { key: "support", label: "Help & support", icon: "?", accent: "#2196f3" },
  { key: "update", label: "Update profile", icon: "⚙", accent: "#b145e9" },
];

const MOBILE_NAV_INDICATOR_X = [
  "0px",
  "calc(25% + 1.25px)",
  "calc(50% + 2.5px)",
  "calc(75% + 3.75px)",
];

const VIEW_COPY = {
  home: { kicker: "Driver overview", title: "Good morning, Olivia" },
  find: { kicker: "Parking directory", title: "Find a space that fits" },
  bookings: { kicker: "Reservation history", title: "My bookings" },
  notifications: { kicker: "Updates and alerts", title: "Notifications" },
  saved: { kicker: "Your favorites", title: "Saved locations" },
  vehicles: { kicker: "Your garage", title: "My vehicles" },
  payments: { kicker: "Fees and receipts", title: "Payment history" },
  profile: { kicker: "Account overview", title: "User profile" },
  support: { kicker: "We can help", title: "Help & support" },
  update: { kicker: "Account settings", title: "Update profile" },
};

function UserDashboard({ onLogin, onLogout, bookings, notifications, payments, onAddPayment, onAddBooking, onCancelBooking, onMarkParked, onAddNotification }) {
  // All options live inside this single dashboard shell now — the
  // sidebar never navigates away to a separate page, it just swaps
  // which panel is shown in the main area.
  const [activeView, setActiveView] = React.useState("home");
  const [selectedSpot, setSelectedSpot] = React.useState(null);
  const [locationQuery, setLocationQuery] = React.useState("");
  const [parkingAreaQuery, setParkingAreaQuery] = React.useState("");
  const [availabilityFilter, setAvailabilityFilter] = React.useState("all");
  const [priceFilter, setPriceFilter] = React.useState("all");
  const [selectedSeat, setSelectedSeat] = React.useState(null);
  const [savedSpotIds, setSavedSpotIds] = React.useState(["A-12", "D-21"]);
  const [vehicles, setVehicles] = React.useState([
    { id: "vehicle-default", type: "Car", plate: "WB 20 AB 1234" },
  ]);
  // Booking flow: pick a spot to book (opens the date/time modal), then
  // show a confirmation once it's been added to the shared bookings list.
  const [bookingSpot, setBookingSpot] = React.useState(null);
  const [confirmedBooking, setConfirmedBooking] = React.useState(null);
  // Payment flow: checkout modal -> confirmation -> optional receipt.
  const [checkoutBooking, setCheckoutBooking] = React.useState(null);
  const [completedPayment, setCompletedPayment] = React.useState(null);
  const [receiptPayment, setReceiptPayment] = React.useState(null);
  const [currentTime, setCurrentTime] = React.useState(Date.now);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const upcomingBookings = bookings
    .filter((booking) => booking.status === "upcoming")
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const nextBooking = upcomingBookings[0] || null;
  const savedLocations = parkingSlots.filter((slot) => savedSpotIds.includes(slot.id));

  React.useEffect(() => {
    bookings.forEach((booking) => {
      const hasStarted = new Date(`${booking.date}T${booking.time}:00`).getTime() <= currentTime;
      if (booking.status === "upcoming" && !booking.parked && hasStarted) {
        onAddNotification({ booking, kind: "overdue" });
      }
    });
  }, [bookings, currentTime, onAddNotification]);

  function toggleSavedLocation(spotId) {
    setSavedSpotIds((currentIds) => currentIds.includes(spotId)
      ? currentIds.filter((id) => id !== spotId)
      : [...currentIds, spotId]);
  }

  function addVehicle(vehicle) {
    setVehicles((currentVehicles) => [
      ...currentVehicles,
      { ...vehicle, id: `vehicle-${Date.now()}` },
    ]);
  }

  function handleConfirmBooking(draft) {
    const booking = onAddBooking(draft);
    setBookingSpot(null);
    setConfirmedBooking(booking);
  }

  function handlePaid(payment) {
    onAddPayment(payment);
    setCheckoutBooking(null);
    setCompletedPayment(payment);
  }

  const totalAvailable = parkingSlots.reduce((sum, slot) => sum + slot.available, 0);
  const averageRate = (parkingSlots.reduce((sum, slot) => sum + slot.rate, 0) / parkingSlots.length).toFixed(2);
  const areas = [...new Set(parkingSlots.map((slot) => slot.area))];
  const maxBookings = Math.max(...yearlyActivity.map((item) => item.bookings));

  const filteredSlots = parkingSlots.filter((slot) => {
    const matchesLocation = slot.location.toLowerCase().includes(locationQuery.trim().toLowerCase());
    const matchesParkingArea = slot.area.toLowerCase().includes(parkingAreaQuery.trim().toLowerCase());
    const matchesAvailability = availabilityFilter === "all"
      || (availabilityFilter === "available" && slot.available > 0)
      || (availabilityFilter === "limited" && slot.available > 0 && slot.available <= 4)
      || (availabilityFilter === "full" && slot.available === 0);
    const matchesPrice = priceFilter === "all"
      || (priceFilter === "under-10" && slot.rate < 10)
      || (priceFilter === "10-15" && slot.rate >= 10 && slot.rate <= 15)
      || (priceFilter === "over-15" && slot.rate > 15);

    return matchesLocation && matchesParkingArea && matchesAvailability && matchesPrice;
  });

  const hasActiveFilters = locationQuery || parkingAreaQuery || availabilityFilter !== "all" || priceFilter !== "all";

  function clearFilters() {
    setLocationQuery("");
    setParkingAreaQuery("");
    setAvailabilityFilter("all");
    setPriceFilter("all");
  }

  function goToFindSpot() {
    setActiveView("find");
  }

  const viewCopy = VIEW_COPY[activeView];
  const activeNavIndex = Math.max(0, NAV_ITEMS.findIndex((item) => item.key === activeView));

  return (
    <div className="pn-user-dashboard">
      <aside className="pn-user-sidebar">
        <div className="pn-user-brand"><span>P</span> ParkNova</div>
        <p className="pn-user-label">Driver account</p>
        <nav
          className="pn-user-nav"
          aria-label="User dashboard navigation"
          style={{
            "--pn-nav-accent": NAV_ITEMS[activeNavIndex].accent,
            "--pn-nav-indicator-y": `${activeNavIndex * 47}px`,
            "--pn-nav-indicator-mobile-x": MOBILE_NAV_INDICATOR_X[activeNavIndex % 4],
            "--pn-nav-indicator-mobile-y": `${Math.floor(activeNavIndex / 4) * 69}px`,
          }}
        >
          <span className="pn-user-nav-indicator" aria-hidden="true" />
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activeView === item.key ? "active" : ""}
              aria-current={activeView === item.key ? "page" : undefined}
              style={{ "--pn-nav-item-accent": item.accent }}
              onClick={() => setActiveView(item.key)}
            >
              <span className="pn-user-nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="pn-user-nav-label">{item.label}</span>
              {item.key === "bookings" && upcomingBookings.length > 0 && (
                <span className="pn-user-nav-badge">{upcomingBookings.length}</span>
              )}
            </button>
          ))}
        </nav>
        <button className="pn-user-logout" type="button" onClick={onLogout}><span>↪</span> Log out</button>
      </aside>

      <main className="pn-user-dashboard-main">
        <header className="pn-user-dashboard-topbar" key={activeView}>
          <div>
            <p className="pn-user-dashboard-kicker">{viewCopy.kicker}</p>
            <h1>{viewCopy.title}</h1>
          </div>
          <div className="pn-user-dashboard-profile">
            <span className="pn-user-avatar">OM</span>
            <span><strong>Olivia Martin</strong><small>Member since 2026</small></span>
          </div>
        </header>

        {activeView === "home" && (
          <>
            <section className="pn-user-welcome-banner">
              <div>
                <p className="pn-user-dashboard-kicker">Parking made simple</p>
                <h2>Find your next space without the circling.</h2>
                <p>Compare nearby locations, open spaces, and daily prices in one place.</p>
              </div>
              <button className="pn-user-primary-action" type="button" onClick={goToFindSpot}>Find a spot <span>→</span></button>
            </section>

            <section className="pn-user-stat-grid" aria-label="Parking summary">
              <article className="pn-user-stat-card">
                <span className="pn-user-stat-icon is-green">⌖</span>
                <div><small>Available spaces</small><strong>{totalAvailable}</strong><em>Across {areas.length} areas</em></div>
              </article>
              <article className="pn-user-stat-card">
                <span className="pn-user-stat-icon is-blue">◉</span>
                <div><small>Parking locations</small><strong>{parkingSlots.length}</strong><em>Ready to reserve</em></div>
              </article>
              <article className="pn-user-stat-card">
                <span className="pn-user-stat-icon is-orange">$</span>
                <div><small>Average daily rate</small><strong>${averageRate}</strong><em>Transparent pricing</em></div>
              </article>
              <article className="pn-user-stat-card">
                <span className="pn-user-stat-icon is-purple">✓</span>
                <div><small>Next reservation</small><strong>A-24</strong><em>Today, 4:30 PM</em></div>
              </article>
            </section>

            <section className="pn-user-insights-grid" aria-label="Parking insights">
              <article className="pn-user-panel pn-mix-panel">
                <div className="pn-user-panel-heading">
                  <div><h2>Parking mix</h2><p>Spaces available by vehicle type</p></div>
                  <span className="pn-insight-period">LIVE</span>
                </div>
                <div className="pn-mix-content">
                  <div className="pn-pie-chart" role="img" aria-label="Parking mix: 20 two wheeler, 11 car, 3 EV, and 2 SUV or van spaces">
                    <div><strong>{totalAvailable}</strong><span>open spaces</span></div>
                  </div>
                  <div className="pn-pie-legend">
                    {parkingMix.map((item) => (
                      <div key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><b>{item.value}</b></div>
                    ))}
                  </div>
                </div>
              </article>

            </section>

            <section className="pn-user-dashboard-grid">
              <article className="pn-user-panel pn-user-availability-panel">
                <div className="pn-user-panel-heading"><div><h2>Availability by area</h2><p>Open spaces you can reserve now</p></div><button type="button" onClick={goToFindSpot}>View all</button></div>
                <div className="pn-area-list">
                  {areas.map((area) => {
                    const areaSlots = parkingSlots.filter((slot) => slot.area === area);
                    const available = areaSlots.reduce((sum, slot) => sum + slot.available, 0);
                    const percentage = Math.min(100, available * 5);
                    return <div className="pn-area-row" key={area}><div><strong>{area}</strong><span>{areaSlots.length} locations</span></div><div className="pn-area-bar"><span style={{ width: `${percentage}%` }} /></div><b>{available} open</b></div>;
                  })}
                </div>
              </article>

              <article className="pn-user-panel pn-user-booking-panel">
                <div className="pn-user-panel-heading"><div><h2>Next reservation</h2><p>Your upcoming parking visit</p></div>{nextBooking && <span className="pn-user-confirmed">Confirmed</span>}</div>
                {nextBooking ? (
                  <>
                    <div className="pn-booking-code">{nextBooking.spotId}</div>
                    <h3>{nextBooking.location}</h3>
                    <div className="pn-booking-details"><span><small>Date</small><strong>{nextBooking.date}</strong></span><span><small>Arrival</small><strong>{nextBooking.time}</strong></span><span><small>Rate</small><strong>{typeof nextBooking.rate === "number" ? `$${nextBooking.rate}/day` : nextBooking.rate}</strong></span></div>
                  </>
                ) : (
                  <p className="pn-user-no-booking">No upcoming bookings yet. Find a spot and reserve one in a couple of clicks.</p>
                )}
                <button className="pn-user-outline-action" type="button" onClick={() => setActiveView("bookings")}>Manage parking <span>→</span></button>
              </article>
            </section>

            <section className="pn-user-panel pn-seat-map-panel">
              <div className="pn-user-panel-heading">
                <div><h2>Live seat availability</h2><p>{SEAT_MAP_LOCATION} — tap an open bay to hold it</p></div>
                <span className="pn-seat-count">{SEAT_LAYOUT.filter(Boolean).length} of {SEAT_LAYOUT.length} open</span>
              </div>
              <div className="pn-parking-visual" aria-label="Live illustrated parking layout">
                <div className="pn-parking-visual-head">
                  <span><i className="pn-live-indicator" /> Live lot view</span>
                  <small>Updated just now</small>
                </div>
                <div className="pn-parking-lot" aria-hidden="true">
                  <div className="pn-parking-lane pn-parking-lane-top">
                    {SEAT_LAYOUT.slice(0, 12).map((isAvailable, index) => (
                      <span
                        className={`pn-parking-space${isAvailable ? " is-open" : " is-occupied"}`}
                        key={`top-${index}`}
                      >
                        {isAvailable ? <i /> : <i className="pn-car" />}
                      </span>
                    ))}
                  </div>
                  <div className="pn-parking-driveway"><span>ENTRY</span><span>EXIT</span></div>
                  <div className="pn-parking-lane pn-parking-lane-bottom">
                    {SEAT_LAYOUT.slice(12).map((isAvailable, index) => (
                      <span
                        className={`pn-parking-space${isAvailable ? " is-open" : " is-occupied"}`}
                        key={`bottom-${index}`}
                      >
                        {isAvailable ? <i /> : <i className="pn-car" />}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pn-seat-grid" role="group" aria-label={`Bay availability at ${SEAT_MAP_LOCATION}`}>
                {SEAT_LAYOUT.map((isAvailable, index) => {
                  const seatLabel = `S-${String(index + 1).padStart(2, "0")}`;
                  const isSelected = selectedSeat === seatLabel;
                  return (
                    <button
                      key={seatLabel}
                      type="button"
                      className={`pn-seat${isAvailable ? " is-available" : " is-taken"}${isSelected ? " is-selected" : ""}`}
                      disabled={!isAvailable}
                      aria-pressed={isSelected}
                      aria-label={`Bay ${seatLabel}, ${isAvailable ? "available" : "already taken"}`}
                      onClick={() => setSelectedSeat(isSelected ? null : seatLabel)}
                    >
                      {seatLabel}
                    </button>
                  );
                })}
              </div>
              <div className="pn-seat-legend">
                <span><i className="pn-seat-swatch is-available" /> Available</span>
                <span><i className="pn-seat-swatch is-taken" /> Taken</span>
                <span><i className="pn-seat-swatch is-selected" /> Selected</span>
              </div>
              {selectedSeat && (
                <div className="pn-seat-confirm">
                  <p>Bay <strong>{selectedSeat}</strong> held for the next 10 minutes.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const seatMapSlot = parkingSlots.find((slot) => slot.location === SEAT_MAP_LOCATION);
                      setBookingSpot(seatMapSlot);
                    }}
                  >
                    Continue to reserve <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </section>

            <section className="pn-user-panel pn-user-trend-panel">
              <div className="pn-user-panel-heading">
                <div><h2>Yearly parking activity</h2><p>Total bookings across ParkNova, 2020 – 2026</p></div>
              </div>
              <div className="pn-bar-chart" role="img" aria-label="Bar chart of total ParkNova bookings by year, rising from 1,200 in 2020 to 12,480 in 2026">
                {yearlyActivity.map((item) => (
                  <div className="pn-bar-col" key={item.year}>
                    <span className="pn-bar-value">{item.bookings.toLocaleString()}</span>
                    <div className="pn-bar-track">
                      <div
                        className="pn-bar-fill"
                        style={{ height: `${Math.round((item.bookings / maxBookings) * 100)}%` }}
                      />
                    </div>
                    <span className="pn-bar-year">{item.year}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="pn-user-panel pn-user-location-panel">
              <div className="pn-user-panel-heading"><div><h2>Popular parking locations</h2><p>Quick access to spaces near you</p></div><button type="button" onClick={goToFindSpot}>Search parking</button></div>
              <div className="pn-location-list">
                {parkingSlots.slice(0, 4).map((slot) => <button className="pn-location-item" type="button" key={slot.id} onClick={goToFindSpot}><span className="pn-location-pin">⌖</span><span><strong>{slot.location}</strong><small>{slot.area}</small></span><b>${slot.rate}<small>/day</small></b></button>)}
              </div>
            </section>
          </>
        )}

        {activeView === "find" && (
          <section className="pn-slots-panel">
            <p className="pn-user-dashboard-subtitle">Search by place, area, availability, or your daily budget.</p>

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
                          <strong className="text-dark fs-5 fw-bold">${slot.rate}/day</strong>
                          <div className="pn-slot-card-actions d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-success rounded-pill px-3 py-2 fw-bold"
                              onClick={() => setSelectedSpot(slot)}
                            >
                              View spot
                            </button>
                            <button
                              type="button"
                              className="pn-user-save-spot"
                              aria-pressed={savedSpotIds.includes(slot.id)}
                              onClick={() => toggleSavedLocation(slot.id)}
                            >
                              {savedSpotIds.includes(slot.id) ? "★ Saved" : "☆ Save"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-success rounded-pill px-3 py-2 fw-bold pn-btn-book"
                              disabled={slot.available === 0}
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
          </section>
        )}

        {activeView === "bookings" && (
          <BookingHistory
            bookings={bookings}
            onCancel={onCancelBooking}
            onFindSpot={goToFindSpot}
          />
        )}

        {activeView === "notifications" && (
          <NotificationHistory
            notifications={notifications}
            bookings={upcomingBookings}
            onMarkParked={onMarkParked}
          />
        )}

        {activeView === "saved" && (
          <SavedLocations
            locations={savedLocations}
            onRemove={toggleSavedLocation}
            onBook={setBookingSpot}
            onFindSpot={goToFindSpot}
          />
        )}

        {activeView === "vehicles" && (
          <MyVehicles
            vehicles={vehicles}
            onAdd={addVehicle}
            onRemove={(vehicleId) => setVehicles((currentVehicles) => currentVehicles.filter((vehicle) => vehicle.id !== vehicleId))}
          />
        )}

        {activeView === "payments" && (
          <PaymentHistory
            bookings={bookings}
            payments={payments}
            onPay={setCheckoutBooking}
            onViewReceipt={setReceiptPayment}
          />
        )}

        {activeView === "support" && <HelpSupport />}

        {activeView === "profile" && (
          <section className="pn-panel pn-user-inline-panel">
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
          <section className="pn-panel pn-user-inline-panel">
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
      </main>

      <ParkingSpotDetails
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
        onReserve={onLogin}
      />

      <SelectDateTime
        spot={bookingSpot}
        onClose={() => setBookingSpot(null)}
        onConfirm={handleConfirmBooking}
      />

      {checkoutBooking && (
        <PaymentCheckout
          booking={checkoutBooking}
          onClose={() => setCheckoutBooking(null)}
          onPaid={handlePaid}
        />
      )}

      {completedPayment && (
        <PaymentConfirmation
          payment={completedPayment}
          onClose={() => setCompletedPayment(null)}
          onViewReceipt={() => {
            setReceiptPayment(completedPayment);
            setCompletedPayment(null);
          }}
        />
      )}

      {receiptPayment && (
        <PaymentReceipt payment={receiptPayment} onClose={() => setReceiptPayment(null)} />
      )}

      <BookingConfirmation
        booking={confirmedBooking}
        onClose={() => setConfirmedBooking(null)}
        onViewBookings={() => {
          setConfirmedBooking(null);
          setActiveView("bookings");
        }}
      />
    </div>
  );
}

export default UserDashboard;
