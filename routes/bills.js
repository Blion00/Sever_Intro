const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Bill = require('../models/Bill');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/bills/lookup
// @desc    Public lookup customer by phone number or customer ID
// @access  Public
router.get(
  '/lookup',
  [
    query('identifier')
      .notEmpty()
      .withMessage('Identifier is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const rawIdentifier = String(req.query.identifier || '').trim();

      // Try match by phone (digits only)
      const digits = rawIdentifier.replace(/\D/g, '');
      let user = null;

      if (digits.length >= 9) {
        user = await User.findOne({
          where: { phone: digits },
        });
      }

      // If not found by phone, try by customerId (original string)
      if (!user) {
        user = await User.findOne({
          where: { customerId: rawIdentifier },
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            'Thông tin không chính xác. Vui lòng kiểm tra lại số điện thoại hoặc mã khách hàng.',
        });
      }

      // Lấy hóa đơn mới nhất của khách (nếu có)
      let latestBill = null;
      try {
        latestBill = await Bill.findOne({
          where: { customerId: user.customerId },
          order: [['createdAt', 'DESC']],
        });
      } catch (billError) {
        console.error('Fetch latest bill error:', billError);
      }

      return res.json({
        success: true,
        message: 'Khách hàng hợp lệ',
        data: {
          customer: {
            id: user.id,
            fullName: user.fullName,
            phone: user.phone,
            customerId: user.customerId,
          },
          bill: latestBill
            ? {
                id: latestBill.id,
                billNumber: latestBill.billNumber,
                status: latestBill.status,
                total:
                  latestBill.amounts && latestBill.amounts.total
                    ? latestBill.amounts.total
                    : 0,
                dueDate: latestBill.dueDate,
              }
            : null,
        },
      });
    } catch (error) {
      console.error('Lookup customer by identifier error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   GET /api/bills
// @desc    Get bills for current user or all bills (admin)
// @access  Private
router.get('/', [
  auth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'paid', 'overdue', 'cancelled']).withMessage('Invalid status'),
  query('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('Invalid year')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    // If not admin, only show user's bills
    if (req.user.role !== 'admin') {
      query.customerId = req.user.customerId;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by year
    if (req.query.year) {
      const year = parseInt(req.query.year);
      query['billingPeriod.from'] = {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      };
    }

    // Search by bill number or customer name
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { billNumber: searchRegex },
        { 'customerInfo.fullName': searchRegex }
      ];
    }

    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'fullName email');

    const total = await Bill.countDocuments(query);

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/bills/:id
// @desc    Get single bill
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Check if user can access this bill
    if (req.user.role !== 'admin' && bill.customerId !== req.user.customerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { bill }
    });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/bills/customer/:customerId
// @desc    Get bills by customer ID
// @access  Private
router.get('/customer/:customerId', [
  auth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { customerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check access permission
    if (req.user.role !== 'admin' && req.user.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const bills = await Bill.find({ customerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Bill.countDocuments({ customerId });

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get customer bills error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/bills
// @desc    Create new bill
// @access  Private (Admin only)
router.post('/', [
  adminAuth,
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  body('billingPeriod.from').isISO8601().withMessage('Valid billing period start date is required'),
  body('billingPeriod.to').isISO8601().withMessage('Valid billing period end date is required'),
  body('waterUsage.previousReading').isNumeric().withMessage('Previous reading must be a number'),
  body('waterUsage.currentReading').isNumeric().withMessage('Current reading must be a number'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      customerId,
      customerInfo,
      billingPeriod,
      waterUsage,
      rates,
      dueDate,
      meterInfo,
      notes
    } = req.body;

    // Verify customer exists
    const customer = await User.findOne({ customerId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Calculate consumption
    const consumption = waterUsage.currentReading - waterUsage.previousReading;
    if (consumption < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current reading cannot be less than previous reading'
      });
    }

    const billData = {
      customerId,
      customerInfo: customerInfo || {
        fullName: customer.fullName,
        address: customer.address,
        phone: customer.phone,
        email: customer.email
      },
      billingPeriod,
      waterUsage: {
        ...waterUsage,
        consumption
      },
      rates: rates || {
        baseRate: 0,
        consumptionRate: 5000, // VND per cubic meter
        serviceFee: 50000,
        environmentalFee: 10000
      },
      dueDate,
      meterInfo,
      notes,
      createdBy: req.user._id
    };

    const bill = new Bill(billData);
    await bill.save();

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: { bill }
    });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/bills/:id/status
// @desc    Update bill status
// @access  Private (Admin only)
router.put('/:id/status', [
  adminAuth,
  body('status').isIn(['pending', 'paid', 'overdue', 'cancelled']).withMessage('Invalid status'),
  body('paymentInfo').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, paymentInfo } = req.body;

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    bill.status = status;
    
    if (paymentInfo) {
      bill.paymentInfo = {
        ...bill.paymentInfo,
        ...paymentInfo,
        paidAt: status === 'paid' ? new Date() : bill.paymentInfo.paidAt
      };
    }

    await bill.save();

    res.json({
      success: true,
      message: 'Bill status updated successfully',
      data: { bill }
    });
  } catch (error) {
    console.error('Update bill status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/bills/stats/summary
// @desc    Get billing statistics
// @access  Private (Admin only)
router.get('/stats/summary', adminAuth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Get current month stats
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

    const [
      totalBills,
      pendingBills,
      paidBills,
      overdueBills,
      currentMonthBills,
      currentMonthRevenue
    ] = await Promise.all([
      Bill.countDocuments(),
      Bill.countDocuments({ status: 'pending' }),
      Bill.countDocuments({ status: 'paid' }),
      Bill.countDocuments({ status: 'overdue' }),
      Bill.countDocuments({
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
      }),
      Bill.aggregate([
        {
          $match: {
            status: 'paid',
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amounts.total' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalBills,
        pendingBills,
        paidBills,
        overdueBills,
        currentMonthBills,
        currentMonthRevenue: currentMonthRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get billing stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
