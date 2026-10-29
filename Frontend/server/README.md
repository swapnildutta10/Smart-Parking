# Authentication

The User React forms use the existing Express backend in `../../Backend`.
Registration sends `POST /api/users/register`; login sends `POST /api/users/login`.
The backend stores users in the `Smart-Parking.users` MongoDB collection with
scrypt password hashes. Login returns a signed session token; the frontend uses
that token to restore the profile through `GET /api/users/profile`.

From the Frontend directory, run `npm run start:api`. In another terminal, run
`npm --prefix User start`. The frontend defaults to `http://localhost:5000/api`;
set `REACT_APP_API_URL` in `User/.env` to override it, then restart React.

The backend reads `MONGO_URI`, `JWT_SECRET` (at least 32 characters), and
`CORS_ORIGINS` from `Backend/.env`. Keep database credentials on the backend.
The separate `server/mongodb.mjs` module is a standalone connection helper;
the existing API uses Mongoose and already owns its database connection.

With the API running, `npm run test:auth` checks registration, MongoDB
persistence, password hashing, duplicate emails, incorrect passwords, login,
and protected profile access. It creates a uniquely named test user and removes
that user afterward. Administrator login uses the existing backend admin
configuration; member accounts are managed separately by the administrator.

## Bookings and test payments

Bookings use the existing MongoDB reservation API. Payment checkout fetches
`GET /api/bookings/:ref/payment-quote?promo_code=...`, then saves a test payment
with `POST /api/bookings/:ref/test-payment`. The server calculates fees from the
saved booking amount (hourly pricing), validates UPI or net banking selections,
and returns the saved receipt. It ignores browser-provided amounts and statuses.
No payment provider is called and no funds are transferred.

Test receipts are stored separately in `Smart-Parking.test_payments`. One payment
is allowed per booking; MongoDB booking locks serialize retries and cancellation.
Cancellation marks the test payment refunded. `GET /api/payments` returns only the
signed-in user's history; `GET /api/admin/payments` requires an administrator.
Receipts are restored from MongoDB instead of browser storage. Legacy browser-only
payment records are not imported because they have no server verification.

Test payment creation is available in development. Set
`TEST_PAYMENTS_ENABLED=false` in `Backend/.env` to disable it. Production requires
an explicit `TEST_PAYMENTS_ENABLED=true` to enable test payments. Restart the API
after changing environment settings.

Run `npm run test:payments` with the backend running to check booking persistence,
duplicate reservation requests, payment pricing and promos, user isolation,
duplicate payment requests, admin history, both payment methods, and cancellation.
The check removes its own generated users, bookings and test payment records.

## Admin booking management

The administrator dashboard loads `GET /api/admin/bookings` every 15 seconds.
Status buttons call `PATCH /api/admin/bookings/:ref/status` and update the page
only after MongoDB confirms the change. User booking history refreshes every
30 seconds and after sign-in. Member accounts cannot access administrator
booking endpoints.

The backend validates transitions and arrival times: check-in during the booked
window, completion after check-in (or an elapsed booking), cancellation before
arrival, and no-show after the booking ends. Terminal bookings cannot be reopened.
Admin changes are recorded in `booking_events` for the booking timeline. Cancelling
a paid booking also marks its simulated payment refunded.

## Parking slot management

The admin slot screen uses `GET/POST /api/admin/parking` and
`PATCH/DELETE /api/admin/parking/:inventoryId`. All endpoints require an
administrator session. The public `/api/parking` endpoint reads the same inventory;
the user app refreshes it every 30 seconds and the admin app every 15 seconds.

Slots have server-generated IDs, a supported vehicle type (Car, Two wheeler,
SUV / Van), location, address, hourly INR rate, and total capacity. Available
capacity is calculated from overlapping bookings, rather than entered manually.
Inventory prices use MongoDB Decimal128 with at most two decimal places.

Edits use the same inventory lock as reservations. A capacity reduction cannot
displace reservations; location and vehicle changes are blocked while active
reservations exist. Rate edits apply to new bookings and preserve booked rates.
Deleting an unreserved slot sets inventory inactive, removing it from listings
while preserving history. Slots with active reservations cannot be deleted.
Editing location details creates a location version so other inventory sharing
the original location is not renamed.

Run `npm run test:parking` with the backend running to check create/edit/delete,
authorization and input validation, public listing updates, booked prices,
capacity constraints, and retained booking history. The check removes only its
own generated user, bookings, location records and inventory.

## Locations, inventory and saved vehicles

Administrators can create locations in **Parking locations** using
`POST /api/admin/locations` with `name` and `address`. The page loads
`GET /api/admin/locations`. Creating a location alone does not publish a bookable
parking space: add its inventory, vehicle type, hourly rate and capacity under
**Parking inventory**.

Inventory create/edit requests can supply `parkingId` referencing an existing
active location. The backend reads its name and address from MongoDB. The unique
location/vehicle-type index prevents duplicate inventory for that combination.
The inline new-location option remains available in the inventory form.

Signed-in users manage their garage through `GET/POST /api/vehicles` and
`DELETE /api/vehicles/:vehicleId`. Records use the existing `saved_vehicles`
collection and account UUID. Registration numbers are normalized to uppercase
letters/digits; duplicate plates are rejected per account. No sample vehicle is
created automatically. The user dashboard restores saved vehicles on sign-in,
and the booking form offers saved vehicles matching the selected parking type.

Run `npm run test:catalog` to check locations, shared-location inventory,
duplicate handling, saved vehicle persistence and account isolation. It cleans
up only the records created by that run.

## Saved locations

The user's Save button and Saved locations page use `GET/POST /api/saved-locations`
and `DELETE /api/saved-locations/:inventoryId`. All operations require a user
session and check the current account's status. Ownership always comes from the
signed session, never a request field. Records are stored in `saved_locations`;
the compound user/inventory document ID prevents duplicate saves, including
concurrent requests. Removal is idempotent.

Favorites load when the user dashboard opens. They use stable inventory UUIDs,
retain current pricing and availability, and survive a fresh login. Unavailable
saved inventory remains removable but cannot be booked. The page provides loading
and failure states, and changes are shown only after the backend succeeds.

Run `npm run test:saved-locations` to check persistence, duplicates, ownership,
suspended accounts, and removing unavailable inventory. It cleans up only its own
generated records.

## Notification history

`GET /api/notifications` returns the signed-in user's persisted notifications,
newest first. It checks account status and never accepts a user ID or notification
body from the browser. The browser cannot create arbitrary notification events.

Reservation, check-in, cancellation, completion and no-show changes write alerts
from the backend. Both user and admin booking changes are covered. Notification
IDs are unique per account, booking and kind, so retrying a booking action or
refreshing history does not duplicate an alert or change its timestamp.

History reads reconcile existing bookings and admin booking events to recover
missing records. Arrival reminders are generated on history reads during an
upcoming booking's arrival window, using its start time; this does not run a
background scheduler or send external push notifications. Existing arrival
alerts remain in history after check-in or cancellation, with the check-in
action disabled once the booking is no longer upcoming.

The frontend loads notifications at login, refreshes every 30 seconds and on
window focus, and refreshes after user booking actions. Loading errors and
check-in failures are displayed on the notification page. Run
`npm run test:notifications` to check persistence, ownership, duplicate handling,
arrival reminders, booking action hooks and recovery of missing history.

## Help and support

The Help & Support form submits to `POST /api/support` and restores the user's
request history from `GET /api/support`. Requests have a topic, message, stable
reference, timestamps, status and support replies, stored in `support_requests`.
Ownership and customer details come from the authenticated account. User
responses omit internal ownership fields and other customers' data.

Administrators use **Help & support** to read `GET /api/admin/support` and update
requests through `PATCH /api/admin/support/:id`. Statuses are `open`,
`in_progress`, and `resolved`; replies are visible in the user's request history.
Member accounts cannot access this inbox. Replies are delivered in the app;
these endpoints do not send email or other external messages.

Submission request IDs and reply request IDs prevent duplicate writes after a
network retry. Messages and replies are limited to 4,000 characters; topics,
statuses and account access are validated on the server. Users see a success
reference only after MongoDB confirms submission. The user history refreshes
every 30 seconds and on window focus; the admin inbox refreshes every 15 seconds.

Run `npm run test:support` to check storage, retries, validation, privacy,
administrator replies/statuses and suspended-account handling. Test records are
removed at the end of the run.

## Admin dashboard and reports

`GET /api/admin/dashboard` supplies live users, active reservations, current slot
capacity, distinct bookable locations, support workload, recent bookings and
monthly payment/refund totals. Current occupancy is based on bookings overlapping
the current moment; future reservations are counted separately. Location rankings
group all inventory types for a physical location. Recent bookings use creation
order, rather than the arrival date. The sample dashboard charts were removed.

`GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` supplies booking statuses,
booked parking value, payment/refund totals, daily rows and location summaries.
Both endpoints require an administrator; they do not intercept admin login.
Date ranges are inclusive in Asia/Kolkata, limited to 366 days, with zero-filled
daily rows. The default report covers the current month through today.

Bookings are filtered by arrival time. Payments use `paidAt`, including payments
later refunded; refunds use `refundedAt` (or `paidAt` for older records without a
refund timestamp). Net amounts are gross recorded amounts minus refunds in the
selected period and can be negative. Booked parking value excludes cancelled
and no-show reservations. Payment data currently comes from the simulated
payment collection; the UI clearly states no money was collected. Expenses are
not recorded and are not fabricated as a chart series.

Dashboard and reports refresh every 30 seconds and on focus, and have manual
refresh controls. The Reports page applies date filters and exports the loaded
report as CSV, with numeric INR amounts and protected spreadsheet text cells.
Run `npm run test:reporting` for authorization, date validation, leap years,
IST boundaries, refund timing, aggregate totals, capacity and empty-data checks.
The admin's report export test also verifies quoting, signed numeric values
and spreadsheet formula protection.

## User dashboard

`GET /api/dashboard` returns the signed-in user's overview plus public live
parking capacity. It rejects administrator tokens and suspended accounts, and
uses account IDs from the session rather than request parameters.

Personal figures include booking/status totals, non-expired active reservations,
the next upcoming reservation, pending payments, recorded payments/refunds, saved
locations, saved vehicles, support workload and recent booking history. The yearly
chart counts this user's bookings by arrival year in Asia/Kolkata, with zero-filled
recent years. Cancelled bookings remain part of historical activity.

Public capacity includes distinct bookable locations, available/total spaces,
average hourly rates, availability by vehicle type, and area occupancy calculated
against actual total capacity. The previous numbered sample bay map was replaced
by inventory-level booking buttons because the database tracks capacity rather
than individually assigned bays. No synthetic bay assignments are made.

The user Home screen refreshes every 30 seconds, on focus, and after local booking,
payment, saved vehicle or saved location changes. The sample annual counts and
reservation card were removed. `npm run test:user-dashboard` verifies empty
accounts, public capacity, private summaries, payment/refund updates, expired
reservations, sign-in restoration and account isolation.

## User profile

The Profile and Update profile screens load fresh account details from
`GET /api/users/profile` on entry. `PATCH /api/users/profile` validates and saves
name, email and optional phone to the signed-in user's MongoDB record. Only
these fields can be updated; supplied IDs or roles are ignored. Responses never
include password hashes. Suspended accounts cannot read or change their profile.

Emails are trimmed and lowercased, and duplicate emails return a conflict.
Changing email preserves the account ID, password and existing account records;
the new email is used at the next login. Phone numbers accept spaces, parentheses
and hyphens, store 7–15 digits with an optional leading plus, and can be cleared.
Older callers that omit phone preserve the existing number.

The frontend pre-fills edits from the API, retains input after failed saves,
shows success only after confirmation, and synchronizes the account header after
loading or saving. It displays the saved phone and actual joining date, and
prevents repeated submissions while a save is pending. Run `npm run test:profile`
to check persistence, email changes, password preservation, validation, ownership,
phone clearing and suspended-account access. Temporary accounts are removed.

## Live availability by location

`GET /api/availability` returns current public capacity grouped by physical
location, with separate vehicle-type inventory, available/reserved/total counts,
an update timestamp and a 10-second refresh interval. The response disables HTTP
caching and contains no booking references or customer data.

Supply `starts_at` and `ends_at` (timezone-aware timestamps) to check a planned
window of up to 24 hours and an arrival within the next year. An optional
`parking_id` filters the result to one active location. The same peak-overlap
calculation used by reservation checks determines availability; sequential
reservations do not consume multiple spaces throughout the entire window.

Users open **Live availability**, filter locations and vehicle types, and select
current capacity or apply a planned arrival/duration. Data refreshes immediately
on reservation changes, with 10-second fallback checks, focus refresh, manual
refresh and error handling. Planned booking
selections are carried into the booking form, where capacity is rechecked before
confirmation. Current-mode bookings default to the next quarter-hour rather than
an arrival time that has already passed. Counts refer to reservable capacity,
not sensor readings or individually assigned bays.

Run `npm run test:availability` to verify multiple locations/types, current and
planned windows, peak occupancy, cancellation updates, interval boundaries and
simultaneous requests for the final space. The UI tests cover filtering, planned
booking handoff, 10-second refresh and disabling booking after a refresh failure.

## Immediate availability updates

`GET /api/availability/events` is a public server-sent event stream carrying only
an inventory ID, reason and timestamp. The API publishes after successful MongoDB
writes for reservations, cancellation, check-in, admin booking status changes and
inventory create/edit/delete. Failed requests and idempotent booking retries do
not create new capacity changes. Open streams are heartbeated and cleaned up on
disconnect or server shutdown.

Each user page shares one EventSource connection across the live availability
page, parking list, dashboard overview and booking modal. Event notifications
trigger fresh backend queries for the currently selected time window; local
successful booking actions also signal the page immediately. Updates received
during a pending availability request queue a new fetch instead of being lost.
Newer responses take precedence in the directory and overview.

EventSource reconnects automatically, with a fresh query on reconnection to
recover missed events. Existing fallback checks still cover outages and booking
time-window boundaries. A future booking changes availability for its overlapping
window; it does not reduce right-now capacity before arrival.

Broadcasts currently run within the single API process used by this project.
Multiple API worker deployments would require shared pub/sub to broadcast across
workers; fallback polling remains available. Direct database edits are picked up
by the fallback rather than being broadcast as application events.

Run `npm run test:live-events` for two real streaming clients, committed-write
ordering, booking/cancellation count changes, disconnect/reconnect behavior and
event privacy. The UI tests also cover immediate local actions, server events,
reconnections and changes during in-flight requests.

The admin app now shares its own single EventSource connection across dashboard,
reports and booking history. Booking/cancellation broadcasts trigger immediate
authenticated reads of the current admin summary and booking list. Reconnection
refreshes both; the existing 15/30-second timers remain as fallback checks.
Changes that arrive during a pending read queue a fresh request and suppress the
stale result, preserving the booking filters and avoiding a page reload.
`AdminDashboard.live.test.js` verifies new bookings, cancellations, updated
summary counts, shared connection cleanup, reconnection and in-flight reads.

Admin payment history also subscribes to the shared live stream. A successful
payment publishes `payment-created` after its payment record is inserted.
Cancellation broadcasts now follow the refund write for both user and admin
cancellations, so event-triggered payment reads cannot observe the old paid
status merely because the refund was still being written. History, payment
totals, and dashboard/report summaries refresh from these events. Filters are
preserved; pending reads queue updates and suppress stale results. Reconnection,
window focus and the original fallback interval remain supported.

`AdminPaymentHistory.live.test.js` checks immediate payment/refund updates,
totals, preserved filters, reconnection and in-flight reads. The live event
integration test verifies committed payment/refund state with two subscribers
and both cancellation paths. Stale registrations for missing member backend
files were also removed to restore API startup; those missing files were not
recreated.

## Login CAPTCHA

Both password login forms require a server-generated image challenge. GET
`/api/auth/captcha?purpose=user` (or `admin`) returns an ID, an SVG image rendered
as paths, and its expiry; it never returns the answer. Login POSTs include
`captchaId` and `captchaAnswer`. Answers ignore letter case.

Challenges expire after five minutes and are consumed atomically on submission,
including incorrect answers and failed credentials. Each challenge is bound to
one login type. MongoDB stores a keyed digest and removes old challenges through
a TTL index; expiry is also checked during validation. Existing login rate
limits remain active, and image generation is rate limited. The forms offer
New image and automatically refresh after failed login attempts.

Run `npm run test:captcha` for generation, expiry, incorrect answers, single use,
concurrent replay prevention, and both login types. Integration scripts use
`server/login-fixture.mjs` to insert known challenges directly into the isolated
local test database. This helper is never loaded by the API and adds no public
bypass. Login UI tests verify submission fields, disabled states and refresh.
