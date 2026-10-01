import React from "react";
import UserLogin from "../features/auth/UserLogin";
import UserDashboard from "../features/home/UserDashboard";
import HomeHero from "../features/home/HomeHero";
import ParkingDirectory from "../features/parkingSpot/ParkingDirectory";
import { createNotification } from "../features/notification/notificationUtils";

const PAYMENT_STORAGE_KEY = "parknova-payment-history";

function App() {
  const [started, setStarted] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [lampOn, setLampOn] = React.useState(false);
  // "user" | "userHome" | null (null = not viewing the login flow)
  const [authView, setAuthView] = React.useState(null);
  const [authRole, setAuthRole] = React.useState(null);
  const [darkMode, setDarkMode] = React.useState(
    () => localStorage.getItem("parkly-theme") === "dark",
  );
  const [themeAnimating, setThemeAnimating] = React.useState(false);
  // Booking history lives here (not inside UserDashboard/ParkingDirectory)
  // so a reservation made from either screen shows up in "My bookings" on
  // both. Frontend-only for now: no backend, so this resets on reload.
  const [bookings, setBookings] = React.useState([
    {
      id: "PN-A24T01",
      spotId: "A-24",
      location: "Brainware University Main Gate",
      area: "University district",
      vehicle: "Car",
      rate: 13,
      vehiclePlate: "",
      date: new Date().toISOString().slice(0, 10),
      time: "16:30",
      duration: 3,
      status: "upcoming",
      parked: false,
      createdAt: Date.now() - 1000 * 60 * 60,
    },
  ]);
  // Payments live here too (same reason as bookings) so receipts and
  // paid/unpaid status survive switching between dashboard views.
  const [payments, setPayments] = React.useState(() => {
    try {
      const savedPayments = JSON.parse(localStorage.getItem(PAYMENT_STORAGE_KEY) || "[]");
      return Array.isArray(savedPayments) ? savedPayments : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = React.useState(() => [
    createNotification({
      id: "PN-A24T01",
      spotId: "A-24",
      location: "Brainware University Main Gate",
      date: new Date().toISOString().slice(0, 10),
      time: "16:30",
    }, "reserved", Date.now() - 1000 * 60 * 60),
  ]);

  const addNotification = React.useCallback(({ booking, kind }) => {
    const notification = createNotification(booking, kind);
    setNotifications((current) => current.some((item) => item.id === notification.id)
      ? current
      : [notification, ...current]);
  }, []);

  React.useEffect(() => {
    localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments));
  }, [payments]);

  function addBooking(draft) {
    const booking = {
      ...draft,
      id: `PN-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      status: "upcoming",
      parked: false,
      createdAt: Date.now(),
    };
    setBookings((current) => [...current, booking]);
    addNotification({ booking, kind: "reserved" });
    return booking;
  }

  function addPayment(payment) {
    const paymentRecord = {
      ...payment,
      customerName: payment.customerName || "Olivia Martin",
      customerEmail: payment.customerEmail || "olivia@example.com",
    };

    setPayments((current) => (
      current.some((item) => item.bookingId === paymentRecord.bookingId && item.status === "paid")
        ? current
        : [paymentRecord, ...current]
    ));
  }

  function cancelBooking(bookingId) {
    const booking = bookings.find((item) => item.id === bookingId);
    // Cancelling a paid booking refunds its payment.
    setPayments((current) => current.map((payment) => (
      payment.bookingId === bookingId && payment.status === "paid"
        ? { ...payment, status: "refunded", refundedAt: Date.now() }
        : payment
    )));
    setBookings((current) =>
      current.map((booking) => (
        booking.id === bookingId ? { ...booking, status: "cancelled" } : booking
      )),
    );
    if (booking) {
      addNotification({ booking, kind: "cancelled" });
    }
  }

  function markBookingParked(bookingId) {
    const booking = bookings.find((item) => item.id === bookingId);
    setBookings((current) =>
      current.map((booking) => (
        booking.id === bookingId ? { ...booking, parked: true } : booking
      )),
    );
    if (booking) {
      addNotification({ booking, kind: "parked" });
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
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("parkly-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
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
              <sup>$</sup>30<small>/day</small>
            </strong>
            <h3>Premium</h3>
            <p>All the services you need for effortless parking.</p>
            <button onClick={() => setStarted(true)}>Learn more</button>
          </article>
          <article>
            <strong>
              <sup>$</sup>18<small>/day</small>
            </strong>
            <h3>Standard</h3>
            <p>Unlimited time and a regular parking spot.</p>
            <button onClick={() => setStarted(true)}>Learn more</button>
          </article>
          <article className="popular-plan">
            <span>Most popular</span>
            <strong>
              <sup>$</sup>13<small>/day</small>
            </strong>
            <h3>Basic</h3>
            <p>A flexible plan for short stays and easy trips.</p>
            <button onClick={() => setStarted(true)}>Learn more</button>
          </article>
          <article>
            <strong>
              <sup>$</sup>6<small>/day</small>
            </strong>
            <h3>Economy</h3>
            <p>A simple spot for parking when you arrive.</p>
            <button onClick={() => setStarted(true)}>Learn more</button>
          </article>
        </div>
      </section>
      <footer className="home-footer" id="contact">
        <div className="footer-brand-block">
          <a className="home-brand footer-brand" href="#top">
            ParkNova
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
    </main>
  );

  if (authView === "userHome") {
    // UserDashboard now manages Home / Find a spot / User profile / Update
    // profile itself, inside the sidebar shell — it no longer needs routes
    // to separate pages for those options.
    return (
      <UserDashboard
        onLogin={() => navigateTo("user")}
        onLogout={() => {
          setAuthRole(null);
          navigateTo(null);
        }}
        bookings={bookings}
        notifications={notifications}
        payments={payments}
        onAddPayment={addPayment}
        onAddBooking={addBooking}
        onCancelBooking={cancelBooking}
        onMarkParked={markBookingParked}
        onAddNotification={addNotification}
      />
    );
  }
  if (authView === "parking") {
    if (authRole !== "user") {
      return (
        <UserLogin
          onLoginSuccess={() => {
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
        onBack={() => navigateTo("userHome")}
        onLogin={() => navigateTo("user")}
        onLogout={() => {
          setAuthRole(null);
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
        onLoginSuccess={() => {
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
      <a className="lamp-signup-brand" href="#home" aria-label="ParkNova home">
        ParkNova
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
                    <input required type="text" placeholder="Olivia" autoComplete="given-name" />
                  </label>
                  <label>
                    Last name
                    <input required type="text" placeholder="Martin" autoComplete="family-name" />
                  </label>
                </div>
                <label>
                  Email address
                  <input required type="email" placeholder="olivia@example.com" autoComplete="email" />
                </label>
                <label>
                  Password
                  <input required minLength="8" type="password" placeholder="At least 8 characters" autoComplete="new-password" />
                </label>
                <label className="lamp-terms">
                  <input required type="checkbox" />
                  <span>
                    I agree to the <a href="#terms">Terms of Service</a> and{" "}
                    <a href="#privacy">Privacy Policy</a>.
                  </span>
                </label>
                <button className="lamp-create-button" type="submit">
                  Create account <span aria-hidden="true">→</span>
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
                onClick={() => setSubmitted(false)}
              >
                Back to registration <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;