# Wheel App

Campaign "spin the wheel" web application. Users register and spin the wheel once. Admins manage wheel sections, campaigns, images and spin records from a panel.

## Features

- User registration (name, surname, email) with one spin per user
- Weighted wheel sections, editable from the admin panel
- Campaign management
- Image upload for the wheel and campaigns (Multer, images only)
- Admin login with JWT and bcrypt password hashing
- Spin records: list, approve, bulk delete
- Tables are created automatically on first run

## Tech stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL (`pg`)
- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Auth:** jsonwebtoken, bcryptjs, cookie-parser
- **Deploy:** Render (`render.yaml`: web service + PostgreSQL)

## Run locally

Requirements: Node.js 16+, PostgreSQL 12+

```bash
git clone https://github.com/BurakAytas/Wheel-App.git
cd Wheel-App
npm install
```

Create a database and a `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/cark_uygulamasi
JWT_SECRET=change-me
PORT=3000
```

```bash
npm start
```

Open `http://localhost:3000`. On first run a default admin account is created (`admin` / `admin123`). Change this password before any real use.

## Project structure

```
server.js           Express server
src/db.js           Database connection and table setup
src/routes/         auth, user and admin API routes
public/             HTML, CSS and JavaScript for the wheel and admin pages
render.yaml         Render deployment config
```

## API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/user/register` | Register a user |
| POST | `/api/user/spin` | Spin the wheel |
| GET | `/api/user/wheel-sections` | Get wheel sections |
| GET | `/api/user/campaigns` | Get active campaigns |
| POST | `/api/auth/login` | Admin login |
| GET | `/api/admin/spins` | List spin records |
| POST | `/api/admin/spins/bulk-delete` | Delete spin records |
| GET / POST | `/api/admin/wheel-sections` | Read / update wheel sections |
| GET | `/api/admin/campaigns` | Manage campaigns |
| POST | `/api/admin/upload-image` | Upload an image |
