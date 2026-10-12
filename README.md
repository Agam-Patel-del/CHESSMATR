<div>

#  ChessMatr
> ChessMatr is a real-time multiplayer chess platform built on the MERN stack with Socket.IO. It goes beyond simple gameplay by offering a complete social experience — allowing users to securely register, search for friends, manage requests, and instantly challenge them to live chess matches with zero latency.

</div>

---

#  Live Demo

**Try ChessMatr here:** https://chessmatr.vercel.app/

---

#  Features

-  **Live Multiplayer Chess**: Real-time board synchronization and move validation.
-  **Custom Games**: Custom games between friends.
-  **Friend Management System**: Search for users, send requests, and manage your network.
-  **Socket.IO Integration**: Instantaneous gameplay and real-time status updates.
-  **Secure Authentication**: JWT sessions, bcrypt hashing, and OTP-based email verification.
-  **Stat Tracking**: Automated tracking of your wins, losses, draws, and total games.
-  **Game History**: Games history tracking features.
-  **Robust Security**: Rate limiting, Helmet HTTP headers, and strict payload controls.

---

#  Tech Stack
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

#  Architecture Overview

> **`client/`**
> The frontend React application built with Vite. It contains all the interactive UI components, Zustand global state stores, and the Socket.io client logic for real-time gameplay.

> **`server/`**
> The backend Node.js application built with Express. It houses the MongoDB data models, secure authentication routes, Nodemailer services, and the Socket.io WebSocket server.

---

#  Getting Started

Follow these steps to get a local instance of ChessMatr up and running on your machine.

### Prerequisites
Make sure you have Node.js and npm installed.

### 1. Grab the Code
Clone the repository to your local machine and navigate into the project directory:
```bash
git clone https://github.com/your-username/chessmatr.git
cd chessmatr
```

### 2. Configure the Backend
Navigate to the server directory and install the required dependencies:
```bash
cd server
npm install
```

Next, create a `.env` file in the `/server` folder. You can use the template below. Make sure to provide your MongoDB URI and JWT secret. 
*Note: If you are running locally and don't want to configure an SMTP server, you can leave out one of the SMTP variables (`SMTP_HOST`, `SMTP_USER`, or `SMTP_PASS`). The app will enter "Development Mail Fallback" mode, printing necessary OTPs and password reset links directly to your server console instead of emailing them.*

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

Start the backend server:
```bash
npm run dev
```

### 3. Configure the Frontend
Open a separate terminal instance, navigate to the client folder, and install dependencies:
```bash
cd client
npm install
```

Create a `.env` file in the `/client` folder with the following:
```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the frontend:
```bash
npm run dev
```

### 4. You're All Set!
- The backend API is listening at: `http://localhost:5000`
- The frontend UI is available at: `http://localhost:3000`

---
