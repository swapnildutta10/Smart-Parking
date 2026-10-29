import React from "react";

function VehicleShape({ vehicle, free, color, x, y }) {
  if (vehicle === "Two wheeler") return <g transform={`translate(${x + 6},${y})`} fill="none" stroke={color} strokeWidth={2.5} opacity={free ? .65 : 1}>
    <ellipse cx={10} cy={7} rx={4} ry={7} /><ellipse cx={10} cy={43} rx={4} ry={7} />
    <path d="M10 14v22M0 17h20M4 28h12" /><rect x={5} y={20} width={10} height={15} rx={4} fill={free ? "none" : color} />
  </g>;
  return <g transform={`translate(${x},${y})`}>
    <path d="M7 2Q16 -2 25 2L30 10V45Q30 52 24 53H8Q2 52 2 45V10Z" fill={free ? "var(--lot-open-ghost, #40dba112)" : color} stroke={color} strokeWidth={1.6} strokeDasharray={free ? "3 3" : undefined} opacity={free ? .8 : 1} />
    <path d="M7 12Q16 8 25 12L23 22H9ZM9 35H23L25 44Q16 48 7 44Z" fill={free ? "none" : "var(--lot-window, #20323e)"} stroke={free ? color : "#617486"} strokeOpacity={.6} />
    <path d="M5 25v9M27 25v9" stroke={free ? color : "var(--lot-window, #20323e)"} opacity={.65} />
    {!free && <g fill="#09111a"><rect x={0} y={11} width={4} height={10} rx={1} /><rect x={28} y={11} width={4} height={10} rx={1} /><rect x={0} y={35} width={4} height={10} rx={1} /><rect x={28} y={35} width={4} height={10} rx={1} /></g>}
  </g>;
}

export default function ParkingCapacityVisual({ total, available, vehicle }) {
  const sceneId = React.useId().replace(/:/g, "");
  const capacity = Math.max(0, Math.floor(total));
  const open = Math.min(capacity, Math.max(0, Math.floor(available)));
  const groupSize = Math.max(1, Math.ceil(capacity / 24));
  const blocks = Array.from({ length: Math.ceil(capacity / groupSize) }, (_, i) => {
    const count = Math.min(groupSize, capacity - i * groupSize);
    return { count, free: Math.min(count, Math.max(0, open - i * groupSize)) };
  });
  const columns = Math.max(2, Math.min(6, blocks.length));
  const width = columns * 88 + 48, rows = Math.max(1, Math.ceil(blocks.length / columns));
  const height = rows * 156 + 48;
  return <figure className="pn-capacity-visual">
    <div className="pn-capacity-visual-heading"><div><small className="pn-visual-kicker">PARKING OVERVIEW</small><strong>{vehicle} capacity</strong></div><div className="pn-visual-meter" style={{ "--open-angle": `${capacity ? open / capacity * 360 : 0}deg` }}><span>{capacity ? Math.round(open / capacity * 100) : 0}%</span></div></div>
    <div className={`pn-parking-scene ${open ? "has-space" : "is-full"}`}>
      <div className="pn-parking-scene-top"><span><i />{capacity ? open ? "Spaces ready for arrival" : "All spaces reserved" : "No capacity listed"}</span><small>CAPACITY VIEW</small></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${vehicle}: ${open} available and ${capacity - open} reserved spaces`}>
        <defs>
          <linearGradient id={`${sceneId}-ground`} x2="1" y2="1"><stop stopColor="var(--lot-ground-start, #1b3039)" /><stop offset="1" stopColor="var(--lot-ground-end, #0c1722)" /></linearGradient>
          <linearGradient id={`${sceneId}-road`} x2="0" y2="1"><stop stopColor="var(--lot-road-start, #283f4b)" /><stop offset="1" stopColor="var(--lot-road-end, #192a37)" /></linearGradient>
          <linearGradient id={`${sceneId}-open`} x2="1" y2="1"><stop stopColor="var(--lot-open-start, #244b40)" /><stop offset="1" stopColor="var(--lot-open-end, #152f2e)" /></linearGradient>
          <linearGradient id={`${sceneId}-reserved`} x2="1" y2="1"><stop stopColor="var(--lot-reserved-start, #423a3e)" /><stop offset="1" stopColor="var(--lot-reserved-end, #2a2935)" /></linearGradient>
          <pattern id={`${sceneId}-walkway`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2 8 8-2M6 10 10 6" stroke="#c6d7c9" strokeWidth="2" opacity=".25" /></pattern>
          <filter id={`${sceneId}-shadow`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#030d16" floodOpacity=".65" /></filter>
        </defs>
        <rect width={width} height={height} rx={16} fill={`url(#${sceneId}-ground)`} />
        <rect x={5} y={6} width={width - 10} height={height - 12} rx={12} fill="none" stroke="#7fafa41c" />
        {[0, 1].map(side => <g key={side} aria-hidden="true">
          <rect x={side ? width - 13 : 3} y={16} width={10} height={Math.max(10, height - 42)} rx={5} fill="#204a3d" />
          {Array.from({ length: rows * 3 }, (_, i) => <g key={i} transform={`translate(${side ? width - 8 : 8},${32 + i * 43})`}><circle cy={2} r={6} fill="#071e1d" opacity=".5" /><circle r={5} fill="#3e7960" /><circle cx={-1} cy={-1} r={3} fill="#5e9672" opacity=".7" /></g>)}
        </g>)}
        {Array.from({ length: rows }, (_, row) => <g key={`road-${row}`}>
          <rect x={15} y={row * 156 + 119} width={width - 30} height={5} rx={2} fill={`url(#${sceneId}-walkway)`} />
          <rect x={15} y={row * 156 + 126} width={width - 30} height={39} rx={6} fill={`url(#${sceneId}-road)`} />
          <path d={`M22 ${row * 156 + 129} H${width - 22} M22 ${row * 156 + 162} H${width - 22}`} stroke="#c9d6c8" strokeWidth={1} opacity={.25} />
          <path className="pn-scene-lane-line" d={`M26 ${row * 156 + 145} H${width - 26}`} stroke="var(--lot-lane, #a9bdc4)" strokeDasharray="10 10" opacity={.45} />
          {[0, 1, 2, 3].map(i => <rect key={i} x={width - 41 + i * 4} y={row * 156 + 133} width={2} height={24} fill="#cbd5cf" opacity={.45} />)}
          <rect x={width / 2 - 30} y={row * 156 + 135} width={60} height={20} rx={10} fill="var(--lot-sign, #263e49)" />
          <path d={`M${width / 2 - 12} ${row * 156 + 145} h25 m-6 -5 6 5 -6 5`} fill="none" stroke="var(--lot-arrow, #9cd5c0)" strokeWidth={1.5} />
        </g>)}
        {blocks.map((block, i) => {
          const row = Math.floor(i / columns), countInRow = Math.min(columns, blocks.length - row * columns);
          const x = (width - countInRow * 88) / 2 + i % columns * 88 + 6, y = row * 156 + 18;
          const free = block.free === block.count, reserved = block.free === 0;
          const color = free ? "var(--lot-open, #61dfb1)" : reserved ? "var(--lot-reserved, #d9a495)" : "var(--lot-mixed, #e8ce8b)";
          return <g key={i} className={`pn-visual-tile ${free ? "is-available" : reserved ? "is-booked" : "is-partial"}`} data-capacity={block.count} data-available={block.free}>
            <title>{block.free} available, {block.count - block.free} reserved</title>
            <rect x={x} y={y} width={76} height={100} rx={9} fill={free ? `url(#${sceneId}-open)` : reserved ? `url(#${sceneId}-reserved)` : "var(--lot-mixed-surface, #554526)"} stroke={color} strokeOpacity={.35} filter={`url(#${sceneId}-shadow)`} />
            <path d={`M${x + 12} ${y + 3} h52`} stroke={color} strokeOpacity={.6} strokeLinecap="round" strokeWidth={2} />
            <path d={`M${x + 8} ${y + 8} v65 h60 v-65`} stroke={color} fill="none" strokeWidth={1.5} strokeOpacity={.5} />
            {groupSize > 1 ? <><text x={x + 38} y={y + 39} textAnchor="middle" fill={color} fontSize={22} fontWeight={650}>{block.free}/{block.count}</text><text x={x + 38} y={y + 57} textAnchor="middle" fill="var(--lot-muted, #9bafba)" fontSize={8}>spaces available</text></> : <VehicleShape vehicle={vehicle} free={free} color={color} x={x + 22} y={y + 12} />}
            <rect x={x + 9} y={y + 80} width={58} height={13} rx={6} fill={free ? "#61dfb11a" : "#d9a49514"} />
            <text x={x + 38} y={y + 89} textAnchor="middle" fill={color} fontSize={7} letterSpacing={1} fontWeight={650}>{free ? "AVAILABLE" : reserved ? "RESERVED" : "PARTLY OPEN"}</text>
            <circle cx={x + 61} cy={y + 13} r={5} fill={free ? "var(--lot-open, #53dba6)" : reserved ? "#b58c87" : "#d6b777"} opacity={.8} />
            {free && <path d={`M${x + 58.5} ${y + 13} l1.6 1.6 3-3.2`} fill="none" stroke="#173e31" strokeWidth={1.2} />}
          </g>;
        })}
        {!capacity && <text x={width / 2} y={70} textAnchor="middle" fill="var(--lot-muted, #9bafba)" fontSize={12}>No capacity listed</text>}
        <text x={24} y={height - 8} fill="var(--lot-muted, #6c8797)" fontSize={7} letterSpacing={1.5}>ENTRY →</text>
        <text x={width - 24} y={height - 8} textAnchor="end" fill="var(--lot-muted, #6c8797)" fontSize={7} letterSpacing={1.5}>EXIT →</text>
      </svg>
    </div>
    <div className="pn-scene-facts"><span><i className="is-open" /><strong>{open}</strong> open</span><span><i className="is-reserved" /><strong>{capacity - open}</strong> reserved</span><span><strong>{capacity}</strong> total</span></div>
    <figcaption><span><i className="is-open" />Available</span><span><i className="is-reserved" />Reserved</span>{groupSize > 1 && <span><i className="is-mixed" />Grouped capacity</span>}</figcaption>
    <small>{groupSize > 1 ? `Each tile represents up to ${groupSize} spaces. ` : ""}Capacity visualization; positions are not assigned bay numbers.</small>
  </figure>;
}
