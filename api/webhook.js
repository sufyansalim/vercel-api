/**
 * Vercel Serverless Function: Stripe Webhook Handler
 * 
 * Endpoint: POST /api/webhook
 */

const Stripe = require('stripe');
const { createClient } = require('@sanity/client');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Sanity client
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

// Disable body parsing - we need raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  let rawBody;

  try {
    rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      // Extract data from session metadata
      const metadata = session.metadata;
      const lineItems = JSON.parse(metadata.lineItems || '[]');
      
      // Get shipping details
      const shippingDetails = session.shipping_details || session.customer_details;
      
      // Create order in Sanity
      const order = {
        _type: 'order',
        orderNumber: metadata.orderNumber,
        userId: metadata.userId,
        userEmail: metadata.userEmail,
        userName: metadata.userName,
        lineItems: lineItems.map(item => ({
          _key: Math.random().toString(36).substr(2, 9),
          productId: item.productId,
          productSlug: item.productSlug,
          title: item.title,
          image: item.image,
          quantity: item.quantity,
          price: parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0,
        })),
        shippingAddress: shippingDetails ? {
          name: shippingDetails.name,
          line1: shippingDetails.address?.line1,
          line2: shippingDetails.address?.line2,
          city: shippingDetails.address?.city,
          state: shippingDetails.address?.state,
          postalCode: shippingDetails.address?.postal_code,
          country: shippingDetails.address?.country,
        } : null,
        status: 'paid',
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        total: session.amount_total / 100, // Convert from cents
        currency: session.currency,
        createdAt: new Date().toISOString(),
      };

      const result = await sanityClient.create(order);
      console.log('Order created in Sanity:', result._id);
      
    } catch (err) {
      console.error('Error creating order in Sanity:', err);
      // Don't return error - Stripe will retry
    }
  }

  res.status(200).json({ received: true });
};
