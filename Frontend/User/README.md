# ParkNova Frontend

React frontend for the ParkNova parking booking experience.

## Structure

```text
src/
  app/                    Application orchestration and view switching
    App.js
  features/
    auth/                 Login selection, member login, admin login, credentials
    dashboard/            Admin dashboard
    home/                 Member home
  styles/                 Feature and theme stylesheets
  index.css               Global styles
  index.js                React entry point
public/                   Static public assets
build/                    Generated production output
```

## Run Locally

From the `frontend` directory:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Validate

```bash
npm run build
```

## Demo Credentials

- Admin ID: `admin`
- Admin password: `admin123`
- Member ID: `member`
- Member password: `member123`

Admin credentials are fixed in `src/features/auth/authCredentials.js` and are shared by all administrators.
