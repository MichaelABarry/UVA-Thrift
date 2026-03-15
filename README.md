# UVA Thrift

UVA-only local marketplace app with:
- Node.js + TypeScript backend (Express)
- React + Vite frontend
- PostgreSQL database

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

Make sure the `createdb-18` binary is added to $PATH

```bash
createdb-18 uva_thrift_dev
cd server && npm run migrate
```

---

## 4) Create your Local `.env` file

Copy `.env.example` into `.env` in `server` and `client` directories:

```bash
cp .env.example .env
```

Copy the output of this command into the `SESSION_SECRET` variable in `server/.env`:

```bash
openssl rand -hex 64
```

---

## 5) SMTP setup (required for real email verification)

The app sends verification links by email. We use **Brevo** via SMTP.

You'll need to update the .env with the following:
- `SMTP_HOST` (usually smtp-relay.brevo.com)
- `SMTP_PORT` (587)
- `SMTP_USER` (your Brevo login email)
- `SMTP_PASS` (your Brevo SMTP master password)
- `SMTP_FROM` (Verified sender email address)

### Important note for local testing

For local testing, you can leave these values as-is and the backend server will log the verification link to the console instead of sending it in an email. For production, configure an SMTP client and fill in the environment variables above.

---

## 6) Connect the app to an S3 bucket for listing images

The backend uploads listing images to S3 and stores the resulting image URL in the database. To make that work, you need all of the following:

### A. Create an S3 bucket

1. Sign in to AWS and open S3.
2. Create a bucket in the region you want to use.
3. Keep the bucket name and region. You will place both into `server/.env`.

### B. Make uploaded images publicly viewable

The frontend displays images using direct URLs returned by the backend, so uploaded objects must be publicly readable.

You have two supported options:

1. Use a public S3 bucket and let the app build URLs like `https://<bucket>.s3.<region>.amazonaws.com/<key>`.
2. Use CloudFront or another public CDN/domain in front of the bucket and set `S3_PUBLIC_BASE_URL` to that public base URL.

If you use a public bucket directly, add a bucket policy like this and replace `YOUR_BUCKET_NAME` with your actual bucket name:

```json
{
   "Version": "2012-10-17",
   "Statement": [
      {
         "Sid": "PublicReadForListingImages",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      }
   ]
}
```

If your bucket has Block Public Access fully enabled, this public-read approach will not work until you adjust that setting or serve the files through CloudFront instead.

### C. Create AWS credentials for the backend

The server uses the AWS SDK default credential chain. For local development, the simplest approach is environment variables.

Create an IAM user or role with permission to upload and delete objects in your bucket. At minimum, the backend needs:

```json
{
   "Version": "2012-10-17",
   "Statement": [
      {
         "Effect": "Allow",
         "Action": [
            "s3:PutObject",
            "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      }
   ]
}
```

For local development, expose these credentials to the server process with standard AWS environment variables:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` if you are using temporary credentials

### D. Add the S3 settings to `server/.env`

In `server/.env`, add:

```env
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
S3_PUBLIC_BASE_URL=https://your-bucket-name.s3.us-east-1.amazonaws.com
```

Notes:

- `AWS_REGION` is required.
- `S3_BUCKET_NAME` is required.
- `S3_PUBLIC_BASE_URL` is optional. If you leave it out, the backend will generate public URLs in the format `https://<bucket>.s3.<region>.amazonaws.com/<key>`.
- `S3_PUBLIC_BASE_URL` should point to a public URL that browsers can load, such as a CloudFront distribution or a public S3 bucket endpoint.

### E. Make sure your AWS credentials are available when the server runs

One workable local setup is exporting them in the shell before starting the app:

```bash
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
# only if needed
export AWS_SESSION_TOKEN=your_session_token
```

Then start the app normally:

```bash
npm run dev
```

### F. Run the listing image migration

If your database already existed before image support was added, run the server migration again so the `listings` table gets the `image_url` and `image_key` columns:

```bash
cd server
npm run migrate
```

### G. Verify it works

1. Start the app.
2. Log in with a verified UVA account.
3. Create a listing and choose an image file.
4. Submit the listing.
5. Confirm the image appears on the marketplace page and in My Items.

If listing creation fails with `Listing image uploads are not configured.`, the server is missing `AWS_REGION` or `S3_BUCKET_NAME`.

---

## 7) Start the app locally

```bash
npm run dev
```

This starts:
- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

---

## 8) Test the full login flow (exact steps)

1. Open `http://localhost:5173`
2. Click **Register**
3. Register with an address ending in `@virginia.edu`
4. Check verification link:
   - If SMTP is configured: check inbox
   - If SMTP not configured: copy link from backend terminal
5. Open the verification link
6. Return to login page and sign in with same email/password
7. You should now see the basic **Profile** page

### Expected behavior:
- Non-`@virginia.edu` email is rejected
- Unverified users cannot log in
- Verified users can log in and access profile

---

## 9) Current auth API endpoints

- `POST /api/auth/register`
- `POST /api/auth/resend-verification`
- `GET /api/auth/verify-email?token=...`
- `POST /api/auth/login`
- `GET /api/auth/me` (requires `Authorization: Bearer <jwt>`)
- `GET /api/health`