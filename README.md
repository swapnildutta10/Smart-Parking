<div align="center">

<img src="Frontend/User/src/features/shared/parknova-logo.svg" alt="ParkNova — Park smart. Move freely." width="300">

<h1>Smart Parking, made simple</h1>
<p><strong>Find a space. Book ahead. Arrive without the search.</strong></p>

<img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white">
<img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white">
<a href="https://github.com/swapnildutta10/Smart-Parking/commits/main"><img alt="Latest commit" src="https://img.shields.io/github/last-commit/swapnildutta10/Smart-Parking?label=updated"></a>
<a href="https://github.com/swapnildutta10/Smart-Parking"><img alt="Top language" src="https://img.shields.io/github/languages/top/swapnildutta10/Smart-Parking"></a>

<p><a href="#features">Features</a> · <a href="#architecture">Architecture</a> · <a href="#quick-start">Quick start</a> · <a href="#run-locally">Run locally</a></p>

</div>

ParkNova is a full-stack parking platform with separate driver and administrator portals, live availability, reservations, and booking management.

## Features

**Driver portal**
- Find parking and check availability for a planned arrival.
- Reserve, manage, and pay for bookings; save vehicles and favorite locations.
- View receipts, notifications, and support replies.

**Administrator portal**
- Manage parking locations, inventory, rates, and bookings.
- Review users, payments, and support requests.
- Track activity and export date-filtered reports.

## Architecture

```mermaid
flowchart LR
  Driver[Driver] --> UserApp[React driver portal]
  Admin[Administrator] --> AdminApp[React admin portal]
  UserApp --> API[Express API]
  AdminApp --> API
  API --> DB[(MongoDB)]
  API -. live availability and booking events .-> UserApp
  API -. booking and payment updates .-> AdminApp
```

**Stack:** React · Node.js · Express · MongoDB · Three.js · Server-sent events

## Quick start

**Requirements:** Node.js 20.19+ and MongoDB.

```sh
git clone https://github.com/swapnildutta10/Smart-Parking.git
cd Smart-Parking
npm --prefix Backend ci
npm --prefix Frontend ci
npm --prefix Frontend/User ci
npm --prefix Frontend/Admin ci
```
