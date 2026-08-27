# 🏙️ UrbanEye — Civic Issue Reporting Platform

> **UrbanEye** is a civic tech platform that empowers citizens to report urban infrastructure issues (potholes, broken streetlights, garbage overflow, etc.) and allows municipal administrators to track, prioritize, and resolve them — all in real time.

Built for the **ISTE Hackathon**.

---

## ✨ Features

### 👤 Citizen
- Register with **OTP-based email verification**
- Sign in as a Citizen or Admin
- **Report civic issues** with title, category, description, photo, and GPS pin
- Track status of submitted complaints (`pending → in_progress → resolved`)
- View a **live feed** of nearby reports on an interactive map

### 🛡️ Admin
- Restricted login with an admin access code
- View **all complaints** across the city
- Update complaint status and add official notes
- Assign crew and manage prioritization

---

## 🛠️ Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript, Lucide Icons   |
| Backend   | Node.js, Express.js                             |
| Database  | MongoDB Atlas (Mongoose ODM)                    |
| Auth      | JWT (JSON Web Tokens), bcryptjs                 |
| Email/OTP | Nodemailer (SMTP)                               |
| Dev Tools | Nodemon, dotenv                                 |

---

## 📁 Project Structure

```
urbaneye/
├── backend/
│   ├── config/
│   │   └── db.js                # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Register, login, OTP logic
│   │   └── complaintController.js
│   ├── middleware/
│   │   ├── requireAuth.js       # JWT auth guard
│   │   └── requireAdmin.js      # Admin role guard
│   ├── models/
│   │   ├── user.js              # User schema
│   │   ├── complaint.js         # Complaint schema
│   │   └── otpToken.js          # OTP schema
│   ├── routes/
│   │   ├── authroutes.js        # /api/auth/*
│   │   └── complaintroutes.js   # /api/complaints/*
│   ├── utils/
│   ├── server.js                # Express app entry point
│   └── .env                     # Environment variables (not committed)
│
└── frontend/
    ├── index.html               # Sign In page
    ├── register.html            # Registration page
    ├── dashboard.html           # Citizen dashboard
    ├── admin-dashboard.html     # Admin dashboard
    ├── style.css                # Global styles
    ├── login.css                # Auth page styles
    ├── Auth.css                 # Shared auth styles
    ├── login.js                 # Sign-in logic
    ├── Auth.js                  # Auth utilities
    ├── script.js                # Dashboard logic
    └── dashboard-user.js        # Citizen-specific dashboard
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (or local MongoDB)
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) for OTP emails

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/urbaneye.git
cd urbaneye
```

### 2. Configure Environment Variables

A safe template is included. Copy it and fill in your real values:

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/urbaneye
PORT=5002
CLIENT_ORIGIN=http://127.0.0.1:5500

EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

ADMIN_ACCESS_CODE=your-admin-code
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=5
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Run the Backend Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5002`.

### 5. Serve the Frontend

Open the `frontend/` folder with a local static server. The easiest way is the **Live Server** extension in VS Code:

1. Open `frontend/index.html` in VS Code
2. Click **Go Live** in the bottom status bar

Or use any static file server:
```bash
npx serve frontend
```

---

## 🔌 API Reference

### Auth — `/api/auth`

| Method | Endpoint        | Description                    | Auth Required |
|--------|-----------------|--------------------------------|---------------|
| POST   | `/send-otp`     | Send OTP to email for signup   | ❌            |
| POST   | `/resend-otp`   | Resend OTP                     | ❌            |
| POST   | `/verify-otp`   | Verify OTP code                | ❌            |
| POST   | `/register`     | Register a new citizen account | ❌            |
| POST   | `/login`        | Login (citizen or admin)       | ❌            |

### Complaints — `/api/complaints`

| Method | Endpoint  | Description                     | Auth Required |
|--------|-----------|---------------------------------|---------------|
| GET    | `/`       | List all complaints              | ✅ User       |
| POST   | `/`       | Submit a new complaint           | ✅ User       |
| PATCH  | `/:id`    | Update complaint status/note     | ✅ Admin      |

### Health

| Method | Endpoint       | Description         |
|--------|----------------|---------------------|
| GET    | `/api/health`  | Check server status |

---

## 🗂️ Data Models

### Complaint

| Field          | Type     | Notes                                   |
|----------------|----------|-----------------------------------------|
| `ticketId`     | String   | Unique ticket ID                        |
| `reportedBy`   | ObjectId | Reference to User                       |
| `user`         | String   | Display name of reporter                |
| `category`     | String   | Issue category (e.g., Roads, Lighting)  |
| `title`        | String   | Short issue title                       |
| `description`  | String   | Detailed description                    |
| `priority`     | String   | `low` / `medium` / `high`              |
| `status`       | String   | `pending` / `in_progress` / `resolved`  |
| `lat`, `lng`   | Number   | GPS coordinates of the issue            |
| `image`        | String   | Base64 or URL of uploaded photo         |
| `assignedCrew` | String   | Crew assigned to fix the issue          |
| `officialNote` | String   | Admin response note                     |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">
  Built with ❤️ for the ISTE Hackathon &nbsp;|&nbsp; <strong>UrbanEye</strong> — See the city. Fix the city.
</div>
