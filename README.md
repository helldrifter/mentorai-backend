# MentorAI Backend

JEE & NEET personalised mentorship platform — Node.js + Express + MongoDB + Razorpay

---

## Tech Stack

| Layer     | Technology              |
|-----------|------------------------|
| Runtime   | Node.js 18+            |
| Framework | Express.js             |
| Database  | MongoDB Atlas (free)   |
| Auth      | JWT + bcrypt           |
| Payments  | Razorpay               |
| Email     | Nodemailer (Gmail)     |
| Hosting   | Railway / Render (free)|

---

## Folder Structure

```
mentorAI-backend/
├── server.js          ← Entry point
├── .env.example       ← Copy to .env and fill values
├── package.json
├── models/
│   └── index.js       ← User, Mentor, Session, Package, Payment, Score
├── middleware/
│   └── auth.js        ← JWT protect + authorize
└── routes/
    ├── auth.js        ← Register, login, verify email, forgot password
    ├── students.js    ← Dashboard, profile, diagnostic
    ├── mentors.js     ← List, filter, book demo, availability
    ├── sessions.js    ← Book, complete, rate sessions
    ├── packages.js    ← List packages, seed default packages
    ├── payments.js    ← Razorpay order create + verify
    ├── calculator.js  ← Score submit + history
    └── stats.js       ← JEE live stats
```

---

## Step 1 — Clone & install

```bash
git clone <your-repo>
cd mentorAI-backend
npm install
```

---

## Step 2 — Setup MongoDB Atlas (Free)

1. Go to https://cloud.mongodb.com → create free account
2. Create a new cluster (M0 Free Tier)
3. Create a database user (username + password)
4. Click "Connect" → "Drivers" → copy the connection string
5. Replace `<password>` in the string with your password

---

## Step 3 — Setup Razorpay (Test Mode)

1. Go to https://razorpay.com → create account
2. Dashboard → Settings → API Keys → Generate Test Keys
3. Copy Key ID and Key Secret

---

## Step 4 — Setup Gmail for emails

1. Go to Google Account → Security → 2-Step Verification → ON
2. App Passwords → Select Mail → Generate
3. Use that 16-char password as EMAIL_PASS

---

## Step 5 — Configure .env

```bash
cp .env.example .env
```

Fill in your values:
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/mentorai
JWT_SECRET=any_random_long_string_here
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXX
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_16_char_app_password
CLIENT_URL=http://localhost:3000
```

---

## Step 6 — Run locally

```bash
npm run dev      # development (auto-restarts)
npm start        # production
```

Server starts at: **http://localhost:5000**

---

## Step 7 — Seed packages (run once)

After starting the server, create an admin user in MongoDB directly,
then call:

```
POST /api/packages/seed
Authorization: Bearer <admin_token>
```

This creates the 3 default packages (₹499 / ₹1299 / ₹2499).

---

## API Reference

### Auth
| Method | Route                        | Access |
|--------|------------------------------|--------|
| POST   | /api/auth/register           | Public |
| POST   | /api/auth/login              | Public |
| GET    | /api/auth/verify-email?token | Public |
| POST   | /api/auth/forgot-password    | Public |
| POST   | /api/auth/reset-password     | Public |
| GET    | /api/auth/me                 | Protected |

### Mentors
| Method | Route                          | Access    |
|--------|--------------------------------|-----------|
| GET    | /api/mentors                   | Public    |
| GET    | /api/mentors/:id               | Public    |
| GET    | /api/mentors/:id/availability  | Public    |
| POST   | /api/mentors/:id/book-demo     | Student   |
| PUT    | /api/mentors/profile           | Mentor    |

### Sessions
| Method | Route                      | Access  |
|--------|----------------------------|---------|
| GET    | /api/sessions/my           | Auth    |
| POST   | /api/sessions              | Student |
| PATCH  | /api/sessions/:id/complete | Mentor  |
| PATCH  | /api/sessions/:id/rate     | Student |

### Payments
| Method | Route                       | Access  |
|--------|-----------------------------|---------|
| POST   | /api/payments/create-order  | Student |
| POST   | /api/payments/verify        | Student |
| GET    | /api/payments/history       | Student |

### Calculator
| Method | Route                    | Access |
|--------|--------------------------|--------|
| POST   | /api/calculator/submit   | Public |
| GET    | /api/calculator/history  | Auth   |

### Stats
| Method | Route             | Access |
|--------|-------------------|--------|
| GET    | /api/stats/jee    | Public |
| GET    | /api/stats/live   | Public |

---

## Deploy to Railway (Free, Recommended)

1. Push code to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add environment variables (copy from .env)
4. Railway auto-detects Node.js and deploys
5. Get your live URL like: `https://mentorai-backend.up.railway.app`

Then update `CLIENT_URL` in .env and your frontend's API base URL.

---

## Connect Frontend to Backend

In your `mentorAI.html`, add this at the top of the `<script>`:

```javascript
const API = 'https://your-railway-url.up.railway.app/api';

// Example: login
const res = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await res.json();
localStorage.setItem('token', data.token);

// Example: get mentors
const mentors = await fetch(`${API}/mentors`).then(r => r.json());
```

---

## Next Steps (Scale up)

- [ ] Add WhatsApp notifications (Twilio / MSG91)
- [ ] Add Google Meet API for auto-creating meet links
- [ ] Add admin dashboard (separate React app)
- [ ] Add file upload for profile photos (Cloudinary)
- [ ] Add parent dashboard route
- [ ] Add WebSocket for live session chat
