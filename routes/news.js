const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { News, User } = require('../models');
const { Op } = require('sequelize');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// @route   GET /api/news
// @desc    Get published news articles
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('category').optional().isIn(['announcement', 'maintenance', 'service_update', 'community', 'tips', 'emergency']),
  query('featured').optional().isBoolean(),
  query('search').optional().isString()
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
    const offset = (page - 1) * limit;

    // Build where for published news only
    const now = new Date();
    const where = {
      status: 'published',
      publishedAt: { [Op.lte]: now },
      [Op.or]: [
        { expiresAt: { [Op.is]: null } },
        { expiresAt: { [Op.gt]: now } }
      ]
    };

    // Apply filters
    if (req.query.category) where.category = req.query.category;
    if (req.query.featured === 'true') where.isFeatured = true;

    // Search functionality
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      where[Op.or] = [
        { title: { [Op.like]: search } },
        { summary: { [Op.like]: search } },
        { content: { [Op.like]: search } }
      ];
    }

    // Sort order: pinned first, then featured, then by published date
    const order = [
      ['isPinned', 'DESC'],
      ['isFeatured', 'DESC'],
      ['publishedAt', 'DESC']
    ];

    const { rows, count } = await News.findAndCountAll({
      where,
      order,
      offset,
      limit,
      attributes: { exclude: ['content'] },
      include: [{ model: User, as: 'authorInfo', attributes: ['fullName', 'email'] }]
    });

    res.json({
      success: true,
      data: {
        news: rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/news/:slug
// @desc    Get single news article by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const now = new Date();
    const news = await News.findOne({
      where: {
        slug: req.params.slug,
        status: 'published',
        publishedAt: { [Op.lte]: now },
        [Op.or]: [
          { expiresAt: { [Op.is]: null } },
          { expiresAt: { [Op.gt]: now } }
        ]
      },
      include: [{ model: User, as: 'authorInfo', attributes: ['fullName', 'email'] }]
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    // Increment view count
    await news.update({ viewCount: (news.viewCount || 0) + 1 });

    res.json({
      success: true,
      data: { news }
    });
  } catch (error) {
    console.error('Get news article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/news
// @desc    Create new news article
// @access  Private (Admin only)
router.post('/', [
  adminAuth,
  upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]),
  body('title')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('summary')
    .isLength({ min: 10, max: 500 })
    .withMessage('Summary must be between 10 and 500 characters'),
  body('content')
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters'),
  body('category')
    .isIn(['announcement', 'maintenance', 'service_update', 'community', 'tips', 'emergency'])
    .withMessage('Invalid category'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('status')
    .optional()
    .isIn(['draft', 'published'])
    .withMessage('Invalid status')
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
      title,
      summary,
      content,
      category,
      tags,
      status,
      isFeatured,
      isPinned,
      expiresAt,
      targetAudience,
      priority,
      seo
    } = req.body;

    // Handle file uploads
    const newsData = {
      title,
      summary,
      content,
      author: req.user._id,
      category,
      tags: tags || [],
      status: status || 'draft',
      isFeatured: isFeatured === 'true',
      isPinned: isPinned === 'true',
      targetAudience: targetAudience || 'all',
      priority: priority || 'normal',
      seo: seo ? JSON.parse(seo) : {}
    };

    // Handle featured image
    if (req.files && req.files.featuredImage) {
      const featuredImage = req.files.featuredImage[0];
      newsData.featuredImage = {
        url: `/uploads/${featuredImage.filename}`,
        alt: title,
        caption: ''
      };
    }

    // Handle additional images
    if (req.files && req.files.images) {
      newsData.images = req.files.images.map((file, index) => ({
        url: `/uploads/${file.filename}`,
        alt: title,
        caption: '',
        order: index
      }));
    }

    // Set expiration date if provided
    if (expiresAt) {
      newsData.expiresAt = new Date(expiresAt);
    }

    const news = new News(newsData);
    await news.save();

    res.status(201).json({
      success: true,
      message: 'News article created successfully',
      data: { news }
    });
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/news/:id
// @desc    Update news article
// @access  Private (Admin only)
router.put('/:id', [
  adminAuth,
  upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]),
  body('title')
    .optional()
    .isLength({ min: 5, max: 200 }),
  body('summary')
    .optional()
    .isLength({ min: 10, max: 500 }),
  body('content')
    .optional()
    .isLength({ min: 50 }),
  body('category')
    .optional()
    .isIn(['announcement', 'maintenance', 'service_update', 'community', 'tips', 'emergency']),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
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

    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    const updateData = { ...req.body };

    // Handle featured image update
    if (req.files && req.files.featuredImage) {
      const featuredImage = req.files.featuredImage[0];
      updateData.featuredImage = {
        url: `/uploads/${featuredImage.filename}`,
        alt: updateData.title || news.title,
        caption: ''
      };
    }

    // Handle additional images update
    if (req.files && req.files.images) {
      updateData.images = req.files.images.map((file, index) => ({
        url: `/uploads/${file.filename}`,
        alt: updateData.title || news.title,
        caption: '',
        order: index
      }));
    }

    // Parse JSON fields
    if (updateData.tags) {
      updateData.tags = JSON.parse(updateData.tags);
    }
    if (updateData.seo) {
      updateData.seo = JSON.parse(updateData.seo);
    }

    // Convert boolean strings
    if (updateData.isFeatured !== undefined) {
      updateData.isFeatured = updateData.isFeatured === 'true';
    }
    if (updateData.isPinned !== undefined) {
      updateData.isPinned = updateData.isPinned === 'true';
    }

    // Set expiration date if provided
    if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt);
    }

    const updatedNews = await News.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'fullName email');

    res.json({
      success: true,
      message: 'News article updated successfully',
      data: { news: updatedNews }
    });
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/news/:id
// @desc    Delete news article
// @access  Private (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    await News.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'News article deleted successfully'
    });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/news/admin/all
// @desc    Get all news articles (admin view)
// @access  Private (Admin only)
router.get('/admin/all', [
  adminAuth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'published', 'archived']),
  query('category').optional().isIn(['announcement', 'maintenance', 'service_update', 'community', 'tips', 'emergency'])
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
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let query = {};

    // Apply filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.category) query.category = req.query.category;

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { title: searchRegex },
        { summary: searchRegex },
        { content: searchRegex }
      ];
    }

    const news = await News.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'fullName email');

    const total = await News.countDocuments(query);

    res.json({
      success: true,
      data: {
        news,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get admin news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/news/:id/like
// @desc    Like a news article
// @access  Public
router.post('/:id/like', async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    news.likeCount += 1;
    await news.save();

    res.json({
      success: true,
      message: 'Article liked successfully',
      data: { likeCount: news.likeCount }
    });
  } catch (error) {
    console.error('Like news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
