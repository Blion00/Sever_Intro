const express = require('express');
const { PricingTier } = require('../models');

const router = express.Router();

// GET /api/pricing - public list pricing tiers
router.get('/', async (req, res) => {
  try {
    const tiers = await PricingTier.findAll({
      where: { isActive: true },
      order: [['price', 'ASC']]
    });
    res.json({
      success: true,
      data: { tiers }
    });
  } catch (error) {
    console.error('Error fetching pricing tiers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pricing tiers'
    });
  }
});

module.exports = router;

