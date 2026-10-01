import React from "react";
import AddParkingSpot from "../features/parkingSpot/AddParkingSpot";
import EditParkingSpot from "../features/parkingSpot/EditParkingSpot";
import AdminBookingHistory from "../features/booking/AdminBookingHistory";
import AdminPaymentHistory from "../features/payment/AdminPaymentHistory";
import { INITIAL_BOOKINGS } from "../features/booking/bookingData";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "users", label: "Manage users", icon: "👤" },
  { id: "requests", label: "Host requests", icon: "✓" },
  { id: "slots", label: "Manage parking slots", icon: "▣" },
  { id: "bookings", label: "Manage bookings", icon: "◔" },
  { id: "payments", label: "Manage payments", icon: "$" },
  { id: "reports", label: "View reports", icon: "↗" },
];

const INITIAL_PARKING_SPOTS = [
  { id: "A-12", vehicle: "Car", location: "Brainware University Main Gate", rate: 13, available: 4 },
  { id: "B-07", vehicle: "Two wheeler", location: "Brainware University Student Parking", rate: 4, available: 12 },
  { id: "C-18", vehicle: "SUV / Van", location: "Barasat Station Parking", rate: 18, available: 2 },
];

// Small deterministic "sparkline" — no charting library needed.
function Sparkline({ points, color }) {
  const width = 88;
  const height = 30;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="pn-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AnimatedCount({ value }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(value);
      return undefined;
    }

    const duration = 900;
    const start = performance.now();
    let frame;

    function animate(now) {
      const progress = Math.min((now - start) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(value * easedProgress));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return count.toLocaleString();
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }

  if (hour >= 12 && hour < 18) {
    return "Good afternoon";
  }

  return "Good night";
}

function AdminDashboard({ onBackHome, onLogout }) {
  const [activeSection, setActiveSection] = React.useState("dashboard");
  const [parkingSpots, setParkingSpots] = React.useState(INITIAL_PARKING_SPOTS);
  const [bookings, setBookings] = React.useState(INITIAL_BOOKINGS);
  const [editingSpot, setEditingSpot] = React.useState(null);

  const activeLabel =
    NAV_ITEMS.find((item) => item.id === activeSection)?.label ?? "Dashboard";
  const greeting = getGreeting();
  const availableSlots = parkingSpots.reduce((total, spot) => total + spot.available, 0);
  const bookedSlots = bookings.filter((booking) =>
    ["upcoming", "checked_in"].includes(booking.status),
  ).length;
  const trackedSlots = availableSlots + bookedSlots;
  const availablePercent = trackedSlots
    ? Math.round((availableSlots / trackedSlots) * 100)
    : 0;

  function handleAddParkingSpot(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const spot = {
      id: formData.get("spotId").toString().trim().toUpperCase(),
      vehicle: formData.get("vehicleType"),
      location: formData.get("location").toString().trim(),
      rate: Number(formData.get("rate")),
      available: Number(formData.get("available")),
    };

    setParkingSpots((currentSpots) => [spot, ...currentSpots]);
    event.currentTarget.reset();
  }

  function handleUpdateParkingSpot(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updatedSpot = {
      id: formData.get("spotId").toString().trim().toUpperCase(),
      vehicle: formData.get("vehicleType"),
      location: formData.get("location").toString().trim(),
      rate: Number(formData.get("rate")),
      available: Number(formData.get("available")),
    };

    setParkingSpots((currentSpots) =>
      currentSpots.map((spot) =>
        spot.id === editingSpot.id ? updatedSpot : spot,
      ),
    );
    setEditingSpot(null);
  }

  function handleBookingStatusChange(bookingId, status, label) {
    const event = { label, at: new Date().toISOString() };
    setBookings((currentBookings) => currentBookings.map((booking) => (
      booking.id === bookingId
        ? { ...booking, status, timeline: [...booking.timeline, event] }
        : booking
    )));
  }

  return (
    <div className="pn-scope pn-dash">
      <aside className="pn-dash-sidebar">
        <div className="pn-dash-brand">
          <span>P</span> ParkNova
        </div>
        <p className="pn-dash-label">Workspace</p>
        <nav className="pn-dash-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeSection === item.id ? "active" : ""}
              aria-current={activeSection === item.id ? "page" : undefined}
              onClick={() => setActiveSection(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <button className="pn-dash-nav pn-dash-home" type="button" onClick={onBackHome}>
          <span aria-hidden="true">←</span> Back to home
        </button>
        <button className="pn-dash-nav pn-dash-logout" type="button" onClick={onLogout}>
          <span aria-hidden="true">⏻</span> Log out
        </button>
      </aside>

      <main className="pn-dash-main">
        {activeSection === "dashboard" ? (
          <>
            <div className="pn-dash-topbar">
              <div>
                <p className="pn-dash-kicker">Administrator portal</p>
                <h1>Dashboard</h1>
              </div>
              <div className="pn-dash-profile">
                <div className="pn-dash-avatar">A</div>
                <div>
                  <strong>Admin profile</strong>
                  <small>Online now</small>
                </div>
              </div>
            </div>

            <div className="pn-banner">
              <div>
                <h2>{greeting}, administrator.</h2>
                <p>Here&apos;s what&apos;s happening across your parking network.</p>
              </div>
            </div>

            <div className="pn-stat-grid">
              <div className="pn-stat-card">
                <span>Total users</span>
                <strong>12,480</strong>
                <div className="pn-stat-foot">
                  <small>+8.4% this month</small>
                  <Sparkline points={[4, 6, 5, 8, 7, 10, 12]} color="#ee7548" />
                </div>
              </div>
              <div className="pn-stat-card pn-slot-stat available">
                <span>Available slots</span>
                <strong><AnimatedCount value={availableSlots} /></strong>
                <div className="pn-stat-foot">
                  <small>Across listed locations</small>
                  <span className="pn-slot-indicator" aria-hidden="true" />
                </div>
              </div>
              <div className="pn-stat-card pn-slot-stat booked">
                <span>Booked slots</span>
                <strong><AnimatedCount value={bookedSlots} /></strong>
                <div className="pn-stat-foot">
                  <small>Upcoming or checked in</small>
                  <span className="pn-slot-indicator" aria-hidden="true" />
                </div>
              </div>
              <div className="pn-stat-card">
                <span>Monthly revenue</span>
                <strong>$48.6k</strong>
                <div className="pn-stat-foot">
                  <small>+6.8% from last month</small>
                  <Sparkline points={[6, 6, 7, 9, 8, 10, 11]} color="#ee7548" />
                </div>
              </div>
            </div>

            <div className="pn-panel-grid">
              <div className="pn-data-card">
                <div className="pn-data-card-head">
                  <div>
                    <p className="pn-dash-kicker" style={{ margin: "0 0 6px" }}>
                      Live activity
                    </p>
                    <h2>Recent bookings</h2>
                  </div>
                  <button type="button" onClick={() => setActiveSection("bookings")}>View all</button>
                </div>
                {bookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className={`pn-activity-row ${booking.status}`}
                  >
                    <div
                      className="pn-avatar-sm"
                      style={{ background: booking.tone }}
                    >
                      {initials(booking.userName)}
                    </div>
                    <p>
                      <strong>{booking.userName}</strong>
                      <small>{booking.spotId} · {booking.date} {booking.time}</small>
                    </p>
                    <span className={`pn-status-tag ${booking.status}`}>
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pn-data-card">
                <div className="pn-data-card-head">
                  <div>
                    <p className="pn-dash-kicker" style={{ margin: "0 0 6px" }}>
                      Capacity
                    </p>
                    <h2>Slot availability</h2>
                  </div>
                  <span className="pn-capacity-value">{availablePercent}%</span>
                </div>
                <div className="pn-progress-track">
                  <span
                    className="pn-progress-fill"
                    style={{ width: `${availablePercent}%` }}
                  />
                  <span
                    className="pn-progress-booked"
                    style={{ width: `${100 - availablePercent}%` }}
                  />
                </div>
                <div className="pn-capacity-legend">
                  <div>
                    <span className="available" aria-hidden="true" />
                    <span>Available</span>
                    <strong>{availableSlots}</strong>
                  </div>
                  <div>
                    <span className="booked" aria-hidden="true" />
                    <span>Booked</span>
                    <strong>{bookedSlots}</strong>
                  </div>
                </div>
                <p className="pn-capacity-caption">
                  Across {parkingSpots.length} listed locations
                </p>
                <button
                  type="button"
                  className="pn-manage-slots-link"
                  onClick={() => setActiveSection("slots")}
                >
                  Manage slots <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </>
        ) : activeSection === "bookings" ? (
          <AdminBookingHistory bookings={bookings} onStatusChange={handleBookingStatusChange} />
        ) : activeSection === "payments" ? (
          <AdminPaymentHistory />
        ) : activeSection === "slots" ? (
          <section className="pn-admin-slots-page">
            <div className="pn-dash-topbar">
              <div>
                <p className="pn-dash-kicker">Parking inventory</p>
                <h1>Manage parking slots</h1>
              </div>
              <span className="pn-capacity-value">{parkingSpots.length} spots</span>
            </div>

            <div className="pn-admin-slots-layout">
              <div className="pn-data-card">
                <div className="pn-data-card-head">
                  <div>
                    <p className="pn-dash-kicker" style={{ margin: "0 0 6px" }}>
                      Live inventory
                    </p>
                    <h2>View parking spots</h2>
                  </div>
                  <span className="pn-capacity-value">{parkingSpots.reduce((total, spot) => total + spot.available, 0)} available</span>
                </div>
                <div className="pn-admin-spot-list">
                  {parkingSpots.map((spot) => (
                    <article className="pn-admin-spot-row" key={spot.id}>
                      <span className="pn-admin-spot-id">{spot.id}</span>
                      <div>
                        <strong>{spot.location}</strong>
                        <small>{spot.vehicle} · {spot.available} spaces available</small>
                      </div>
                      <div className="pn-admin-spot-actions">
                        <b>${spot.rate}/day</b>
                        <button type="button" onClick={() => setEditingSpot(spot)}>
                          Edit
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="pn-data-card">
                <div className="pn-data-card-head">
                  <div>
                    <p className="pn-dash-kicker" style={{ margin: "0 0 6px" }}>
                      {editingSpot ? "Update listing" : "New listing"}
                    </p>
                    <h2>{editingSpot ? "Update spot information" : "Add parking spot"}</h2>
                  </div>
                </div>
                {editingSpot ? (
                  <EditParkingSpot
                    spot={editingSpot}
                    onSave={handleUpdateParkingSpot}
                    onCancel={() => setEditingSpot(null)}
                  />
                ) : (
                  <AddParkingSpot onAdd={handleAddParkingSpot} />
                )}
              </div>
            </div>
          </section>
        ) : (
          <div className="pn-placeholder">
            <div className="pn-placeholder-icon" aria-hidden="true">
              {NAV_ITEMS.find((item) => item.id === activeSection)?.icon}
            </div>
            <h2>{activeLabel}</h2>
            <p>
              This section is ready to be wired up to your real data — the
              layout, nav, and styling are already in place.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
