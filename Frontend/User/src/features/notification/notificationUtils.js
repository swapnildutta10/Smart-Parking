export const NOTIFICATION_COPY = {
  reserved: {
    title: "Spot reserved",
    message: (notification) => `${notification.spotId} at ${notification.location} is confirmed for ${notification.date} at ${notification.time}.`,
  },
  overdue: {
    title: "Ready to check in",
    message: (notification) => `Your booking at ${notification.location} has started. Confirm when you have parked.`,
  },
  parked: {
    title: "Parking confirmed",
    message: (notification) => `Your vehicle is checked in at ${notification.spotId}.`,
  },
  cancelled: {
    title: "Reservation cancelled",
    message: (notification) => `Your reservation at ${notification.spotId} has been cancelled.`,
  },
  completed: {
    title: "Parking completed",
    message: (notification) => `Your booking at ${notification.location} is complete.`,
  },
  no_show: {
    title: "Booking marked as no-show",
    message: (notification) => `Your booking at ${notification.location} was marked as a no-show.`,
  },
};

export const NOTIFICATION_ICONS = {
  reserved: "⌖",
  overdue: "!",
  parked: "✓",
  cancelled: "×",
  completed: "✓",
  no_show: "!",
};
