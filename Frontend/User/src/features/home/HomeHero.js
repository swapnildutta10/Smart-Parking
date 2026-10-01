import React from "react";

function HomeHero({
  authRole,
  darkMode,
  themeAnimating,
  onToggleTheme,
  onThemeAnimationEnd,
  onLoginClick,
}) {
  function openParkingOptions(event) {
    event.preventDefault();
    document.getElementById("parking")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <>
      <nav className="home-nav" aria-label="Main navigation">
        <a className="home-brand" href="#top">
          ParkNova
        </a>
        <div className="home-links">
          <a href="#top">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About us</a>
          <a href="#parking" onClick={openParkingOptions}>
            Parking options
          </a>
          <a href="#contact">Contact</a>
        </div>
        <div className="nav-account">
          <button className="nav-login" type="button" onClick={onLoginClick}>
            {authRole === "user" ? "Dashboard" : "Log in"}
          </button>
          <button
            className={`theme-toggle home-theme-toggle${themeAnimating ? " theme-toggle--animating" : ""}`}
            type="button"
            onClick={onToggleTheme}
            onAnimationEnd={onThemeAnimationEnd}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
          </button>
        </div>
      </nav>
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-kicker">Smart city parking</p>
          <h1 id="home-hero-title">
            We have the best deals
            <br />
            for parking lots.
          </h1>
          <p className="hero-copy">
            Instantly book your space today. Trusted by thousands of drivers who
            value their time.
          </p>
          <form className="booking-bar" onSubmit={(event) => event.preventDefault()}>
            <label>
              <span aria-hidden="true">⌖</span>
              <select defaultValue="">
                <option value="" disabled>Select a nearby parking spot</option>
                <option>Brainware University Main Gate</option>
                <option>Barasat Station Parking</option>
                <option>Champadali More Parking</option>
              </select>
            </label>
            <label>
              <span aria-hidden="true">⌑</span>
              <input type="text" placeholder="Your name" />
            </label>
            <label>
              <span aria-hidden="true">☎</span>
              <input type="tel" placeholder="Your phone number" />
            </label>
            <button type="submit">
              Request a call <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

export default HomeHero;
