# MagiliniFarms

Vue 3 frontend and Node.js/Express backend for the MagiliniFarms commerce platform.

## Project Structure

```text
magilini-farms/
├── backend/
└── frontend/
```

## Backend Setup

```bash
cd backend
npm install
# Review .env.development, .env.test, and .env.production
npm run dev       # Starts development on port 5000
npm run test      # Starts testing on port 5001
npm run start     # Starts production configuration
```

## Frontend Setup

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:5000/api" > .env
npm run dev
```

## Environment Configuration

The backend uses one file per environment:

| File | Purpose | Database |
|---|---|---|
| `backend/.env.development` | Development | `magilinifarms_dev` |
| `backend/.env.test` | Local testing | `magilinifarms_test` |
| `backend/.env.production` | Production | `magilinifarms_prod` |

Available backend scripts:

```bash
cd backend
npm run dev
npm run test
npm run start
npm run seed -- --force
```

Each startup prints the active environment and selected database before the MongoDB connection is opened.

Seed safety is manual and never runs automatically. Use:

```bash
npm run seed -- --force
```

Seed safety:

- Requires `ENABLE_SEED=true`
- Requires `--force`
- Always blocked in `production`
- Never inserts bundled sample catalog data
- Never deletes existing environment data
- Reports whether the target database already contains real data

## Backend Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string for the active environment |
| `DB_NAME` | MongoDB database name for the active environment |
| `ENABLE_SEED` | Enables manual seed command when set to `true` |
| `PORT` | API port for the active environment |
| `API_BASE_URL` | Canonical API base URL for the active environment |
| `FRONTEND_URL` | Allowed frontend origin for CORS |
| `JWT_SECRET` | JWT signing secret |
| `RAZORPAY_KEY_ID` | Razorpay key id |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `ADMIN_WA_NUMBER` | Admin WhatsApp number with country code |

## Admin Access

```text
URL:      http://localhost:5173/admin/login
Login:    admin@magilinifarms.in
Password: admin123
```

Admin access must come from the real database for the selected environment. No bundled sample admin seed is applied automatically.

## Deployment

Frontend deployment:

```bash
cd frontend
npm run build
```

Backend deployment:

```text
1. Push backend/ to GitHub
2. Create the hosted service
3. Install dependencies with npm install
4. Start with npm run start
5. Configure backend/.env.production values in the host environment
```

MongoDB deployment target:

```text
Use the existing Atlas cluster
Use magilinifarms_prod for production
```
