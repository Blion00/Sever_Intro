const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const News = sequelize.define('News', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [5, 200]
    }
  },
  slug: {
    type: DataTypes.STRING(250),
    allowNull: false,
    unique: true
  },
  summary: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      len: [10, 500]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  author: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.ENUM('announcement', 'maintenance', 'service_update', 'community', 'tips', 'emergency'),
    allowNull: false
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  featuredImage: {
    type: DataTypes.JSON,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  likeCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  shareCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  comments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  seo: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  relatedNews: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  targetAudience: {
    type: DataTypes.ENUM('all', 'customers', 'staff', 'public'),
    allowNull: false,
    defaultValue: 'all'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal'
  }
}, {
  tableName: 'news',
  hooks: {
    beforeValidate: (news) => {
      if (!news.slug && news.title) {
        news.slug = news.title
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^(-)+|(-)+$/g, '');
      }
    },
    beforeCreate: (news) => {
      if (!news.slug && news.title) {
        news.slug = news.title
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^(-)+|(-)+$/g, '');
      }
      if (news.status === 'published' && !news.publishedAt) {
        news.publishedAt = new Date();
      }
    },
    beforeUpdate: (news) => {
      if (news.changed('title') && !news.slug) {
        news.slug = news.title
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^(-)+|(-)+$/g, '');
      }
      if (news.changed('status') && news.status === 'published' && !news.publishedAt) {
        news.publishedAt = new Date();
      }
    }
  }
});

// Virtual fields
News.prototype.readingTime = function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

News.prototype.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

News.prototype.isPublished = function() {
  return this.status === 'published' && 
         this.publishedAt && 
         this.publishedAt <= new Date() &&
         !this.isExpired();
};

module.exports = News;