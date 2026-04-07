# DD_WAD2_CW

Yoga booking app built with Express, Mustache, and NeDB.

## 1. Clone the repo

```bash
git clone https://github.com/Delfland/DD_WAD2_CW.git
cd DD_WAD2_CW
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create environment file

This project requires `ACCESS_TOKEN_SECRET`.

Create a `.env` file in the project root:

```env
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
PORT=3000
```

## 4. Seed the database

Run the seed script to create users, courses, sessions, and bookings:

```bash
npm run seed
```

## 5. Run the app on localhost

```bash
npm start
```

Then open:

- http://localhost:3000

## Seed login credentials

- Seed user:
  - Email: `fiona@student.local`
  - Password: `user-password`

- Seed admin:
  - Email: `ava@yoga.local`
  - Password: `admin-password`


