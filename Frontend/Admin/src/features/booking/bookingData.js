export const BOOKING_STATUS_LABELS = {
  upcoming: "Upcoming",
  checked_in: "Checked in",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const INITIAL_BOOKINGS = [
  {
    id: "PN-8F31A2", userName: "Riya Malhotra", email: "riya.malhotra@example.com", phone: "+91 98765 43210",
    spotId: "A-12", location: "Brainware University Main Gate", date: "2026-09-27", time: "10:30", duration: 2,
    vehicle: "Car", plate: "WB 20 AB 1234", status: "upcoming", tone: "#ee7548",
    timeline: [{ label: "Booking created", at: "2026-09-26T09:12:00" }],
  },
  {
    id: "PN-7D20B1", userName: "Arjun Kapoor", email: "arjun.kapoor@example.com", phone: "+91 98765 43211",
    spotId: "B-07", location: "Brainware University Student Parking", date: "2026-09-27", time: "11:15", duration: 1,
    vehicle: "Two wheeler", plate: "WB 24 C 7812", status: "checked_in", tone: "#ff6b4a",
    timeline: [
      { label: "Booking created", at: "2026-09-25T15:30:00" },
      { label: "Checked in", at: "2026-09-27T11:08:00" },
    ],
  },
  {
    id: "PN-6C19D4", userName: "Sofia Patel", email: "sofia.patel@example.com", phone: "+91 98765 43212",
    spotId: "C-18", location: "Barasat Station Parking", date: "2026-09-26", time: "12:00", duration: 4,
    vehicle: "SUV / Van", plate: "WB 26 D 9080", status: "completed", tone: "#3984b5",
    timeline: [
      { label: "Booking created", at: "2026-09-24T12:20:00" },
      { label: "Checked in", at: "2026-09-26T11:54:00" },
      { label: "Marked completed", at: "2026-09-26T16:05:00" },
    ],
  },
  {
    id: "PN-5B08E3", userName: "Kabir Sen", email: "kabir.sen@example.com", phone: "+91 98765 43213",
    spotId: "E-03", location: "Champadali More Parking", date: "2026-09-28", time: "09:00", duration: 3,
    vehicle: "EV", plate: "WB 18 E 5566", status: "cancelled", tone: "#5b8b68",
    timeline: [
      { label: "Booking created", at: "2026-09-26T17:15:00" },
      { label: "Cancelled", at: "2026-09-27T08:00:00" },
    ],
  },
  {
    id: "PN-4A07F2", userName: "Maya Das", email: "maya.das@example.com", phone: "+91 98765 43214",
    spotId: "A-12", location: "Brainware University Main Gate", date: "2026-09-25", time: "08:30", duration: 2,
    vehicle: "Car", plate: "WB 22 F 2231", status: "no_show", tone: "#ad7058",
    timeline: [
      { label: "Booking created", at: "2026-09-24T18:40:00" },
      { label: "Marked no-show", at: "2026-09-25T09:00:00" },
    ],
  },
];