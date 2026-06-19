const express = require('express');
const axios = require('axios');
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @GET /api/clients
router.get('/', protect, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { client_name: { $regex: search, $options: 'i' } },
        { gst_number: { $regex: search, $options: 'i' } },
        { trade_name: { $regex: search, $options: 'i' } },
      ];
    }
    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Client.countDocuments(query);
    res.json({ success: true, data: clients, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/clients/gst/:gstNumber - Look up by GST, check DB first then API
router.get('/gst/:gstNumber', protect, async (req, res) => {
  try {
    const { gstNumber } = req.params;
    const gstUpper = gstNumber.toUpperCase().trim();

    // ── 1. Check local DB first ──────────────────────────────────────────────
    const existing = await Client.findOne({ gst_number: gstUpper });
    if (existing) {
      return res.json({ success: true, data: existing, source: 'local' });
    }

    // ── 2. Call real GST API ─────────────────────────────────────────────────
    const GST_API_BASE = process.env.GSTAPI;
    if (!GST_API_BASE) {
      return res.status(500).json({ success: false, message: 'GST API URL not configured in .env (GSTAPI)' });
    }

    let apiData;
    try {
      const response = await axios.get(`${GST_API_BASE}${gstUpper}`, { timeout: 10000 });
      const body = response.data;

      // API returns { flag: true/false, message: '...', data: { ... } }
      if (!body.flag || !body.data) {
        return res.status(404).json({
          success: false,
          message: body.message || 'GST number not found or inactive',
        });
      }
      apiData = body.data;
    } catch (apiErr) {
      const status = apiErr?.response?.status;
      const msg = apiErr?.response?.data?.message || apiErr.message;
      return res.status(status || 502).json({
        success: false,
        message: `GST API error: ${msg}`,
      });
    }

    // ── 3. Map API response fields ────────────────────────────────────────────
    /*
      Key reference (short → meaning):
        lgnm       → Legal Name of Business
        tradeNam   → Trade Name
        pradr.adr  → Principal Place of Address (full string)
        pradr.addr.stcd → State name
        gstin      → GST Number
        sts        → GST Status  (Active / Cancelled etc.)
        dty        → Taxpayer Type  (Regular, Composition, etc.)
        rgdt       → Registration Date
        ctb        → Constitution of Business  (Partnership, Pvt Ltd …)
        stj        → State Jurisdiction string
    */
    const addr = apiData.pradr?.addr || {};
    const stateCode = gstUpper.substring(0, 2);   // first 2 digits of GSTIN = state code

    // Build a clean address string from the structured addr object
    const addressParts = [
      addr.flno, addr.bno, addr.bnm, addr.st,
      addr.loc, addr.dst, addr.stcd, addr.pncd,
    ].filter(Boolean);
    const fullAddress = addressParts.length
      ? addressParts.join(', ')
      : (apiData.pradr?.adr || '');

    const clientPayload = {
      gst_number:   apiData.gstin   || gstUpper,
      client_name:  apiData.lgnm    || apiData.tradeNam || '',
      trade_name:   apiData.tradeNam || apiData.lgnm    || '',
      address:      fullAddress,
      state:        addr.stcd       || '',
      state_code:   stateCode,
      gst_status:   apiData.sts     || 'Unknown',
      is_gst_registered: true,
    };

    // ── 4. Save to local DB (upsert) so next lookup is instant ───────────────
    const savedClient = await Client.findOneAndUpdate(
      { gst_number: clientPayload.gst_number },
      clientPayload,
      { upsert: true, new: true, runValidators: true }
    );

    return res.json({
      success: true,
      data: savedClient,
      source: 'api',
      message: `GST data fetched from API and saved. Status: ${apiData.sts}`,
      // Extra info the frontend might want to display
      extra: {
        dty:  apiData.dty  || '',   // Taxpayer type
        ctb:  apiData.ctb  || '',   // Constitution of Business
        rgdt: apiData.rgdt || '',   // Registration Date
        stj:  apiData.stj  || '',   // State Jurisdiction
        nba:  apiData.nba  || [],   // Nature of Business Activities
        einvoiceStatus: apiData.einvoiceStatus || '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/clients
router.post('/', protect, async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'GST number already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/clients/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/clients/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
