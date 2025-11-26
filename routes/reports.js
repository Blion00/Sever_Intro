const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Report = require('../models/Report');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/reports
// @desc    Create new report
// @access  Private
router.post('/', [
  auth,
  upload.array('attachments', 5), // Max 5 files
  body('reportType')
    .isIn(['water_leak', 'water_quality', 'no_water', 'low_pressure', 'meter_issue', 'billing_issue', 'other'])
    .withMessage('Invalid report type'),
  body('title')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('location.address')
    .notEmpty()
    .withMessage('Location address is required'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level')
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
      reportType,
      title,
      description,
      location,
      priority,
      isPublic
    } = req.body;

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
    }

    const reportData = {
      customerId: req.user.customerId,
      customerInfo: {
        fullName: req.user.fullName,
        phone: req.user.phone,
        email: req.user.email,
        address: req.user.address
      },
      reportType,
      title,
      description,
      location,
      priority: priority || 'medium',
      attachments,
      isPublic: isPublic === 'true'
    };

    const report = new Report(reportData);
    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports
// @desc    Get reports (user's own or all for admin)
// @access  Private
router.get('/', [
  auth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['submitted', 'under_review', 'in_progress', 'resolved', 'closed', 'rejected']),
  query('reportType').optional().isIn(['water_leak', 'water_quality', 'no_water', 'low_pressure', 'meter_issue', 'billing_issue', 'other']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
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
    
    // If not admin, only show user's reports
    if (req.user.role !== 'admin') {
      query.customerId = req.user.customerId;
    }

    // Apply filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.reportType) query.reportType = req.query.reportType;
    if (req.query.priority) query.priority = req.query.priority;

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { reportNumber: searchRegex }
      ];
    }

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'fullName email phone')
      .populate('resolution.resolvedBy', 'fullName email');

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/:id
// @desc    Get single report
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('assignedTo', 'fullName email phone')
      .populate('resolution.resolvedBy', 'fullName email')
      .populate('internalNotes.addedBy', 'fullName email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check access permission
    if (req.user.role !== 'admin' && report.customerId !== req.user.customerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/reports/:id/status
// @desc    Update report status
// @access  Private (Admin/Staff only)
router.put('/:id/status', [
  auth,
  body('status')
    .isIn(['submitted', 'under_review', 'in_progress', 'resolved', 'closed', 'rejected'])
    .withMessage('Invalid status'),
  body('note').optional().isString()
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

    // Check if user can update status
    if (req.user.role === 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { status, note } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.status = status;

    // Add internal note if provided
    if (note) {
      report.internalNotes.push({
        note,
        addedBy: req.user._id
      });
    }

    // Set resolution date if status is resolved
    if (status === 'resolved' && !report.actualResolution) {
      report.actualResolution = new Date();
    }

    await report.save();

    res.json({
      success: true,
      message: 'Report status updated successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/reports/:id/assign
// @desc    Assign report to staff member
// @access  Private (Admin only)
router.put('/:id/assign', [
  adminAuth,
  body('assignedTo').isMongoId().withMessage('Valid staff ID is required')
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

    const { assignedTo } = req.body;

    // Verify staff member exists
    const staff = await User.findById(assignedTo);
    if (!staff || (staff.role !== 'admin' && staff.role !== 'staff')) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.assignedTo = assignedTo;
    await report.save();

    res.json({
      success: true,
      message: 'Report assigned successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Assign report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/reports/:id/resolution
// @desc    Add resolution details
// @access  Private (Admin/Staff only)
router.put('/:id/resolution', [
  auth,
  body('description').notEmpty().withMessage('Resolution description is required'),
  body('actions').isArray().withMessage('Actions must be an array'),
  body('cost').optional().isNumeric().withMessage('Cost must be a number')
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

    // Check if user can add resolution
    if (req.user.role === 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { description, actions, materials, cost } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.resolution = {
      description,
      actions,
      materials: materials || [],
      cost: cost || 0,
      resolvedBy: req.user._id,
      resolvedAt: new Date()
    };

    report.status = 'resolved';
    report.actualResolution = new Date();

    await report.save();

    res.json({
      success: true,
      message: 'Resolution added successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Add resolution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/stats/summary
// @desc    Get report statistics
// @access  Private (Admin only)
router.get('/stats/summary', adminAuth, async (req, res) => {
  try {
    const [
      totalReports,
      pendingReports,
      inProgressReports,
      resolvedReports,
      overdueReports
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: 'submitted' }),
      Report.countDocuments({ status: 'in_progress' }),
      Report.countDocuments({ status: 'resolved' }),
      Report.countDocuments({
        status: { $in: ['submitted', 'under_review', 'in_progress'] },
        estimatedResolution: { $lt: new Date() }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports,
        overdueReports
      }
    });
  } catch (error) {
    console.error('Get report stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
