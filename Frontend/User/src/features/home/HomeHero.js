import React from "react";
import BrandLogo from "../shared/BrandLogo";

function HomeHero({
  authRole,
  darkMode,
  themeAnimating,
  onToggleTheme,
  onThemeAnimationEnd,
  onLoginClick,
}) {
  const [activeSection, setActiveSection] = React.useState("top");
  const navRef = React.useRef(null);
  React.useEffect(() => {
    let frame;
    function updateActiveSection() {
      const threshold = (navRef.current?.getBoundingClientRect().bottom || 80) + 100;
      let current = "top";
      for (const id of ["features", "about", "parking", "contact"]) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= threshold) current = id;
      }
      setActiveSection(current);
    }
    function scheduleUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveSection);
    }
    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  function openSection(event, id) {
    event.preventDefault();
    setActiveSection(id);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
  }

  return (
    <>
      <nav className="home-nav" aria-label="Main navigation" ref={navRef}>
        <a className="home-brand pn-brand-link" href="#top">
          <BrandLogo />
        </a>
        <div className="home-links">
          {[["top", "Home"], ["features", "Features"], ["about", "About us"], ["parking", "Parking options"], ["contact", "Contact"]].map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(event) => openSection(event, id)} aria-current={activeSection === id ? "location" : undefined}>
              {label}
            </a>
          ))}
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
      <section className="home-hero" aria-labelledby="home-hero-title" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/Images/parking/covered-parking.jpg)` }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-kicker">Smart city parking</p>
          <h1 id="home-hero-title">
            Park smarter.
            <br />
            <em>Arrive faster.</em>
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
