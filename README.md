# UVA Thrift

UVA Thrift is a marketplace specifically designed for college students with the goal of reducing end of year
waste. Every year, students graduate, move, or otherwise have reason to throw away items that they own (furniture,
clothing, school supplies, etc.) At the same time, other students are beginning their college career, and others still
are in need of furniture, clothing, school supplies, etc. While some students make the effort to donate or sell their
belongings, it is our opinion that the existing infrastructure for facilitating these processes is not sufficient, and
leads the majoirty of students to take the easy way out, turning to disposal rather than recycling. UVA Thrift aims
to simplify this process by providing students with a straightforward platform to market their own items and browse those
of other students. Moreover, we added integration with HoosReUse, UVA's donation initiative, to prompt students to donate
their items if they are not able to sell them on our platform. Our hope is that UVA Thrift reduces the barrier of entry
to recycling items and results in less waste every school year.

### Contributors

- Caden Kowalski (gpm9un)
- Wadie Abboud (ucu8tt)
- Michael Barry (mpy8fu)

### Production Link
https://uva-thrift-c085564027b1.herokuapp.com/

### Tech Stack

- Node.js + TypeScript backend (Express)
- React + Vite frontend
- PostgreSQL database
- Hosting on Heroku

---

# Test production user account

Since our application only accepts ```@virginia.edu``` email addresses, we can't make a true dummy account. Thus, for testing, if you are unable to create your own account, you can login with the following credentials:

- Username: ```gpm9un@virginia.edu```
- Password: ```ILoveUVA```

---

# Steps to Spin Up Development Server

## 1) What you need installed

1. **Node.js 22.x**
2. **npm 11.x**
3. **PostgreSQL** server running locally (for development):

For Homebrew on Mac:
```bash
brew install postgresql@18
brew services start postgresql@18
```

To check versions:

```bash
node -v
npm -v
psql --version
```

---

## 2) Install project dependencies

From the project root:

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

---

## 3) Create local PostgreSQL database

Make sure the `createdb-18` binary is added to $PATH. The database must be named ```uva_thrift```. Then navigate into the server directory and run the migrate script to set up the database.

```bash
createdb-18 uva_thrift
cd server && npm run migrate
```

---

## 4) Create your local `.env` files

Copy `.env.example` into `.env` in `server` and `client` directories:

```bash
cd client && cp .env.example .env && cd ..
cd server && cp .env.example .env && cd ..
```

Copy the output of this command into the `SESSION_SECRET` variable in `server/.env`:

```bash
openssl rand -hex 64
```

You will need to get the following environment variables from someone on the development team:
- ```SMTP_USER```
- ```SMTP_PASS```
- ```AWS_ACCESS_KEY_ID```
- ```AWS_SECRET_ACCESS_KEY```

All other values may be left as-is. The app sends verification links by email through **Brevo** via SMTP. If you are running the server locally and have not configured the SMTP credentials listed above, email verification links will be logged to the console.

---

## 7) Start the app locally

```bash
npm run dev
```

This starts:
- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

---

## 8) Steps to login

1. Open `http://localhost:5173`
2. Click **Register**
3. Register with an address ending in `@virginia.edu`
4. Check verification link:
   - If SMTP is configured: check inbox
   - If SMTP not configured: copy link from backend terminal
5. Open the verification link
6. Return to login page and sign in with same email/password

### Expected behavior:
- Non-`@virginia.edu` email is rejected
- Unverified users cannot log in
- Verified users can log in and access profile

## 9) Other usage instructions

Here are a few things you can do in the app:

1. Browse listings that others have posted on the home page. You can search, sort, and filter to narrow down displayed listings. You can also report suspicious  or inappropriate listings by clicking the "!" button.
2. Create an item listing by clicking the "+ New Item" button in the navigation bar.
3. Click on an item listing to view the item's detail page. From here, you can sign up for email notifications if the listing is modified or deleted, or message the owner if you have a question or are interested in the item.
4. Click on the profile button in the navigation bar and click Lists in the sidebar. From here, you can create and modify custom lists to track coherent sets of items. On the home page, you can click the plus button on any listing to add it to one of your lists.
5. From the profile page, click Alerts in the sidebar. From here, you can view and modify items you are watching, as well as create custom alerts to receive emails if items are listed that match your criteria.
6. From the profile page, click My Items in the sidebar. From here, you can view and mofify the items that you have listed.
7. From the profile page, click General in the sidebar. From here, you can view and modify general information about your profile. Set the phone number, display name, and venmo information to be able to share them when messaging with other users.
8. On the messages page, you can view any conversations you are having with other users. The messages page will also display notifications for in-app processes. Click on a thread to chat with the owner of an item, share contact information, and suggest an exchange location.
9. Click on the HoosReUse tab in the navigation bar to view information about the HoosReUse initiative and find more information on their website.
10. When creating an item listing, you can set an "expiration window" such that you will be prompted to donate your item through HoosReUse if it does not sell on UVA Thrift within that window.

---

# Sources
We used ChatGPT and Claude for much of the UI styling, as well as implementing some of the more complex backend features (like authentication).