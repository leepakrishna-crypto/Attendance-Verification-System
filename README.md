# Trainer Attendance & GeoTag Verification System

A full-stack attendance tracking system for trainers, built with React/Vite on the frontend and Node.js/Express on the backend. The application validates trainer check-in and check-out sessions using GPS geotag location, webcam photo proofs, duplicate photo detection, manager review, and comment-based feedback.

## 🚀 Project Overview

This project supports two main user roles:

- **Trainer**: Captures Entry and Exit photos, records location, submits session details, and optionally uploads Proof 1/Proof 2 photos for verification.
- **Manager**: Reviews submitted attendance logs, sees flagged sessions, inspects proof photos, approves/rejects sessions, and leaves comments.

## 🌟 Key Features

- Live webcam photo capture for entry/exit and proof photos
- GPS geotag location verification with address resolution
- Proof window validation for time-based verification
- Duplicate photo detection and missing proof flags
- Manager review workflow with approve/reject actions
- Comment thread for trainer-manager feedback
- Auto-seeded default users on first backend startup

## 🧱 Architecture

- `frontend/` - React application using Vite, Axios, Bootstrap, and React Router
- `backend/` - Express API with MongoDB via Mongoose, file upload support via Multer
- `backend/uploads/` - Static directory for uploaded photo assets

## 📁 Repository Structure

- `backend/`
  - `controllers/` - Express route controllers
  - `models/` - Mongoose models
  - `routes/` - API route definitions
  - `middleware/` - Authentication middleware
  - `uploads/` - Saved image files
  - `server.js` - Backend entry point

- `frontend/`
  - `src/` - React source files
  - `src/pages/` - Trainer and Manager page implementations
  - `src/components/` - Shared UI components like `RecordModal` and `RecordTable`
  - `src/context/` - App context and API wrapper

## ⚙️ Prerequisites

- Node.js 18+ (or compatible current LTS version)
- npm
- MongoDB running locally or a MongoDB connection string

## 🔧 Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `backend/` and add:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/trainer_attendance
   JWT_SECRET=your_jwt_secret_here
   ```
4. Start the backend:
   ```bash
   npm run dev
   ```

### Backend Notes

- The backend serves uploaded files from `/uploads`
- API base path is `/api`
- Health check endpoint: `/health`
- On first startup, the backend seeds default `trainer1` and `manager1` accounts when the database is empty

## 💻 Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```

### Frontend Notes

- The front-end is configured for Vite development mode
- The app uses Axios for API calls and reads `VITE_API_URL` if set
- Default behavior assumes the backend runs on `http://localhost:5000`

## 🔌 Default Credentials

Use the seeded accounts to log in:

- Trainer: `trainer1` / `password123`
- Manager: `manager1` / `password123`

## 🧪 Usage

1. Start MongoDB locally or set `MONGODB_URI` to your database.
2. Run backend server in `backend/`.
3. Run frontend server in `frontend/`.
4. Open the frontend URL provided by Vite, then log in as trainer or manager.

## 🛠️ Available Scripts

### Backend
- `npm run dev` — start the backend with auto-reload
- `npm start` — run the backend once

### Frontend
- `npm run dev` — start the Vite dev server
- `npm run build` — create a production build
- `npm run preview` — preview the production build
- `npm run lint` — run the frontend linter

## 🤝 Contribution

Feel free to:

- Add better auth flows
- Improve proof window logic
- Introduce pagination and filtering in manager views
- Add a deployment-ready production config

## 📌 Notes

- The backend auto-creates default user accounts only if the database has no users
- Photo uploads are stored in `backend/uploads`
- Proof 1 / Proof 2 are optional, but missing proofs can cause session flags and manager review

---

If you want, I can also add a short `CONTRIBUTING.md` or a quick `docker-compose` setup section. 