import React from "react";
import "../../styles/home-parking-gallery.css";

const scenes = [
  {
    image: "campus-parking.png",
    title: "More room for your everyday plans.",
    description: "From campus visits to your daily commute, find a space that fits your day.",
    label: "OPEN-AIR PARKING",
    alt: "Illustrative tree-lined campus parking area with marked bays, cars and scooters",
    width: 1536,
    height: 1024,
  },
  {
    image: "covered-parking.jpg",
    title: "Park covered. Head out comfortably.",
    description: "Explore covered parking options for your next trip into the city.",
    label: "COVERED SPACES",
    alt: "Illustrative covered parking garage with marked lanes and parked cars",
    width: 1600,
    height: 1071,
  },
];

function HomeParkingGallery() {
  return (
    <section className="home-parking-gallery" aria-labelledby="home-parking-gallery-title">
      <div className="home-parking-gallery-heading">
        <div>
          <p className="section-kicker">A better place to arrive</p>
          <h2 id="home-parking-gallery-title">A space for every kind of day.</h2>
        </div>
        <p>Spend less time searching and more time where you want to be.</p>
      </div>
      <div className="home-parking-photo-grid">
        {scenes.map((scene) => (
          <article className="home-parking-photo-card" key={scene.image}>
            <div className="home-parking-photo-wrap">
              <img src={`${process.env.PUBLIC_URL}/Images/parking/${scene.image}`} alt={scene.alt}
                width={scene.width} height={scene.height} loading="lazy" decoding="async" />
              <span className="home-parking-photo-label">{scene.label}</span>
              <span className="home-parking-photo-caption">Illustrative image</span>
            </div>
            <div className="home-parking-photo-copy">
              <h3>{scene.title}</h3>
              <p>{scene.description}</p>
              <a href="#parking">Explore parking options <span aria-hidden="true">&#8599;</span></a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomeParkingGallery;
