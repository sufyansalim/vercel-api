/**
 * Vercel Serverless Function: Create Stripe Checkout Session
 * 
 * Endpoint: POST /api/create-checkout-session
 */

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to parse price from various formats
const parsePrice = (price) => {
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    return parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
  }
  return 0;
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userEmail, userName, lineItems, total, successUrl, cancelUrl } = req.body;

    if (!userId || !lineItems || lineItems.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Stripe line items
    const stripeLineItems = lineItems.map(item => {
      const price = parsePrice(item.numericPrice || item.price);
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title,
            images: item.image ? [item.image] : [],
            metadata: {
              productId: item.productId,
              productSlug: item.productSlug,
            },
          },
          unit_amount: Math.round(price * 100), // Stripe uses cents
        },
        quantity: item.quantity || 1,
      };
    });

    // Generate order number
    const orderNumber = `DK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: stripeLineItems,
      customer_email: userEmail,
      shipping_address_collection: {
        allowed_countries: ['US', 'QA', 'AE', 'SA', 'KW', 'BH', 'OM'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency: 'usd',
            },
            display_name: 'Standard shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1500, // $15
              currency: 'usd',
            },
            display_name: 'Express shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 1 },
              maximum: { unit: 'business_day', value: 3 },
            },
          },
        },
      ],
      success_url: successUrl || `dokkani://checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `dokkani://checkout/cancel`,
      metadata: {
        userId,
        userEmail,
        userName,
        orderNumber,
        lineItems: JSON.stringify(lineItems),
      },
    });

    res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id,
      orderNumber,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
};
