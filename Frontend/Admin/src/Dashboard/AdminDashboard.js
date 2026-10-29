import BrandLogo from "../shared/BrandLogo";
import React from "react";
import AddParkingSpot from "../features/parkingSpot/AddParkingSpot";
import EditParkingSpot from "../features/parkingSpot/EditParkingSpot";
import ParkingLocations from "../features/parkingSpot/ParkingLocations";
import SupportRequests from "../features/SupportRequests";
import AdminOverview from "../features/reporting/AdminOverview";
import AdminReports from "../features/reporting/AdminReports";
import { subscribeToAvailability } from "../features/shared/availabilityEvents";
import AdminBookingHistory from "../features/booking/AdminBookingHistory";
import AdminPaymentHistory from "../features/payment/AdminPaymentHistory";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "users", label: "Manage users", icon: "👤" },
  { id: "locations", label: "Parking locations", icon: "⌖" },
  { id: "slots", label: "Parking inventory", icon: "▣" },
  { id: "bookings", label: "Manage bookings", icon: "◔" },
  { id: "payments", label: "Manage payments", icon: "$" },
  { id: "support", label: "Help & support", icon: "?" },
  { id: "reports", label: "View reports", icon: "↗" },
];
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function adminParkingRequest(token, path = "", options = {}) {
  const response = await fetch(`${API_URL}/admin/parking${path}`, {
    ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Could not save parking slot changes.");
  return result;
}

function parkingFormValue(form) {
  const data = new FormData(form);
  return { parkingId: data.get("parkingId") || undefined, vehicle: data.get("vehicleType"), location: String(data.get("location") || "").trim(),
    area: String(data.get("area") || "").trim(), rate: data.get("rate"), totalSlots: Number(data.get("totalSlots")) };
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AdminDashboard({ onBackHome, onLogout, token, isMember = false }) {
  const [activeSection, setActiveSection] = React.useState("dashboard");
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const [users, setUsers] = React.useState([]);
  const [usersLoading, setUsersLoading] = React.useState(true);
  const [usersError, setUsersError] = React.useState("");
  const [userSearch, setUserSearch] = React.useState("");
  const [usersReloadKey, setUsersReloadKey] = React.useState(0);
  const [copyMessage, setCopyMessage] = React.useState("");
  const [parkingSpots, setParkingSpots] = React.useState([]);
  const [parkingLocations, setParkingLocations] = React.useState([]);
  const [slotsLoading, setSlotsLoading] = React.useState(true);
  const [slotsError, setSlotsError] = React.useState("");
  const [slotsNotice, setSlotsNotice] = React.useState("");
  const [slotsBusy, setSlotsBusy] = React.useState(false);
  const slotMutation = React.useRef(false);
  const slotRevision = React.useRef(0);
  const [bookings, setBookings] = React.useState([]);
  const [bookingsLoading, setBookingsLoading] = React.useState(true);
  const [bookingsError, setBookingsError] = React.useState("");
  const [editingSpot, setEditingSpot] = React.useState(null);

  const activeLabel =
    NAV_ITEMS.find((item) => item.id === activeSection)?.label ?? "Dashboard";
  React.useEffect(() => {
    const controller = new AbortController();
    setParkingSpots([]);
    setSlotsLoading(true);
    async function load() {
      if (slotMutation.current) return;
      const revision = slotRevision.current;
      try {
        const result = isMember
          ? await fetch(`${API_URL}/parking`, { signal: controller.signal }).then(async response => {
            const body = await response.json();
            if (!response.ok) throw new Error(body.message || "Could not load parking slots.");
            return body;
          })
          : await adminParkingRequest(token, "", { signal: controller.signal });
        const locationResult = isMember ? { locations: [] } : await fetch(`${API_URL}/admin/locations`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        }).then(async response => {
          const body = await response.json();
          if (!response.ok) throw new Error(body.message || "Could not load parking locations.");
          return body;
        });
        if (!controller.signal.aborted && revision === slotRevision.current) setParkingLocations(locationResult.locations);
        if (!controller.signal.aborted && revision === slotRevision.current) { setParkingSpots(result.parking); setSlotsError(""); }
      } catch (error) { if (!controller.signal.aborted && revision === slotRevision.current) setSlotsError(error.message); }
      finally { if (!controller.signal.aborted) setSlotsLoading(false); }
    }
    load();
    const timer = window.setInterval(load, 15000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [token, isMember]);

  React.useEffect(() => {
    setBookings([]);
    if (isMember) {
      setBookingsLoading(false);
      setBookingsError("Booking management requires an administrator account.");
      return undefined;
    }
    const controller = new AbortController();
    setBookingsLoading(true);
    let pending = false, queued = false;
    async function load() {
      if (controller.signal.aborted) return;
      if (pending) { queued = true; return; }
      pending = true;
      try {
        const response = await fetch(`${API_URL}/admin/bookings`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load bookings.");
        if (!controller.signal.aborted && !queued) { setBookings(result.bookings); setBookingsError(""); }
      } catch (error) { if (!controller.signal.aborted && !queued) setBookingsError(error.message); }
      finally {
        pending = false;
        if (!controller.signal.aborted) {
          setBookingsLoading(false);
          if (queued) { queued = false; load(); }
        }
      }
    }
    load();
    const unsubscribe = subscribeToAvailability(load);
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); unsubscribe(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [token, isMember]);

  React.useEffect(() => {
    if (isMember) { setUsersLoading(false); return undefined; }
    let cancelled = false;
    setUsersLoading(true);
    fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load users.");
        return result;
      })
      .then((result) => { if (!cancelled) { setUsers(result); setUsersError(""); } })
      .catch((error) => { if (!cancelled) setUsersError(error.message); })
      .finally(() => { if (!cancelled) setUsersLoading(false); });
    return () => { cancelled = true; };
  }, [token, usersReloadKey, isMember]);

  const filteredUsers = users.filter((user) =>
    `${user.name || ""} ${user.email || ""} ${user._id || user.id || ""}`.toLowerCase().includes(userSearch.trim().toLowerCase()),
  );

  function exportUsersCsv() {
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Member ID", "Name", "Email", "Joined"],
      ...filteredUsers.map((user) => [
        user._id || user.id || "",
        user.name,
        user.email,
        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "parknova-users.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyUserEmail(email) {
    try {
      await navigator.clipboard.writeText(email);
      setCopyMessage(`Copied ${email}`);
    } catch {
      setCopyMessage("Could not copy email. Select it and copy manually.");
    }
    window.setTimeout(() => setCopyMessage(""), 2200);
  }

  async function removeUserFromView(user) {
    const label = user.name || user.email || "this user";
    if (!window.confirm(`Permanently delete ${label}'s account? This cannot be undone.`)) return;
    try {
      const response = await fetch(`${API_URL}/admin/users/${user._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not delete this account.");
      setUsers((currentUsers) => currentUsers.filter((item) => item._id !== user._id));
      setCopyMessage(result.message || "User account deleted.");
    } catch (error) {
      setCopyMessage(error.message || "Could not reach the server.");
    }
    window.setTimeout(() => setCopyMessage(""), 3000);
  }

  async function handleCreateLocation(event) {
    event.preventDefault();
    if (slotMutation.current || isMember) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    slotMutation.current = true; slotRevision.current += 1;
    setSlotsBusy(true); setSlotsError(""); setSlotsNotice("");
    try {
      const response = await fetch(`${API_URL}/admin/locations`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: data.get("name"), address: data.get("address") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not create location.");
      setParkingLocations(current => [...current, result.location]);
      form.reset(); setSlotsNotice("Location created. Add inventory to make it available for booking.");
    } catch (error) { setSlotsError(error.message); }
    finally { slotMutation.current = false; setSlotsBusy(false); }
  }

  async function handleAddParkingSpot(event) {
    event.preventDefault();
    if (slotMutation.current || isMember) return;
    const form = event.currentTarget;
    const value = parkingFormValue(form);
    slotMutation.current = true; slotRevision.current += 1;
    setSlotsBusy(true); setSlotsError(""); setSlotsNotice("");
    try {
      const result = await adminParkingRequest(token, "", { method: "POST", body: JSON.stringify(value) });
      setParkingSpots(current => [result.parking, ...current]);
      form.reset(); setSlotsNotice("Parking slot added.");
    } catch (error) { setSlotsError(error.message); }
    finally { slotMutation.current = false; setSlotsBusy(false); }
  }

  async function handleUpdateParkingSpot(event) {
    event.preventDefault();
    if (slotMutation.current || isMember) return;
    const value = parkingFormValue(event.currentTarget);
    const id = editingSpot.inventoryId;
    slotMutation.current = true; slotRevision.current += 1;
    setSlotsBusy(true); setSlotsError(""); setSlotsNotice("");
    try {
      const result = await adminParkingRequest(token, `/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(value) });
      setParkingSpots(current => current.map(spot => spot.inventoryId === id ? result.parking : spot));
      setEditingSpot(null); setSlotsNotice("Parking slot updated.");
    } catch (error) { setSlotsError(error.message); }
    finally { slotMutation.current = false; setSlotsBusy(false); }
  }

  async function handleDeleteParkingSpot(spot) {
    if (slotMutation.current || isMember || !window.confirm(`Remove ${spot.location} (${spot.id}) from parking listings?`)) return;
    slotMutation.current = true; slotRevision.current += 1;
    setSlotsBusy(true); setSlotsError(""); setSlotsNotice("");
    try {
      await adminParkingRequest(token, `/${encodeURIComponent(spot.inventoryId)}`, { method: "DELETE" });
      setParkingSpots(current => current.filter(item => item.inventoryId !== spot.inventoryId));
      if (editingSpot?.inventoryId === spot.inventoryId) setEditingSpot(null);
      setSlotsNotice("Parking slot removed from listings.");
    } catch (error) { setSlotsError(error.message); }
    finally { slotMutation.current = false; setSlotsBusy(false); }
  }

  async function handleBookingStatusChange(bookingId, status) {
    const response = await fetch(`${API_URL}/admin/bookings/${encodeURIComponent(bookingId)}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not update the booking.");
    setBookings(current => current.map(booking => booking.id === bookingId ? result.booking : booking));
  }

  return (
    <div className={activeSection === "dashboard" ? "pn-scope pn-dash pn-dash-overview" : "pn-scope pn-dash"}>
      <aside className="pn-dash-sidebar">
        <div className="pn-dash-brand pn-brand-link">
          <BrandLogo />
        </div>
        <p className="pn-dash-label">Workspace</p>
        <nav className="pn-dash-nav" aria-label="Admin navigation">
          {NAV_ITEMS.filter(item => !isMember || !["users", "support", "reports"].includes(item.id)).map((item) => (
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
        {activeSection === "dashboard" && !isMember && <header className="pn-admin-topbar">
          <form className="pn-admin-global-search" onSubmit={event => { event.preventDefault(); setActiveSection("users"); }}>
            <span className="pn-admin-search-mark" aria-hidden="true" />
            <input value={userSearch} onChange={event => setUserSearch(event.target.value)} placeholder="Search users..." aria-label="Search registered users" />
            <kbd>Enter</kbd>
          </form>
          <div className="pn-admin-top-actions">
            <div className="pn-admin-location-pill"><span /><div><small>Workspace</small><strong>All locations</strong></div></div>
            <div className="pn-admin-notifications">
              <button className="pn-admin-icon-button" type="button" aria-label="Activity" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(open => !open)}><span aria-hidden="true">!</span><i>{bookings.filter(booking => booking.status === "upcoming" && new Date(booking.endsAt) > new Date()).length}</i></button>
              {notificationsOpen && <div className="pn-admin-notification-popover"><strong>Activity</strong><button type="button" onClick={() => { setActiveSection("bookings"); setNotificationsOpen(false); }}>View current booking records</button><button type="button" onClick={() => { setActiveSection("support"); setNotificationsOpen(false); }}>View support requests</button></div>}
            </div>
            <div className="pn-admin-top-profile"><span>A</span><div><small>Administrator</small><strong>Admin workspace</strong></div></div>
          </div>
        </header>}
        {activeSection === "dashboard" ? (
          isMember ? <section className="pn-data-card"><h1>Member dashboard</h1><p>View current parking inventory from the sidebar. Reports and account summaries require an administrator account.</p><p>{parkingSpots.reduce((sum, spot) => sum + spot.available, 0)} spaces available.</p></section>
            : <AdminOverview token={token} onNavigate={setActiveSection} />
        ) : activeSection === "users" ? (
          <section className="pn-admin-slots-page pn-users-page">
            <div className="pn-users-heading">
              <div className="pn-users-title">
                <p className="pn-dash-kicker">Accounts</p>
                <h1>Registered users</h1>
                <p>Search your member directory and manage account details.</p>
              </div>
              <div className="pn-users-heading-actions">
                <span className="pn-users-total"><strong>{users.length}</strong> members</span>
                <button className="pn-users-button pn-users-button-secondary" type="button" onClick={() => setUsersReloadKey((key) => key + 1)} disabled={usersLoading}>
                  Refresh
                </button>
                <button className="pn-users-button pn-users-button-primary" type="button" onClick={exportUsersCsv} disabled={!filteredUsers.length}>
                  Export CSV
                </button>
              </div>
            </div>
            <div className="pn-users-toolbar">
              <label className="pn-users-search">
                <span aria-hidden="true">Find</span>
                <input type="search" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by member ID, name or email..." aria-label="Search users by member ID, name or email" />
                {userSearch && <button type="button" onClick={() => setUserSearch("")} aria-label="Clear search">Clear</button>}
              </label>
              <span className="pn-users-results">{filteredUsers.length} {filteredUsers.length === 1 ? "result" : "results"}</span>
            </div>
            {copyMessage && <p className="pn-users-toast" role="status">{copyMessage}</p>}
            <div className="pn-users-table-card">
              {usersLoading ? <div className="pn-users-empty"><span className="pn-users-loading-dot" /> Loading your member directory...</div>
                : usersError ? <div className="pn-users-empty pn-users-error" role="alert"><strong>Could not load users</strong><span>{usersError}</span><button className="pn-users-button pn-users-button-secondary" type="button" onClick={() => setUsersReloadKey((key) => key + 1)}>Try again</button></div>
                  : users.length === 0 ? <div className="pn-users-empty"><strong>No users yet</strong><span>Registered accounts will appear here.</span></div>
                    : filteredUsers.length === 0 ? <div className="pn-users-empty"><strong>No matches found</strong><span>Try another name or email.</span></div>
                      : <div className="pn-users-table-wrap">
                        <table className="pn-users-table">
                          <thead><tr><th scope="col">Member</th><th scope="col">Member ID</th><th scope="col">Email address</th><th scope="col">Joined</th><th scope="col">Last login</th><th scope="col">Status</th><th scope="col"><span className="pn-sr-only">Actions</span></th></tr></thead>
                          <tbody>{filteredUsers.map((user) => <tr key={user._id || user.email}>
                            <td><div className="pn-users-member"><span className="pn-users-avatar">{initials(user.name || user.email || "U")}</span><span className="pn-users-name">{user.name || "Unnamed user"}</span></div></td>
                            <td><code>{user._id || user.id || "—"}</code></td>
                            <td className="pn-users-email">{user.email}</td>
                            <td className="pn-users-date">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
                            <td className="pn-users-date">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
                            <td><span className="pn-users-status"><span /> Active</span></td>
                            <td className="pn-users-row-action"><div className="pn-users-row-actions"><button type="button" onClick={() => copyUserEmail(user.email)} aria-label={`Copy ${user.email}`} title="Copy email">Copy email</button><button className="pn-users-delete" type="button" onClick={() => removeUserFromView(user)} aria-label={`Delete account for ${user.name || user.email}`} title="Delete account">Delete</button></div></td>
                          </tr>)}</tbody>
                        </table>
                      </div>}
            </div>
          </section>
        ) : activeSection === "bookings" ? (
          <AdminBookingHistory bookings={bookings} loading={bookingsLoading} error={bookingsError} onStatusChange={handleBookingStatusChange} />
        ) : activeSection === "payments" ? (
          <AdminPaymentHistory token={token} isMember={isMember} />
        ) : activeSection === "reports" && !isMember ? (
          <AdminReports token={token} />
        ) : activeSection === "support" && !isMember ? (
          <SupportRequests key={token} token={token} />
        ) : activeSection === "locations" ? (
          <ParkingLocations locations={parkingLocations} loading={slotsLoading} error={slotsError} notice={slotsNotice}
            busy={slotsBusy} disabled={isMember} onCreate={handleCreateLocation} />
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
              {slotsLoading && <p role="status">Loading parking slots…</p>}
              {slotsError && <p role="alert">{slotsError}</p>}
              {slotsNotice && <p role="status">{slotsNotice}</p>}
              {isMember && <p>Only administrators can add, edit or delete parking slots.</p>}
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
                    <article className="pn-admin-spot-row" key={spot.inventoryId}>
                      <span className="pn-admin-spot-id">{spot.id}</span>
                      <div>
                        <strong>{spot.location}</strong>
                        <small>{spot.vehicle} · {spot.available} available / {spot.totalSlots} total · {spot.area}</small>
                      </div>
                      <div className="pn-admin-spot-actions">
                        <b>₹{spot.rate}/hour</b>
                        <button type="button" disabled={slotsBusy || isMember} onClick={() => { setEditingSpot(spot); setSlotsError(""); setSlotsNotice(""); }}>
                          Edit
                        </button>
                        <button type="button" disabled={slotsBusy || isMember} onClick={() => handleDeleteParkingSpot(spot)}>Delete</button>
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
                    key={editingSpot.inventoryId}
                    spot={editingSpot}
                    locations={parkingLocations}
                    busy={slotsBusy}
                    disabled={isMember}
                    onSave={handleUpdateParkingSpot}
                    onCancel={() => setEditingSpot(null)}
                  />
                ) : (
                  <AddParkingSpot onAdd={handleAddParkingSpot} busy={slotsBusy} disabled={isMember} locations={parkingLocations} />
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
