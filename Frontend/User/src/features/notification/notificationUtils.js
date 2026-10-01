export const NOTIFICATION_COPY = {
  reserved: {
    title: "Spot reserved",
    message: (notification) => `${notification.spotId} at ${notification.location} is confirmed for ${notification.date} at ${notification.time}.`,
  },
  overdue: {
    title: "Reservation cancellation warning",
    message: (notification) => `${notification.spotId} at ${notification.location} passed its start time. Park now or this reservation will be cancelled.`,
  },
  parked: {
    title: "Parking confirmed",
    message: (notification) => `Your vehicle is checked in at ${notification.spotId}.`,
  },
  cancelled: {
    title: "Reservation cancelled",
    message: (notification) => `Your reservation at ${notification.spotId} has been cancelled.`,
  },
};

export const NOTIFICATION_ICONS = {
  reserved: "⌖",
  overdue: "!",
  parked: "✓",
  cancelled: "×",
};

export function createNotification(booking, kind, createdAt = Date.now()) {
  return {
    id: `${booking.id}-${kind}`,
    bookingId: booking.id,
    kind,
    spotId: booking.spotId,
    location: booking.location,
    date: booking.date,
    time: booking.time,
    createdAt,
  };
}