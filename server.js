// ============================================================
//  IGNITE — Backend Server
//  Handles Paystack & Flutterwave payment APIs securely.
//  Supports: Credit/Debit Card, Apple Pay, Bank Transfer
//
//  🔑 IMPORTANT: Put your real API keys in the .env file!
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the static frontend files
// 🔒 SECURITY: Block access to sensitive files
app.use((req, res, next) => {
  const blocked = ['.env', 'package.json', 'package-lock.json', 'server.js'];
  if (blocked.some(file => req.path.includes(file))) {
    return res.status(403).send('Access Denied');
  }
  next();
});
app.use(express.static(path.join(__dirname, '.')));

// ── API Keys ────────────────────────────────────────────────
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || '';

const paystackHeaders = {
  Authorization: `Bearer ${PAYSTACK_SECRET}`,
  'Content-Type': 'application/json',
};
const flutterwaveHeaders = {
  Authorization: `Bearer ${FLUTTERWAVE_SECRET}`,
  'Content-Type': 'application/json',
};

// ── Helper: Generate unique ref ─────────────────────────────
function txRef() {
  return `IGN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
//  PAYSTACK ENDPOINTS
// ============================================================

// 1. Create Subaccount (Seller's bank receives split payments)
app.post('/api/paystack/subaccount', async (req, res) => {
  const { business_name, settlement_bank, account_number } = req.body;

  if (!business_name || !settlement_bank || !account_number) {
    return res.status(400).json({ error: 'Missing required fields: business_name, settlement_bank, account_number' });
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/subaccount',
      {
        business_name,
        settlement_bank,
        account_number,
        percentage_charge: 5, // Ignite platform takes 5% commission
        description: `Ignite seller: ${business_name}`,
      },
      { headers: paystackHeaders }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Paystack subaccount error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create subaccount', details: error.response?.data });
  }
});

// 2. List Nigerian Banks (Helpful for sellers to find their bank code)
app.get('/api/paystack/banks', async (req, res) => {
  try {
    const response = await axios.get('https://api.paystack.co/bank', { headers: paystackHeaders });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bank list' });
  }
});

// 3. Verify Bank Account Number
app.get('/api/paystack/verify-account', async (req, res) => {
  const { account_number, bank_code } = req.query;
  try {
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      { headers: paystackHeaders }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Could not verify account', details: error.response?.data });
  }
});

// 4. Checkout — Marketplace Purchase (Split Payment to seller + platform fee)
app.post('/api/paystack/checkout', async (req, res) => {
  const { email, amount, subaccount_code } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ error: 'Missing email or amount' });
  }

  try {
    const payload = {
      email,
      amount: Math.round(amount * 100), // kobo/cents
      channels: ['card', 'apple_pay', 'bank', 'ussd', 'bank_transfer'],
      callback_url: `${req.protocol}://${req.get('host')}/index.html?payment=success`,
      reference: txRef(),
    };

    // Split payment: seller gets their cut, platform gets commission
    if (subaccount_code) {
      payload.subaccount = subaccount_code;
    }

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      payload,
      { headers: paystackHeaders }
    );

    res.json({
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference,
    });
  } catch (error) {
    console.error('Paystack checkout error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initiate payment', details: error.response?.data });
  }
});

// 5. Subscription — User Pays YOU to setup their website/store
app.post('/api/paystack/subscription', async (req, res) => {
  const { email, plan_name } = req.body;

  // Pricing tiers (amount in kobo for NGN, or cents for USD)
  const plans = {
    starter: { amount: 500000, label: 'Starter Plan — ₦5,000' },
    pro:     { amount: 1500000, label: 'Pro Plan — ₦15,000' },
    elite:   { amount: 5000000, label: 'Elite Plan — ₦50,000' },
  };

  const plan = plans[plan_name] || plans.starter;

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: plan.amount,
        // NO subaccount — 100% of this goes to YOUR bank account
        channels: ['card', 'apple_pay', 'bank', 'bank_transfer'],
        callback_url: `${req.protocol}://${req.get('host')}/signin.html?subscribed=true`,
        reference: txRef(),
        metadata: {
          plan_name,
          plan_label: plan.label,
          custom_fields: [
            { display_name: 'Plan', variable_name: 'plan', value: plan.label },
          ],
        },
      },
      { headers: paystackHeaders }
    );

    res.json({
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference,
      plan: plan.label,
    });
  } catch (error) {
    console.error('Subscription error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create subscription payment' });
  }
});

// 6. Verify a transaction
app.get('/api/paystack/verify/:reference', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      { headers: paystackHeaders }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ============================================================
//  FLUTTERWAVE ENDPOINTS (Alternative processor)
// ============================================================

// 7. Flutterwave Checkout (Standard)
app.post('/api/flutterwave/checkout', async (req, res) => {
  const { email, amount, name, subaccount_id } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ error: 'Missing email or amount' });
  }

  try {
    const payload = {
      tx_ref: txRef(),
      amount,
      currency: 'NGN',
      redirect_url: `${req.protocol}://${req.get('host')}/index.html?payment=success`,
      payment_options: 'card,mobilemoney,ussd,banktransfer,applepay',
      customer: { email, name: name || 'Ignite Customer' },
      customizations: {
        title: 'Ignite Marketplace',
        description: 'Payment for products on Ignite',
        logo: 'https://placehold.co/100x100/0a0a0a/5d5dff?text=🔥',
      },
    };

    // Split payment for Flutterwave
    if (subaccount_id) {
      payload.subaccounts = [{ id: subaccount_id }];
    }

    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      payload,
      { headers: flutterwaveHeaders }
    );

    res.json({ authorization_url: response.data.data.link });
  } catch (error) {
    console.error('Flutterwave checkout error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Flutterwave payment failed', details: error.response?.data });
  }
});

// 8. Flutterwave Create Subaccount (For sellers)
app.post('/api/flutterwave/subaccount', async (req, res) => {
  const { account_bank, account_number, business_name, business_email, split_value } = req.body;

  try {
    const response = await axios.post(
      'https://api.flutterwave.com/v3/subaccounts',
      {
        account_bank,
        account_number,
        business_name,
        business_email,
        country: 'NG',
        split_type: 'percentage',
        split_value: split_value || 95, // Seller gets 95%, you keep 5%
      },
      { headers: flutterwaveHeaders }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Flutterwave subaccount error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create Flutterwave subaccount' });
  }
});

// 9. Flutterwave Subscription Payment (User pays YOU)
app.post('/api/flutterwave/subscription', async (req, res) => {
  const { email, plan_name, name } = req.body;

  const plans = {
    starter: { amount: 5000, label: 'Starter — ₦5,000' },
    pro:     { amount: 15000, label: 'Pro — ₦15,000' },
    elite:   { amount: 50000, label: 'Elite — ₦50,000' },
  };

  const plan = plans[plan_name] || plans.starter;

  try {
    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: txRef(),
        amount: plan.amount,
        currency: 'NGN',
        redirect_url: `${req.protocol}://${req.get('host')}/signin.html?subscribed=true`,
        payment_options: 'card,banktransfer,applepay',
        customer: { email, name: name || 'New Seller' },
        // NO subaccount — 100% goes to YOUR Flutterwave balance
        customizations: {
          title: 'Ignite Platform Subscription',
          description: plan.label,
          logo: 'https://placehold.co/100x100/0a0a0a/5d5dff?text=🔥',
        },
      },
      { headers: flutterwaveHeaders }
    );

    res.json({ authorization_url: response.data.data.link, plan: plan.label });
  } catch (error) {
    console.error('FW subscription error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create FW subscription payment' });
  }
});

// 10. Flutterwave Verify Transaction
app.get('/api/flutterwave/verify/:id', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${req.params.id}/verify`,
      { headers: flutterwaveHeaders }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Flutterwave verification failed' });
  }
});

// ============================================================
//  START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🔥 Ignite Server running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`Paystack key: ${PAYSTACK_SECRET ? '✅ Loaded' : '❌ Missing — add to .env'}`);
  console.log(`Flutterwave key: ${FLUTTERWAVE_SECRET ? '✅ Loaded' : '❌ Missing — add to .env'}`);
  console.log(`========================================\n`);
});
