# UrbanEye Backend

Express + MongoDB API for the UrbanEye civic reporting frontend. Matches the fields
and behaviors already in `index.html` / `script.js`: report submission with photo
upload, duplicate detection by proximity, upvoting, status tracking, and the
analytics widgets on the "City Response Overview" section.

## 1. Setup

```bash
cd urbaneye-backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET, CLIENT_ORIGIN

# make sure MongoDB is running locally, or point MONGO_URI at Atlas

npm run seed   # optional: creates demo citizen/officer accounts + 3 sample issues
npm run dev    # starts on http://localhost:5000 (nodemon, auto-restart)
# or: npm start
```

Demo accounts after `npm run seed`:
| Role    | Email             | Password    |
|---------|-------------------|-------------|
| Citizen | citizen@demo.com  | password123 |
| Officer | officer@demo.com  | password123 |

## 2. Project structure

```
urbaneye-backend/
├── server.js                 # app entry point
├── config/
│   ├── db.js                 # Mongo connection
│   └── seed.js               # demo data
├── models/
│   ├── User.js                # citizen / officer accounts
│   └── Issue.js                # reported issues
├── controllers/
│   ├── authController.js
│   └── issueController.js
├── routes/
│   ├── authRoutes.js
│   └── issueRoutes.js
├── middleware/
│   ├── auth.js                # JWT verification + role guard
│   ├── upload.js               # multer photo upload config
│   └── errorHandler.js
├── utils/
│   └── geo.js                  # Haversine distance + ticket ID generator
└── uploads/                    # uploaded photos served at /uploads/<file>
```

## 3. API Reference

Base URL: `http://localhost:5000/api`

### Auth

| Method | Route             | Auth | Body                                                              |
|--------|--------------------|------|--------------------------------------------------------------------|
| POST   | `/auth/register`  | –    | `firstName, lastName, email, password, role, department?`        |
| POST   | `/auth/login`     | –    | `email, password`                                                 |
| GET    | `/auth/me`        | ✅    | –                                                                  |

`role` is `"citizen"` or `"officer"`. `department` only applies to officers, and
must match one of the categories used on the report form.

Login/register responses:
```json
{ "token": "eyJhbGciOi...", "user": { "id": "...", "firstName": "Asha", "role": "citizen", ... } }
```
Send the token on subsequent requests as `Authorization: Bearer <token>`.

### Issues

| Method | Route                        | Auth              | Purpose                                   |
|--------|------------------------------|--------------------|--------------------------------------------|
| GET    | `/issues`                    | –                  | List/filter feed. Query: `status, category, sort=recent|top, page, limit` |
| GET    | `/issues/check-duplicate`    | –                  | Query: `lat, lng` → nearest open issue within 500m, if any |
| POST   | `/issues`                    | optional           | Create a report. `multipart/form-data`, field `photo` for the image |
| GET    | `/issues/mine`               | ✅ (citizen)        | Reports filed by the logged-in user       |
| GET    | `/issues/:id`                | –                  | Single issue detail                       |
| POST   | `/issues/:id/upvote`         | –                  | Body: `{ voterId }` (client-generated token, e.g. stored in localStorage) — toggles the vote |
| PATCH  | `/issues/:id/status`         | ✅ (officer only)   | Body: `{ status, priority?, note? }`      |
| GET    | `/issues/analytics/summary`  | –                  | Powers the dashboard widgets + Chart.js graph |

**Create issue — form fields** (multipart/form-data):
```
title            string, required
category         string, required — must match Issue.CATEGORIES
urgency          "low" | "medium" | "high"
description      string
reporterName     string
reporterContact  string
lat, lng         numbers, required
photo            file, required (jpeg/png/webp/gif, max 8MB)
```

Response includes a `duplicateWarning` block (mirrors the frontend's own
client-side duplicate alert) so the UI can show the same banner using live
server data instead of the hardcoded demo array:
```json
{
  "issue": { "ticketId": "UE-7231", "status": "pending", ... },
  "duplicateWarning": { "ticketId": "UE-4812", "title": "...", "distanceMeters": 180 }
}
```

**Analytics response shape** (drop-in for `initChart()` and the dashboard widgets in `script.js`):
```json
{
  "counts": { "pending": 34, "inProgress": 19, "resolved": 182, "total": 235 },
  "byCategory": [{ "_id": "Roads & Potholes", "count": 48 }, ...],
  "chart": {
    "labels": ["Feb","Mar","Apr","May","Jun","Jul","Aug"],
    "reported": [65,85,110,130,155,140,175],
    "resolved": [50,78,102,125,150,138,168]
  }
}
```

## 4. Connecting the existing frontend

The current `script.js` uses static demo data and `alert()` on submit. To wire it
to this API:

1. Replace the hardcoded `existingIssues` array with a `fetch('/api/issues')` call on load.
2. In `handleFormSubmit`, build a `FormData` object (title, category, urgency,
   description, reporterName, reporterContact, lat, lng, and the file input for
   `photo`) and `POST` it to `/api/issues` instead of building the fake card HTML.
3. On success, use the returned `issue` object to render the new feed card, and
   show `duplicateWarning` in place of the current client-only duplicate check.
4. Point `img` tags at `` `http://localhost:5000${issue.imageUrl}` `` (or serve the
   API and frontend from the same origin in production).
5. For upvotes, generate a `voterId` once per browser (`crypto.randomUUID()`
   stored in `localStorage`) and send it with each `POST /issues/:id/upvote`.
6. For the officer-only status dropdown, gate it behind a logged-in officer
   token and call `PATCH /issues/:id/status`.

I can wire this integration into `script.js` directly next, if you'd like.
