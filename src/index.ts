import { config } from "dotenv"; // Import dotenv to load environment variables
import { Hono } from "hono"; // Import Hono
import { cors } from "hono/cors";
import QRCode from "qrcode"; // Import QRCode for generating QR codes
import Stripe from "stripe"; // Import Stripe for payment processing
// Load environment variables from .env file
config();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_KEY as string);

const app = new Hono();
app.use(
  cors({
    origin: "https://qr-pay-bun-frontend.vercel.app",
  })
);
// Endpoint to create a Stripe Checkout Session and generate a QR code
app.post("/create-checkout-session", async (c) => {
  const { amount, currency } = await c.req.json();

  try {
    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: "QR Code Payment",
            },
            unit_amount: amount * 100, // Stripe requires amounts in the smallest unit of currency (e.g., cents)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:5173/success", // URL after successful payment
      cancel_url: "http://localhost:5173/cancel", // URL if payment is canceled
    });

    // Generate QR code that directs the user to the Checkout Session URL
    const qrCodeData = await QRCode.toDataURL(session.url!);
    console.log(session.id);

    // Respond with the QR code and session ID
    return c.json({ qrCode: qrCodeData, sessionId: session.id });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to create payment session" }, 500);
  }
});

// Serve the success and cancel pages
app.get("/success", (c) => {
  return c.text("Payment Successful!");
});

app.get("/cancel", (c) => {
  return c.text("Payment Canceled");
});

export default app;
