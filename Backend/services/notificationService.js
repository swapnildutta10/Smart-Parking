const kinds = { upcoming: 'reserved', checked_in: 'parked', cancelled: 'cancelled', completed: 'completed', no_show: 'no_show' };

async function recordNotification(db, booking, kind, at = new Date()) {
  if (!booking.user_id || !kind) return;
  const item = await db.collection('parking_inventory').findOne({ inventory_id: booking.inventory_id });
  const location = item && await db.collection('parking_locations').findOne({ parking_id: item.parking_id });
  const local = new Date(+booking.starts_at + 330 * 60000).toISOString();
  const id = `${booking.booking_ref}-${kind}`;
  const _id = `${booking.user_id}:${id}`;
  const notification = { id, userId: booking.user_id, bookingId: booking.booking_ref, kind,
    spotId: booking.inventory_id.slice(0, 8).toUpperCase(), location: location?.location_name || 'Parking location',
    date: local.slice(0, 10), time: local.slice(11, 16), createdAt: +new Date(at) };
  try {
    await db.collection('notifications').updateOne({ _id }, { $setOnInsert: notification }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000 || !await db.collection('notifications').findOne({ _id })) throw error;
  }
}

async function notificationHistory(db, userId, now = new Date()) {
  if (!userId) return [];
  // Reconcile older bookings and recover missed writes without accepting client events.
  const bookings = await db.collection('bookings').find({ user_id: userId }).toArray();
  for (const booking of bookings) {
    await recordNotification(db, booking, 'reserved', booking._id.getTimestamp());
    const events = await db.collection('booking_events').find({ bookingId: booking.booking_ref }).sort({ at: 1 }).toArray();
    const eventKinds = { 'Checked in': 'parked', 'Cancelled': 'cancelled', 'Marked completed': 'completed', 'Marked no-show': 'no_show' };
    for (const event of events) {
      if (eventKinds[event.label]) await recordNotification(db, booking, eventKinds[event.label], event.at);
    }
    if (booking.status !== 'upcoming') await recordNotification(db, booking, kinds[booking.status], now);
    if (booking.status === 'upcoming' && +now >= +booking.starts_at && +now < +booking.ends_at) {
      await recordNotification(db, booking, 'overdue', booking.starts_at);
    }
  }
  const rows = await db.collection('notifications').find({ userId }).sort({ createdAt: -1, id: 1 }).toArray();
  return rows.map(({ _id, userId, ...notification }) => notification);
}
module.exports = { recordNotification, notificationHistory, kinds };
