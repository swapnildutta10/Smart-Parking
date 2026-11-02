import React from "react";
import BrandLogo from "../features/shared/BrandLogo";
import UserLogin from "../features/auth/UserLogin";
import { authRequest } from "../features/auth/authApi";
import UserDashboard from "../features/home/UserDashboard";
import HomeHero from "../features/home/HomeHero";
import HomeChatbot from "../features/home/HomeChatbot";
import HomeParkingGallery from "../features/home/HomeParkingGallery";
import ParkingDirectory from "../features/parkingSpot/ParkingDirectory";
import { parkingRequest, bookingWindow } from "../features/parkingSpot/parkingApi";
import { subscribeToAvailability } from "../features/parkingSpot/availabilityEvents";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function App() {
  const [started, setStarted] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [signupError, setSignupError] = React.useState("");
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [lampOn, setLampOn] = React.useState(false);
  // "user" | "userHome" | null (null = not viewing the login flow)
  const [authView, setAuthView] = React.useState(null);
  const [authRole, setAuthRole] = React.useState(null);
  const [authUser, setAuthUser] = React.useState(null);
  const [darkMode, setDarkMode] = React.useState(
    () => localStorage.getItem("parkly-theme") !== "light",
  );
  const [themeAnimating, setThemeAnimating] = React.useState(false);
  const [bookings, setBookings] = React.useState([]);
  const [bookingsError, setBookingsError] = React.useState("");
  const [bookingsLoading, setBookingsLoading] = React.useState(false);
  const [parkingSlots, setParkingSlots] = React.useState([]);
  const [parkingError, setParkingError] = React.useState("");
  const [parkingLoading, setParkingLoading] = React.useState(true);
  const sessionUser = React.useRef(null);
  sessionUser.current = authUser?.id || null;
  const parkingVersion = React.useRef(0);
  const reloadParking = React.useCallback(async () => {
    const version = ++parkingVersion.current;
    try {
      const result = await parkingRequest("/parking");
      if (version === parkingVersion.current) { setParkingSlots(result.parking); setParkingError(""); }
    } catch (error) { if (version === parkingVersion.current) setParkingError(error.message); }
    finally { if (version === parkingVersion.current) setParkingLoading(false); }
  }, []);
  React.useEffect(() => {
    reloadParking();
    const unsubscribe = subscribeToAvailability(reloadParking);
    const timer = window.setInterval(reloadParking, 30000);
    return () => { unsubscribe(); window.clearInterval(timer); };
  }, [reloadParking]);
  React.useEffect(() => {
    setBookings([]);
    setPayments([]);
    setNotifications([]);
    setBookingsError("");
    setBookingsLoading(Boolean(authUser?.id));
    if (!authUser?.id) return undefined;
    const controller = new AbortController();
    const load = () => Promise.allSettled([
      parkingRequest("/bookings", { signal: controller.signal })
        .then(result => { if (!controller.signal.aborted) { setBookings(result.bookings); setBookingsError(""); } })
        .catch(error => { if (!controller.signal.aborted) setBookingsError(error.message); })
        .finally(() => { if (!controller.signal.aborted) setBookingsLoading(false); }),
      parkingRequest("/payments", { signal: controller.signal })
        .then(result => { if (!controller.signal.aborted) { setPayments(result.payments); setPaymentError(""); } })
        .catch(error => { if (!controller.signal.aborted) setPaymentError(error.message); }),
    ]);
    load();
    const timer = window.setInterval(load, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [authUser?.id]);
  // Payments live here too (same reason as bookings) so receipts and
  // paid/unpaid status survive switching between dashboard views.
  const [payments, setPayments] = React.useState([]);
  const [paymentError, setPaymentError] = React.useState("");
  const [notifications, setNotifications] = React.useState([]);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [notificationsError, setNotificationsError] = React.useState("");
  const reloadNotifications = React.useCallback(async (signal) => {
    const account = authUser?.id;
    if (!account) return;
    try {
      const result = await parkingRequest("/notifications", { signal });
      if (!signal?.aborted && sessionUser.current === account) { setNotifications(result.notifications); setNotificationsError(""); }
    } catch (error) {
      if (!signal?.aborted && sessionUser.current === account) setNotificationsError(error.message);
    } finally {
      if (!signal?.aborted && sessionUser.current === account) setNotificationsLoading(false);
    }
  }, [authUser?.id]);
  React.useEffect(() => {
    setNotifications([]); setNotificationsError("");
    setNotificationsLoading(Boolean(authUser?.id));
    if (!authUser?.id) return undefined;
    const controller = new AbortController();
    const load = () => reloadNotifications(controller.signal);
    load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [authUser?.id, reloadNotifications]);


  async function addBooking(draft) {
    if (!authUser) throw new Error("Sign in to reserve parking.");
    const currentUser = authUser.id;
    const { booking } = await parkingRequest("/bookings", { method: "POST", body: {
      inventory_id: draft.inventoryId, vehicle_plate: draft.vehiclePlate, request_id: draft.requestId,
      ...bookingWindow(draft.date, draft.time, draft.duration),
    } });
    if (sessionUser.current === currentUser) {
      setBookings(current => [booking, ...current.filter(b => b.id !== booking.id)]);
      reloadNotifications();
    }
    reloadParking();
    return booking;
  }

  function addPayment(payment) {
    if (!authUser || payment.customerEmail !== authUser.email) return;
    setPayments((current) => (
      current.some((item) => item.id === payment.id)
        ? current
        : [payment, ...current]
    ));
  }

  async function cancelBooking(bookingId) {
    const currentUser = sessionUser.current;
    const { booking } = await parkingRequest(`/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: "PATCH" });
    if (sessionUser.current === currentUser) {
      setBookings(current => current.map(item => item.id === bookingId ? booking : item));
      setPayments(current => current.map(item => item.bookingId === bookingId && item.status === "paid"
        ? { ...item, status: "refunded" } : item));
      reloadNotifications();
    }
    reloadParking();
  }

  async function markBookingParked(bookingId) {
    const currentUser = sessionUser.current;
    const { booking } = await parkingRequest(`/bookings/${encodeURIComponent(bookingId)}/check-in`, { method: "PATCH" });
    if (sessionUser.current === currentUser) {
      setBookings(current => current.map(item => item.id === bookingId ? booking : item));
      reloadNotifications();
    }
  }

  function viewFromLocation() {
    if (window.location.hash === "#parking") {
      return "parking";
    }
    if (window.location.hash === "#userHome") {
      return "userHome";
    }
    if (window.location.hash === "#user") {
      return "user";
    }
    return null;
  }

  function navigateTo(view) {
    setAuthView(view);
    const destination = view ? `#${view}` : "#top";
    window.history.pushState({ authView: view }, "", destination);
  }

  React.useEffect(() => {
    const handleBrowserNavigation = (event) => {
      setAuthView(event.state?.authView ?? viewFromLocation());
    };

    if (!window.history.state?.authView) {
      const initialView = viewFromLocation();
      setAuthView(initialView);
      window.history.replaceState({ authView: initialView }, "", window.location.href);
    }
    window.addEventListener("popstate", handleBrowserNavigation);
    return () => window.removeEventListener("popstate", handleBrowserNavigation);
  }, []);

  React.useEffect(() => {
    const token = localStorage.getItem("parknova-auth-token");
    if (!token) return undefined;
    let cancelled = false;
    fetch(`${API_URL}/users/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw Object.assign(new Error(result.message || "Session expired."), { status: response.status });
        if (!cancelled) {
          setAuthUser(result.user);
          setAuthRole("user");
          setAuthView("userHome");
          window.history.replaceState({ authView: "userHome" }, "", "#userHome");
        }
      })
      .catch((error) => {
        if (!cancelled && [401, 403].includes(error.status)) localStorage.removeItem("parknova-auth-token");
      });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("parkly-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isRegistering) return;
    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    setIsRegistering(true);
    setSignupError("");
    try {
      await authRequest("register", {
          name: `${firstName} ${lastName}`.trim(),
          email: formData.get("email"),
          password: formData.get("password"),
      });
      setSignupError("");
      setSubmitted(true);
    } catch (error) {
      setSignupError(error.message || "Could not reach the server. Check that the backend is running.");
    } finally {
      setIsRegistering(false);
    }
  }

  function handleThemeToggle() {
    setDarkMode((currentMode) => !currentMode);
    setThemeAnimating(true);
  }

  const welcomePage = (
    <main className="home-page" id="top">
      <div className="home-utility">
        <span>Welcome to ParkNova online parking booking service</span>
        <span className="utility-contact">
          Parkstreet, Kolkata, India &nbsp; ✉ support@parknova.com
        </span>
      </div>
      <HomeHero
        authRole={authRole}
        darkMode={darkMode}
        themeAnimating={themeAnimating}
        onToggleTheme={handleThemeToggle}
        onThemeAnimationEnd={() => setThemeAnimating(false)}
        onLoginClick={() => navigateTo(authRole === "user" ? "userHome" : "user")}
      />
      <section className="feature-strip" id="features">
        <article>
          <span className="feature-number">01</span>
          <span className="feature-icon">▣</span>
          <div>
            <h2>Save money</h2>
            <p>Save up to 70% compared to on-airport parking.</p>
          </div>
        </article>
        <article>
          <span className="feature-number">02</span>
          <span className="feature-icon">◷</span>
          <div>
            <h2>Save time</h2>
            <p>Compare parking and book your reservation quickly.</p>
          </div>
        </article>
        <article>
          <span className="feature-number">03</span>
          <span className="feature-icon">♧</span>
          <div>
            <h2>Save stress</h2>
            <p>Guarantee your spot by booking in advance.</p>
          </div>
        </article>
      </section>
      <section className="why-section section-light" id="about">
        <div className="section-heading">
          <p className="section-kicker">The ParkNova difference</p>
          <h2>Why choose ParkNova?</h2>
          <span></span>
          <p>
            We make parking feel simple, reliable, and a little less like a
            daily chore.
          </p>
        </div>
        <div className="why-grid">
          <article>
            <span>⌖</span>
            <h3>Closer to where you need to be</h3>
            <p>Verified spaces in the best locations across the city.</p>
          </article>
          <article>
            <span>◷</span>
            <h3>Your time is worth more</h3>
            <p>Reserve before you arrive and skip the searching.</p>
          </article>
          <article>
            <span>✓</span>
            <h3>Peace of mind included</h3>
            <p>Transparent pricing and secure, trusted spaces.</p>
          </article>
        </div>
      </section>
      <HomeParkingGallery />
      <section className="quote-section">
        <div className="section-heading light-heading">
          <p className="section-kicker">Loved by drivers</p>
          <h2>What our customers say</h2>
          <span></span>
        </div>
        <div className="quote-grid">
          <article>
            <b>“</b>
            <p>
              Simple, reliable, and perfect for my daily commute. I never have
              to worry about finding a space anymore.
            </p>
            <strong>Sourish Dutta</strong>
            <small>Madhyamgram</small>
            <img
              className="customer-avatar"
              src="/Images/customers/Gemini_Generated_Image_9o39le9o39le9o39.png"
              alt="Sourish Dutta"
            />
          </article>
          <article>
            <b>“</b>
            <p>
              Booking takes seconds and the locations are exactly where I need
              them. ParkNova saves me so much time.
            </p>
            <strong>Jayanta Aich</strong>
            <small>Champadali</small>
            <img
              className="customer-avatar"
              src="/Images/customers/HOD%20sir.jpg"
              alt="Jayanta Aich"
            />
          </article>
          <article>
            <b>“</b>
            <p>
              What a great parking service. The flexible options make every trip
              around the city easier.
            </p>
            <strong>Rahul Kumar Ghosh</strong>
            <small>Durganagar</small>
            <img
              className="customer-avatar"
              src="/Images/customers/Rahul%20sir.jpg"
              alt="Rahul Kumar Ghosh"
            />
          </article>
        </div>
      </section>
      <section className="pricing-section" id="parking">
        <div className="section-heading">
          <p className="section-kicker">Simple, transparent pricing</p>
          <h2>Parking options and rates</h2>
          <span></span>
        </div>
        <div className="pricing-grid">
          <article>
            <strong>
              <sup>₹</sup>30<small>/day</small>
            </strong>
            <h3>Premium</h3>
            <p>All the services you need for effortless parking.</p>
            <button onClick={() => setStarted(true)}>Learn more</button>
          </article>
          <article>
            <strong>
              <sup>₹</sup>18<small>/day</small>
            </strong>
            <h3>Standard</h3>
            <p>Unlimited time and a regular parking spot.</p>
            <button onClick={() => setStarted(true)}>Learn more</button>
          </article>
          <article className="popular-plan">
            <span>Most popular</span>
            <strong>
              <sup>₹</sup>13<small>/day</small>
            </strong>
            <h3>Basic</h3>
            <p>A flexible plan for short stays and easy trips.</p>
            <button onClick={() => setStarted(true)}>Learn more</button>
          </article>
          <article>
            <strong>
              <sup>₹</sup>6<small>/day</small>
            </strong>
            <h3>Economy</h3>
            <p>A simple spot for parking when you arrive.</p>
            <button onClick={() => setStarted(true)}>Learn more</button>
          </article>
        </div>
      </section>
      <footer className="home-footer" id="contact">
        <div className="footer-brand-block">
          <a className="home-brand footer-brand pn-brand-link" href="#top">
            <BrandLogo />
          </a>
          <p>
            Official providers of smart city parking.
            <br />
            You can't park closer.
          </p>
        </div>

        <div className="footer-column">
          <h3>Navigation</h3>
          <a href="#parking">Price guide</a>
          <a href="#features">Features</a>
          <a href="#about">About us</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="footer-column">
          <h3>Contact info</h3>
          <p className="footer-meta">
            <span className="footer-icon">⌖</span>
            <span>
              Barasat
              <br />
              Kolkata, India
            </span>
          </p>
          <p className="footer-meta">
            <span className="footer-icon">◌</span>
            <span>+91 7063242721, 8617793959, 7872300904</span>
          </p>
        </div>

        <div className="footer-column">
          <h3>Discover</h3>
          <a href="#home">How it works</a>
          <a href="#parking">Reservations</a>
          <a href="#contact">Help centre</a>
        </div>
      </footer>
      <div className="copyright">© 2026 ParkNova. All rights reserved.</div>
      <HomeChatbot onNavigate={(destination) => {
        if (destination === "account") {
          navigateTo(authRole === "user" ? "userHome" : "user");
        } else {
          document.getElementById(destination)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }} />
    </main>
  );

  if (authView === "userHome") {
    // UserDashboard now manages Home / Find a spot / User profile / Update
    // profile itself, inside the sidebar shell — it no longer needs routes
    // to separate pages for those options.
    return (
      <UserDashboard
        parkingSlots={parkingSlots}
        parkingError={parkingError}
        parkingLoading={parkingLoading}
        onRetryParking={reloadParking}
        user={authUser}
        onUpdateUser={setAuthUser}
        onLogin={() => navigateTo("user")}
        onLogout={() => {
          setAuthRole(null);
          setAuthUser(null);
          localStorage.removeItem("parknova-auth-token");
          localStorage.removeItem("parknova-google-user");
          navigateTo(null);
        }}
        bookings={bookings}
        bookingsError={bookingsError}
        bookingsLoading={bookingsLoading}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        notificationsError={notificationsError}
        onReloadNotifications={() => reloadNotifications()}
        payments={payments}
        paymentError={paymentError}
        onAddPayment={addPayment}
        onAddBooking={addBooking}
        onCancelBooking={cancelBooking}
        onMarkParked={markBookingParked}
      />
    );
  }
  if (authView === "parking") {
    if (authRole !== "user") {
      return (
        <UserLogin
          onLoginSuccess={(user) => {
            setAuthUser(user);
            setAuthRole("user");
            navigateTo("parking");
          }}
          onGoToRegister={() => {
            navigateTo(null);
            setStarted(true);
          }}
        />
      );
    }
    return (
      <ParkingDirectory
        parkingSlots={parkingSlots}
        parkingError={parkingError}
        parkingLoading={parkingLoading}
        onRetryParking={reloadParking}
        onBack={() => navigateTo("userHome")}
        onLogin={() => navigateTo("user")}
        onLogout={() => {
          setAuthRole(null);
          setAuthUser(null);
          localStorage.removeItem("parknova-auth-token");
          localStorage.removeItem("parknova-google-user");
          navigateTo(null);
        }}
        bookings={bookings}
        onAddBooking={addBooking}
        onCancelBooking={cancelBooking}
      />
    );
  }
  if (authView === "user") {
    return (
      <UserLogin
        onLoginSuccess={(user) => {
          setAuthUser(user);
          setAuthRole("user");
          navigateTo("userHome");
          setStarted(false);
        }}
        onGoToRegister={() => {
          navigateTo(null);
          setStarted(true);
        }}
      />
    );
  }

  if (!started) {
    return welcomePage;
  }

  return (
    <main className="lamp-signup" data-lamp-on={lampOn}>
      <a className="lamp-signup-brand pn-brand-link" href="#home" aria-label="ParkNova home"><BrandLogo />
      </a>
      <div className="lamp-signup-layout">
        <section className="lamp-stage" aria-label="Signup lamp">
          <div className="lamp-illustration">
            <svg viewBox="0 0 200 300" role="img" aria-label="A pull-cord lamp">
              <ellipse className="lamp-inner-glow" cx="100" cy="110" rx="60" ry="30" />
              <rect className="lamp-base" x="92" y="100" width="16" height="160" rx="8" />
              <rect className="lamp-base" x="60" y="250" width="80" height="12" rx="6" />
              <path className="lamp-shade" d="M30 110 C30 50 170 50 170 110 C170 125 30 125 30 110Z" />
            </svg>
            <button
              className="lamp-pull"
              type="button"
              aria-label={lampOn ? "Turn lamp off" : "Pull cord to reveal signup"}
              aria-pressed={lampOn}
              onClick={() => setLampOn((isOn) => !isOn)}
            >
              <span className="lamp-cord-line" />
              <span className="lamp-cord-bead" />
            </button>
          </div>
          <p className="lamp-stage-copy" aria-live="polite">
            {lampOn ? "Your place is waiting" : "Pull the cord to get started"}
          </p>
        </section>

        <section
          className={`lamp-signup-card${lampOn ? " is-active" : ""}`}
          aria-hidden={!lampOn}
          inert={!lampOn}
        >
          {!submitted ? (
            <>
              <div className="lamp-form-progress">
                <span>CREATE ACCOUNT</span>
                <span>Your profile</span>
              </div>
              <div className="lamp-form-heading">
                <p className="lamp-eyebrow">ParkNova membership</p>
                <h1>Your details</h1>
                <p>Save your favorite spots and book in seconds.</p>
              </div>
              <form className="lamp-signup-form" onSubmit={handleSubmit}>
                <div className="lamp-name-fields">
                  <label>
                    First name
                    <input required name="firstName" type="text" placeholder="Olivia" autoComplete="given-name" />
                  </label>
                  <label>
                    Last name
                    <input required name="lastName" type="text" placeholder="Martin" autoComplete="family-name" />
                  </label>
                </div>
                <label>
                  Email address
                  <input required name="email" type="email" placeholder="olivia@example.com" autoComplete="email" />
                </label>
                <label>
                  Password
                  <input required name="password" minLength="8" type="password" placeholder="At least 8 characters" autoComplete="new-password" />
                </label>
                <label className="lamp-terms">
                  <input required type="checkbox" />
                  <span>
                    I agree to the <a href="#terms">Terms of Service</a> and{" "}
                    <a href="#privacy">Privacy Policy</a>.
                  </span>
                </label>
                {signupError && <p className="pn-form-error" role="alert">{signupError}</p>}
                <button className="lamp-create-button" type="submit" disabled={isRegistering}>
                  {isRegistering ? "Creating account…" : "Create account"} <span aria-hidden="true">→</span>
                </button>
              </form>
              <p className="lamp-login-prompt">
                Already have an account?{" "}
                <a
                  href="#login"
                  onClick={(event) => {
                    event.preventDefault();
                    navigateTo("user");
                  }}
                >
                  Log in
                </a>
              </p>
            </>
          ) : (
            <div className="lamp-success-state">
              <div className="lamp-success-icon" aria-hidden="true">✓</div>
              <p className="lamp-eyebrow">You’re all set</p>
              <h1>Welcome to ParkNova.</h1>
              <p>Your account is ready. Let’s find you a better place to park.</p>
              <button
                className="lamp-create-button"
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setStarted(false);
                  navigateTo("user");
                }}
              >
                Log in to your account <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;
