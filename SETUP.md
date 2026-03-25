# ZENVYAR — Setup Guide

## Requirements
- Node.js (v18+)
- MongoDB (local or Atlas)

## 1. Backend Setup

```bash
cd backend
npm install
```

## 2. Environment Variables
Edit `backend/.env`:
```
MONGO_URI=mongodb://localhost:27017/zenvyar
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
ADMIN_EMAIL=your_gmail@gmail.com
```

## 3. Create Admin Account
```bash
node backend/seed-admin.js
```
Admin credentials:
- Email: admin@zenvyar.com
- Password: Zenvyar@2026

## 4. Start Server
```bash
cd backend
npm run dev
```

Website opens at: **http://localhost:5000**
Admin panel: **http://localhost:5000/admin.html**
Admin login: **http://localhost:5000/login.html**

## API Endpoints
- `GET  /api/products` — All products
- `POST /api/orders`   — Place order
- `GET  /api/orders/track/:orderId` — Track order
- `POST /api/auth/login`  — Login
- `POST /api/auth/signup` — Register
