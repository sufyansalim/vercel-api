# Dokkani API - Vercel Serverless Functions

This is the production-ready API for Dokkani.co e-commerce app, designed to run on Vercel's serverless platform.

## 📁 Structure

```
vercel-api/
├── api/
│   ├── create-checkout-session.js   # POST - Create Stripe checkout
│   ├── webhook.js                    # POST - Stripe webhook handler
│   └── orders.js                     # GET  - Fetch user orders
├── package.json
├── vercel.json
└── .env.example
```

## 🚀 Deployment to Vercel

### Step 1: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### Step 2: Deploy via GitHub (Recommended)

1. Push this `vercel-api` folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project"
4. Import your repository
5. Set the **Root Directory** to `vercel-api`
6. Click "Deploy"

### Step 3: Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (from Stripe Dashboard) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe Webhooks) |
| `SANITY_PROJECT_ID` | `n56u81sg` |
| `SANITY_DATASET` | `production` |
| `SANITY_TOKEN` | Your Sanity API token |

### Step 4: Configure Stripe Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://your-vercel-app.vercel.app/api/webhook`
4. Select event: `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the signing secret and add to Vercel environment variables

### Step 5: Update React Native App

In your main app's `.env` file:

```env
EXPO_PUBLIC_API_URL=https://your-vercel-app.vercel.app
```

## 📍 API Endpoints

### POST `/api/create-checkout-session`

Creates a Stripe Checkout session.

**Request Body:**
```json
{
  "userId": "user_clerk_id",
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "lineItems": [
    {
      "productId": "product_123",
      "title": "Product Name",
      "image": "https://...",
      "price": 99.99,
      "quantity": 1
    }
  ],
  "total": 99.99,
  "successUrl": "dokkani://checkout/success",
  "cancelUrl": "dokkani://checkout/cancel"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_...",
  "orderNumber": "DK-1234567890-ABC12"
}
```

### POST `/api/webhook`

Handles Stripe webhook events. Creates orders in Sanity when payment is completed.

### GET `/api/orders?userId=xxx`

Fetches all orders for a user from Sanity.

**Response:**
```json
[
  {
    "_id": "order_id",
    "orderNumber": "DK-1234567890-ABC12",
    "status": "paid",
    "total": 99.99,
    "createdAt": "2026-01-15T12:00:00Z",
    "lineItems": [...],
    "shippingAddress": {...}
  }
]
```

## 🔄 Local Development

For local development, use the Node.js Express server in the `/api` folder instead.

```bash
cd api
npm install
node server.js
```

Then use ngrok to expose it for Stripe webhooks (see main README).

## ✅ Benefits of Vercel

- **No server management** - Fully managed
- **Auto-scaling** - Handles traffic spikes
- **Global CDN** - Fast worldwide
- **Free tier** - 100GB bandwidth/month
- **Auto-deploy** - Push to GitHub = deploy
- **Environment variables** - Secure secrets management
