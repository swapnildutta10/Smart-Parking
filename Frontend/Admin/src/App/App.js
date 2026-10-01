import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/front_page.css";
import "../styles/login-pages.css";
import "../styles/modern-theme.css";
import "../styles/design.css";
import UserLogin from "../features/auth/UserLogin";
import UserHome from "../features/home/UserHome";

function App() {
  const [started, setStarted] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  // "user" | "userHome" | null (null = not viewing the login flow)
  const [authView, setAuthView] = React.useState(null);
  const [authRole, setAuthRole] = React.useState(null);
  const [darkMode, setDarkMode] = React.useState(
    () => localStorage.getItem("parkly-theme") === "dark",
  );
  const [themeAnimating, setThemeAnimating] = React.useState(false);

  function navigateTo(view) {
    setAuthView(view);
    window.history.pushState({ authView: view }, "", view ? `#${view}` : "#top");
  }

  React.useEffect(() => {
    const handleBrowserNavigation = (event) => {
      setAuthView(event.state?.authView ?? null);
    };

    if (!window.history.state?.authView) {
      window.history.replaceState({ authView: null }, "", window.location.href);
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
      <nav className="home-nav container-fluid">
        <a className="home-brand" href="#top">
          ParkNova
        </a>
        <div className="home-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About us</a>
          <a href="#parking">Parking options</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="nav-account">
          <button
            className="nav-login nav-action"
            type="button"
            onClick={() => {
              navigateTo(authRole === "user" ? "userHome" : "user");
            }}
          >
            {authRole ? "User profile" : "Log in"}
          </button>
          <button
            className={`theme-toggle home-theme-toggle${themeAnimating ? " theme-toggle--animating" : ""}`}
            type="button"
            onClick={handleThemeToggle}
            onAnimationEnd={() => setThemeAnimating(false)}
            aria-label={
              darkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
          </button>
        </div>
      </nav>
      <section className="home-hero" id="home">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <p className="hero-kicker">Smart city parking</p>
          <h1>
            We have the best deals
            <br />
            for parking lots.
          </h1>
          <p className="hero-copy">
            Instantly book your space today. Trusted by thousands of drivers who
            value their time.
          </p>
          <div className="booking-bar">
            <label>
              <span>⌖</span>
              <select defaultValue="">
                <option value="" disabled>
                  Select a nearby parking spot
                </option>
                <option>Brainware University Main Gate</option>
                <option>Brainware University Student Parking</option>
                <option>Barasat Station Parking</option>
                <option>Champadali More Parking</option>
                <option>Kazipara Road Parking</option>
              </select>
            </label>
            <label>
              <span>⌑</span>
              <input type="text" placeholder="Your name" />
            </label>
            <label>
              <span>◌</span>
              <input type="tel" placeholder="Your phone number" />
            </label>
            <button type="button" onClick={() => setStarted(true)}>
              Request a call <span>→</span>
            </button>
          </div>
        </div>

        <aside className="hero-trust-card" aria-label="Trusted by drivers">
          <div className="hero-trust-row">
            <div className="hero-trust-avatars" aria-hidden="true">
              <span style={{ background: "#ee7548" }}>RM</span>
              <span style={{ background: "#ff6b4a" }}>AK</span>
              <span style={{ background: "#3984b5" }}>SP</span>
            </div>
            <div>
              <strong>4.9 / 5</strong>
              <small>from 3,200+ reviews</small>
            </div>
          </div>
          <div className="hero-trust-divider" />
          <div className="hero-trust-stats">
            <div>
              <strong>12,480</strong>
              <span>Drivers onboard</span>
            </div>
            <div>
              <strong>18</strong>
              <span>Live locations</span>
            </div>
            <div>
              <strong>864</strong>
              <span>Parking slots</span>
            </div>
            <div>
              <strong>92%</strong>
              <span>Avg. availability</span>
            </div>
          </div>
        </aside>
      </section>
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
        <div>
          <a className="home-brand footer-brand" href="#top">
            ParkNova
          </a>
          <p>
            Official providers of smart city parking.
            <br />
            You can't park closer.
          </p>
        </div>
        <div>
          <h3>Navigation</h3>
          <a href="#parking">Price guide</a>
          <a href="#features">Features</a>
          <a href="#about">About us</a>
          <a href="#contact">Contact</a>
        </div>
        <div>
          <h3>Contact info</h3>
          <p>
            ⌖ Barasat
            <br />
            Kolkata, India
          </p>
          <p>◌ +91 7063242721,
            8617793959,7872300904 </p>
        </div>
        <div>
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
    return (
      <UserHome
        onRegister={() => {
          navigateTo(null);
          setStarted(true);
        }}
        onLogin={() => navigateTo("user")}
        onLogout={() => {
          setAuthRole(null);
          navigateTo(null);
        }}
      />
    );
  }
  if (authView === "user") {
    return (
      <UserLogin
        onLoginSuccess={() => {
          setAuthRole("user");
          navigateTo(null);
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
    <main className="register-page container-fluid px-0">
      <aside className="story-panel col-lg-5">
        <div className="brand">
          ParkNova
        </div>
        <button
          className={`theme-toggle${themeAnimating ? " theme-toggle--animating" : ""}`}
          type="button"
          onClick={handleThemeToggle}
          onAnimationEnd={() => setThemeAnimating(false)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
        </button>
        <div className="story-content">
          <p className="eyebrow">Parking, made precise</p>
          <h1>Your space in the city starts here.</h1>
          <p className="story-copy">
            Join a smarter way to park. Find, reserve, and arrive at the perfect
            spot without the circling.
          </p>
          <div className="story-benefits row g-2" aria-label="Parkly benefits">
            <div className="col-6">
              <span className="benefit-icon">✓</span>Instant booking
            </div>
            <div className="col-6">
              <span className="benefit-icon">⌖</span>Verified spaces
            </div>
          </div>
          <div
            className="parking-map"
            aria-label="Illustration of a smart parking map"
          >
            <div className="map-road map-road-one" />
            <div className="map-road map-road-two" />
            <div className="map-road map-road-three" />
            <div className="parking-bay bay-one">
              <span>01</span>
            </div>
            <div className="parking-bay bay-two">
              <span>02</span>
            </div>
            <div className="parking-bay bay-three">
              <span>03</span>
            </div>
            <div className="map-pin">
              <span>✓</span>
            </div>
            <div className="map-label">Your spot is waiting</div>
          </div>
        </div>
        <div className="story-footer">
          <span className="status-dot" /> 12,480 drivers park smarter with us
        </div>
      </aside>

      <section className="form-panel col-lg-7">
        <div className="form-wrap">
          <div className="mobile-brand brand">
            ParkNova
          </div>
          {!started ? (
            <div className="welcome-state">
              <div className="welcome-badge">
                <span>✦</span>
              </div>
              <p className="eyebrow">A smarter way to move</p>
              <h2>Welcome to ParkNova</h2>
              <p className="welcome-copy">
                Your city parking companion. Find a spot, reserve it ahead, and
                arrive without the extra drive around the block.
              </p>
              <div className="welcome-points">
                <div>
                  <span>01</span>
                  <p>
                    <strong>Find your fit</strong>Live availability wherever you
                    go.
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <p>
                    <strong>Reserve with ease</strong>Your space is held when
                    you need it.
                  </p>
                </div>
              </div>
              <button
                className="primary-button btn"
                type="button"
                onClick={() => setStarted(true)}
              >
                Get started <span aria-hidden="true">→</span>
              </button>
              <p className="welcome-note">Free to join · No commitment</p>
            </div>
          ) : !submitted ? (
            <>
              <div className="form-progress d-flex justify-content-between align-items-center">
                <span>
                  STEP 01 <b>OF 04</b>
                </span>
                <span className="progress-copy">Your profile</span>
              </div>
              <div className="form-heading">
                <p className="eyebrow">Create your account</p>
                <h2>Your details</h2>
                <p>Save your favorite spots and book in seconds.</p>
              </div>
              <form className="needs-validation" onSubmit={handleSubmit}>
                <div className="field-row row g-3">
                  <label className="col-md-6">
                    First name
                    <input
                      className="form-control"
                      required
                      type="text"
                      placeholder="Olivia"
                    />
                  </label>
                  <label className="col-md-6">
                    Last name
                    <input
                      className="form-control"
                      required
                      type="text"
                      placeholder="Martin"
                    />
                  </label>
                </div>
                <label>
                  Email address
                  <input
                    className="form-control"
                    required
                    type="email"
                    placeholder="olivia@example.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    className="form-control"
                    required
                    minLength="8"
                    type="password"
                    placeholder="At least 8 characters"
                  />
                </label>
                <label className="checkbox-row">
                  <input required type="checkbox" />{" "}
                  <span>
                    I agree to the <a href="#terms">Terms of Service</a> and{" "}
                    <a href="#privacy">Privacy Policy</a>.
                  </span>
                </label>
                <button className="primary-button btn" type="submit">
                  Create account <span aria-hidden="true">→</span>
                </button>
              </form>
              <p className="login-prompt">
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
            <div className="success-state">
              <div className="success-icon">✓</div>
              <p className="eyebrow">You’re all set</p>
              <h2>Welcome to ParkNova.</h2>
              <p>
                Your account is ready. Let’s find you a better place to park.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={() => setSubmitted(false)}
              >
                Back to registration <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>
        <span className="page-number">01 / 04</span>
      </section>
    </main>
  );
}

export default App;
