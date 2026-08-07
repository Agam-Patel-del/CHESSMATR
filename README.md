<div>

# ♟️ ChessMatr
> ChessMatr is a real-time multiplayer chess platform built on the MERN stack with Socket.IO. It goes beyond simple gameplay by offering a complete social experience — allowing users to securely register, search for friends, manage requests, and instantly challenge them to live chess matches with zero latency.

</div>

---

# 🌐 Live Demo

**Try ChessMatr here:** https://chessmatr.vercel.app/

---

# ⚡ Features

- ♟️ **Live Multiplayer Chess**: Real-time board synchronization and move validation.
- 👥 **Friend Management System**: Search for users, send requests, and manage your network.
- ⚡ **Socket.IO Integration**: Instantaneous gameplay and real-time status updates.
- 🔐 **Secure Authentication**: JWT sessions, bcrypt hashing, and OTP-based email verification.
- 📊 **Stat Tracking**: Automated tracking of your wins, losses, draws, and total games.
- 🛡️ **Robust Security**: Rate limiting, Helmet HTTP headers, and strict payload controls.

---

# 🛠️ Tech Stack
**A full-stack MERN + Socket.IO chess application featuring live matchmaking, secure private accounts, integrated friend networks, and real-time game state synchronization.**
<p>
  <img src="https://skillicons.dev/icons?i=react,html,css,javascript,nodejs,express,mongodb,vite" />
</p>

## Frontend
- **React**
- **Vite**
- **Zustand**
- **React Router**
- **React Chessboard**
- **chess.js**
- **Socket.io-client**

## Backend
- **Node.js**
- **Express.js**
- **MongoDB & Mongoose**
- **Socket.io**
- **chess.js**
- **cors**
- **dotenv**

## Security & Services
- **JSON Web Tokens (JWT)**
- **bcrypt**
- **Helmet**
- **Express Rate Limiter**
- **Nodemailer**
- **cookie-parser**
---

# 📁 Architecture Overview

> **`client/`**
> The frontend React application built with Vite. It contains all the interactive UI components, Zustand global state stores, and the Socket.io client logic for real-time gameplay.

> **`server/`**
> The backend Node.js application built with Express. It houses the MongoDB data models, secure authentication routes, Nodemailer services, and the Socket.io WebSocket server.

---

# 🚀 Setup Instructions

## 1. Clone the repository
```bash
git clone https://github.com/your-username/chessmatr.git
cd chessmatr
```

## 2. Setup Backend
```bash
cd server
npm install
```

Create a `.env` file in the `/server` directory:Put the necessary credentials from your side , a sample of it is provided , for smtp server credentails , if you don't have one, use it in Development Mail Fallback mode , where you have to not provide atleast one of `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` and the eseential OTPs and Reset Password Links will be logged on server terminal.

```env

PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ChessMatr?appName=YourAppName
JWT_SECRET=your_super_secret_jwt_key_here
FRONTEND_URL=http://localhost:3000
DB_NAME=ChessMatr
TOKEN_EXPIRY=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM_NAME=ChessMatr

```

Run the backend development server:
```bash
npm run dev
```

## 3. Setup Frontend
Open a new terminal window:
```bash
cd client
npm install
```

Create a `.env` file in the `/client` directory:
```env
VITE_API_BASE_URL=http://localhost:5000
```

Run the frontend development server:
```bash
npm run dev
```

## 4. Run Full App
- Backend is running on: `http://localhost:5000`
- Frontend is running on: `http://localhost:3000`

---