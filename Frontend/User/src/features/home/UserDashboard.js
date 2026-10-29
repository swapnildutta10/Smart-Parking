import BrandLogo from "../shared/BrandLogo";
import React from "react";
import UserOverview from "./UserOverview";
import UserProfile from "./UserProfile";
import LiveParkingAvailability from "./LiveParkingAvailability";
import ParkingSpotDetails from "../parkingSpot/ParkingSpotDetails";
import SelectDateTime from "../booking/SelectDateTime";
import BookingConfirmation from "../booking/BookingConfirmation";
import BookingHistory from "../booking/BookingHistory";
import SavedLocations from "./SavedLocations";
import MyVehicles from "./MyVehicles";
import { parkingRequest } from "../parkingSpot/parkingApi";
import PaymentHistory from "./PaymentHistory";
import PaymentCheckout from "../Payment/PaymentCheckout";
import PaymentConfirmation from "../Payment/PaymentConfirmation";
import PaymentReceipt from "../Payment/PaymentReceipt";
import HelpSupport from "./HelpSupport";
import NotificationHistory from "../notification/NotificationHistory";

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "⌂", accent: "#f44336" },
  { key: "find", label: "Find a spot", icon: "⌖", accent: "#ffa117" },
  { key: "availability", label: "Live availability", icon: "◉", accent: "#2196f3" },
  { key: "bookings", label: "My bookings", icon: "▣", accent: "#0fc70f" },
  { key: "notifications", label: "Notifications", icon: "♧", accent: "#2196f3" },
  { key: "saved", label: "Saved locations", icon: "☆", accent: "#b145e9" },
  { key: "vehicles", label: "My vehicles", icon: "▰", accent: "#f44336" },
  { key: "payments", label: "Payment history", icon: "₹", accent: "#ffa117" },
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
  home: { kicker: "Driver overview", title: "Welcome back" },
  find: { kicker: "Parking directory", title: "Find a space that fits" },
  availability: { kicker: "Live parking capacity", title: "Availability by location" },
  bookings: { kicker: "Reservation history", title: "My bookings" },
  notifications: { kicker: "Updates and alerts", title: "Notifications" },
  saved: { kicker: "Your favorites", title: "Saved locations" },
  vehicles: { kicker: "Your garage", title: "My vehicles" },
  payments: { kicker: "Fees and receipts", title: "Payment history" },
  profile: { kicker: "Account overview", title: "User profile" },
  support: { kicker: "We can help", title: "Help & support" },
  update: { kicker: "Account settings", title: "Update profile" },
};



function UserDashboard({ parkingSlots = [], parkingError, parkingLoading, onRetryParking, user, onUpdateUser, onLogin, onLogout, bookings, bookingsError, bookingsLoading, notifications, notificationsLoading, notificationsError, onReloadNotifications, payments, paymentError, onAddPayment, onAddBooking, onCancelBooking, onMarkParked }) {
  // All options live inside this single dashboard shell now — the
  // sidebar never navigates away to a separate page, it just swaps
  // which panel is shown in the main area.
  const [activeView, setActiveView] = React.useState("home");
  const [selectedSpot, setSelectedSpot] = React.useState(null);
  const [locationQuery, setLocationQuery] = React.useState("");
  const [parkingAreaQuery, setParkingAreaQuery] = React.useState("");
  const [availabilityFilter, setAvailabilityFilter] = React.useState("all");
  const [priceFilter, setPriceFilter] = React.useState("all");

  const [savedLocationRecords, setSavedLocationRecords] = React.useState([]);
  const [savedLoading, setSavedLoading] = React.useState(false);
  const [savedError, setSavedError] = React.useState("");
  const [savedBusy, setSavedBusy] = React.useState(false);
  const [savedReloadKey, setSavedReloadKey] = React.useState(0);
  const savedWorking = React.useRef(false);
  const savedAccount = React.useRef(user?.id);
  savedAccount.current = user?.id;
  const savedSpotIds = savedLocationRecords.map(spot => spot.inventoryId);
  React.useEffect(() => {
    setSavedLocationRecords([]); setSavedError("");
    setSavedLoading(Boolean(user?.id));
    if (!user?.id) return undefined;
    const controller = new AbortController();
    parkingRequest("/saved-locations", { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setSavedLocationRecords(result.locations); })
      .catch(error => { if (!controller.signal.aborted) setSavedError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setSavedLoading(false); });
    return () => controller.abort();
  }, [user?.id, savedReloadKey]);
  const [vehicles, setVehicles] = React.useState([]);
  const [vehiclesLoading, setVehiclesLoading] = React.useState(false);
  const [vehiclesError, setVehiclesError] = React.useState("");
  const vehicleAccount = React.useRef(user?.id);
  vehicleAccount.current = user?.id;
  React.useEffect(() => {
    setVehicles([]); setVehiclesError("");
    if (!user?.id) return undefined;
    const controller = new AbortController();
    setVehiclesLoading(true);
    parkingRequest("/vehicles", { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setVehicles(result.vehicles); })
      .catch(error => { if (!controller.signal.aborted) setVehiclesError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setVehiclesLoading(false); });
    return () => controller.abort();
  }, [user?.id]);
  // Booking flow: pick a spot to book (opens the date/time modal), then
  // show a confirmation once it's been added to the shared bookings list.
  const [bookingSpot, setBookingSpot] = React.useState(null);
  const [confirmedBooking, setConfirmedBooking] = React.useState(null);
  // Payment flow: checkout modal -> confirmation -> optional receipt.
  const [checkoutBooking, setCheckoutBooking] = React.useState(null);
  const [completedPayment, setCompletedPayment] = React.useState(null);
  const [receiptPayment, setReceiptPayment] = React.useState(null);




  const displayName = user?.name?.trim() || "ParkNova Member";

  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const memberSince = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();


  const upcomingBookings = bookings
    .filter((booking) => booking.status === "upcoming")
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));

  const savedLocations = savedLocationRecords.map(saved => parkingSlots.find(slot => slot.inventoryId === saved.inventoryId) || saved);


  async function toggleSavedLocation(inventoryId) {
    if (savedWorking.current || savedLoading) return;
    if (!user?.id) { setSavedError("Sign in to save parking locations."); return; }
    const account = user.id;
    const removing = savedSpotIds.includes(inventoryId);
    savedWorking.current = true; setSavedBusy(true); setSavedError("");
    try {
      await parkingRequest(removing ? `/saved-locations/${encodeURIComponent(inventoryId)}` : "/saved-locations", {
        method: removing ? "DELETE" : "POST", ...(removing ? {} : { body: { inventoryId } }),
      });
      if (savedAccount.current === account) {
        setSavedLocationRecords(current => removing
          ? current.filter(spot => spot.inventoryId !== inventoryId)
          : [...current, { ...parkingSlots.find(spot => spot.inventoryId === inventoryId), inventoryId, unavailable: false }]);
      }
    } catch (error) { if (savedAccount.current === account) setSavedError(error.message); }
    finally { savedWorking.current = false; setSavedBusy(false); }
  }

  async function addVehicle(vehicle) {
    if (!user?.id) throw new Error("Sign in to save vehicles.");
    const account = user.id;
    const result = await parkingRequest("/vehicles", { method: "POST", body: vehicle });
    if (vehicleAccount.current === account) setVehicles(current => [...current, result.vehicle]);
  }

  async function removeVehicle(id) {
    if (!user?.id) throw new Error("Sign in to manage vehicles.");
    const account = user.id;
    await parkingRequest(`/vehicles/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (vehicleAccount.current === account) setVehicles(current => current.filter(vehicle => vehicle.id !== id));
  }

  async function handleConfirmBooking(draft) {
    const booking = await onAddBooking(draft);
    setBookingSpot(null);
    setConfirmedBooking(booking);
  }

  function handlePaid(payment) {
    onAddPayment(payment);
    setCheckoutBooking(null);
    setCompletedPayment(payment);
  }

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
        <div className="pn-user-brand pn-brand-link"><BrandLogo /></div>
        <p className="pn-user-label">Driver account</p>
        {user?.id && <p style={{ overflowWrap: "anywhere" }}>User ID: {user.id}</p>}
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
        {parkingLoading && <p role="status">Loading parking locations…</p>}
        {parkingError && <p role="alert">{parkingError} <button type="button" onClick={onRetryParking}>Retry</button></p>}
        <header className="pn-user-dashboard-topbar" key={activeView}>
          <div>
            <p className="pn-user-dashboard-kicker">{viewCopy.kicker}</p>
            <h1>{activeView === "home" ? `${viewCopy.title}, ${displayName.split(/\s+/)[0]}` : viewCopy.title}</h1>
          </div>
          <button
            className="pn-user-dashboard-profile"
            type="button"
            onClick={() => setActiveView("profile")}
            aria-label={`View profile details for ${displayName}`}
          >
            <span className="pn-user-avatar">{initials}</span>
            <span><strong>{displayName}</strong><small>Member since {memberSince}</small></span>
          </button>
        </header>
        {savedError && activeView !== "saved" && <p role="alert">{savedError} <button type="button" disabled={savedBusy} onClick={() => setSavedReloadKey(key => key + 1)}>Reload saved locations</button></p>}

        {activeView === "home" && <UserOverview key={user?.id || 'preview'} user={user}
          activityKey={[bookings.map(booking => booking.id + booking.status).join(','), payments.map(payment => payment.id + payment.status).join(','), vehicles.length, savedLocationRecords.length].join(':')}
          onNavigate={setActiveView} onBook={setBookingSpot} onLogin={onLogin} />}

        {activeView === "availability" && <LiveParkingAvailability onBook={setBookingSpot} />}

        {activeView === "find" && (
          <section className="pn-slots-panel">
            <p className="pn-user-dashboard-subtitle">Search by place, area, availability, or your hourly budget.</p>

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
                <span>Hourly price</span>
                <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
                  <option value="all">Any price</option>
                  <option value="under-10">Under ₹10</option>
                  <option value="10-15">₹10 - ₹15</option>
                  <option value="over-15">Over ₹15</option>
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
                          <strong className="text-dark fs-5 fw-bold">₹{slot.rate}/hour</strong>
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
                              aria-pressed={savedSpotIds.includes(slot.inventoryId)}
                              disabled={savedBusy || savedLoading}
                              onClick={() => toggleSavedLocation(slot.inventoryId)}
                            >
                              {savedSpotIds.includes(slot.inventoryId) ? "★ Saved" : "☆ Save"}
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
          </section>
        )}

        {activeView === "bookings" && (
          <BookingHistory
            bookings={bookings}
            error={bookingsError}
            loading={bookingsLoading}
            onCancel={onCancelBooking}
            onFindSpot={goToFindSpot}
          />
        )}

        {activeView === "notifications" && (
          <NotificationHistory
            notifications={notifications}
            loading={notificationsLoading}
            error={notificationsError}
            onRetry={onReloadNotifications}
            bookings={upcomingBookings}
            onMarkParked={onMarkParked}
          />
        )}

        {activeView === "saved" && (
          <SavedLocations
            locations={savedLocations}
            loading={savedLoading}
            error={savedError}
            busy={savedBusy}
            onRetry={() => setSavedReloadKey(key => key + 1)}
            onRemove={toggleSavedLocation}
            onBook={setBookingSpot}
            onFindSpot={goToFindSpot}
          />
        )}

        {activeView === "vehicles" && (
          <MyVehicles
            vehicles={vehicles}
            loading={vehiclesLoading}
            loadError={vehiclesError}
            onAdd={addVehicle}
            onRemove={removeVehicle}
          />
        )}

        {activeView === "payments" && (
          <PaymentHistory
            bookings={bookings}
            payments={payments}
            error={paymentError}
            onPay={setCheckoutBooking}
            onViewReceipt={setReceiptPayment}
          />
        )}

        {activeView === "support" && <HelpSupport key={user?.id || "preview"} user={user} />}

        {(activeView === "profile" || activeView === "update") && <UserProfile
          key={(user?.id || 'preview') + activeView} user={user} edit={activeView === 'update'}
          onUpdateUser={onUpdateUser} onEdit={() => setActiveView('update')} onView={() => setActiveView('profile')} onLogin={onLogin} />}
      </main>

      <ParkingSpotDetails
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
        onReserve={() => { setBookingSpot(selectedSpot); setSelectedSpot(null); }}
      />

      <SelectDateTime
        vehicles={vehicles}
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
