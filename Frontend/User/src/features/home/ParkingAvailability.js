import React from "react";
import "../../styles/parking-availability.css";

const CAR_COLORS = ["#c7d3df", "#425a74", "#b6bec4", "#9d4d43", "#e2e3dd", "#293d50"];

function ParkedCar({ index }) {
  return (
    <svg className="pn-lot-car" viewBox="0 0 48 90" aria-hidden="true" style={{ "--car-paint": CAR_COLORS[index % CAR_COLORS.length] }}>
      <ellipse cx="25" cy="47" rx="20" ry="39" fill="#000" opacity=".35" />
      <g fill="#10151b"><rect x="5" y="19" width="5" height="16" rx="2" /><rect x="38" y="19" width="5" height="16" rx="2" /><rect x="5" y="61" width="5" height="16" rx="2" /><rect x="38" y="61" width="5" height="16" rx="2" /></g>
      <path d="M10 17Q11 5 24 5T38 17L40 71Q40 84 33 85H15Q8 84 8 71Z" fill="var(--car-paint)" stroke="#ffffff38" />
      <path d="M14 25Q24 20 34 25L32 37H16Z" fill="#152630" stroke="#9ebdcc88" />
      <path d="M16 59H32L34 70Q24 75 14 70Z" fill="#152630" stroke="#9ebdcc66" />
      <rect x="16" y="39" width="16" height="19" rx="4" fill="#ffffff0c" stroke="#ffffff19" />
      <path d="M12 31L12 64M36 31V64" stroke="#ffffff50" />
      <path d="M12 14H18M30 14H36" stroke="#fff4cb" strokeWidth="3" />
      <path d="M12 78H17M31 78H36" stroke="#d85950" strokeWidth="3" />
      <path d="M17 9Q24 7 31 9M18 81H30" stroke="#ffffff55" />
      <rect x="3" y="32" width="6" height="4" rx="2" fill="var(--car-paint)" /><rect x="39" y="32" width="6" height="4" rx="2" fill="var(--car-paint)" />
    </svg>
  );
}

export default function ParkingAvailability({ layout, selectedSeat, onSelectSeat }) {
  const open = layout.filter(Boolean).length;
  const occupied = layout.length - open;
  const midpoint = Math.ceil(layout.length / 2);
  function renderBay(isAvailable, index) {
    const label = `S-${String(index + 1).padStart(2, "0")}`;
    const selected = selectedSeat === label;
    return (
      <button key={label} type="button" className={`pn-lot-bay ${isAvailable ? "is-open" : "is-occupied"}${selected ? " is-selected" : ""}`}
        disabled={!isAvailable} aria-label={`Bay ${label}, ${isAvailable ? "available" : "already taken"}`} aria-pressed={selected}
        onClick={() => onSelectSeat(selected ? null : label)}>
        <span className="pn-lot-bay-number">{label}</span>
        {isAvailable ? <span className="pn-lot-open-symbol" aria-hidden="true">{selected ? "✓" : "P"}</span> : <ParkedCar index={index} />}
        <span className="pn-lot-sensor" aria-hidden="true" />
      </button>
    );
  }
  return (
    <div className="pn-real-lot">
      <div className="pn-lot-toolbar"><span><i /> LOT A <b>Ground level</b></span><small>Preview layout · Sample availability</small></div>
      <div className="pn-lot-stats">
        <div><i className="is-open" /><strong>{open}</strong><span>Available</span></div>
        <div><i className="is-occupied" /><strong>{occupied}</strong><span>Occupied</span></div>
        <div className="pn-lot-occupancy"><strong>{Math.round(occupied / layout.length * 100)}%</strong><span>Occupancy</span></div>
      </div>
      <div className="pn-lot-scroll" role="region" aria-label="Parking bay map, scroll horizontally on small screens" tabIndex={0}>
        <div className="pn-lot-ground">
          <div className="pn-lot-boundary"><span>MAIN GATE / NORTH</span><span>↑ N</span></div>
          <div className="pn-lot-bays pn-lot-bays-top" role="group" aria-label="North parking row">{layout.slice(0, midpoint).map(renderBay)}</div>
          <div className="pn-lot-road" aria-hidden="true"><span className="pn-lot-entry">ENTRY →</span><span className="pn-lot-road-arrow">→</span><span className="pn-lot-road-label">ONE WAY · 5 KM/H</span><span className="pn-lot-road-arrow">→</span><span className="pn-lot-exit">EXIT →</span></div>
          <div className="pn-lot-bays pn-lot-bays-bottom" role="group" aria-label="South parking row">{layout.slice(midpoint).map((available, index) => renderBay(available, midpoint + index))}</div>
          <div className="pn-lot-walkway"><span>PEDESTRIAN WALKWAY</span></div>
        </div>
      </div>
      <div className="pn-lot-footer"><span><i className="is-open" /> Available</span><span><i className="is-occupied" /> Occupied</span><span><i className="is-selected" /> Selected</span><small>Tap a green bay to select</small></div>
    </div>
  );
}
