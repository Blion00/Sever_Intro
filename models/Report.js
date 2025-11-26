const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reportNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  customerId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    references: {
      model: 'users',
      key: 'customer_id'
    }
  },
  customerInfo: {
    type: DataTypes.JSON,
    allowNull: false
  },
  reportType: {
    type: DataTypes.ENUM('water_leak', 'water_quality', 'no_water', 'low_pressure', 'meter_issue', 'billing_issue', 'other'),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [5, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 2000]
    }
  },
  location: {
    type: DataTypes.JSON,
    allowNull: false
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('submitted', 'under_review', 'in_progress', 'resolved', 'closed', 'rejected'),
    allowNull: false,
    defaultValue: 'submitted'
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  estimatedResolution: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualResolution: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolution: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  followUp: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  customerSatisfaction: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  internalNotes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'reports',
  hooks: {
    beforeCreate: (report) => {
      if (!report.reportNumber) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        report.reportNumber = `RPT${year}${month}${random}`;
      }
      
      if (!report.estimatedResolution) {
        const now = new Date();
        switch (report.priority) {
          case 'urgent':
            report.estimatedResolution = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'high':
            report.estimatedResolution = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            break;
          case 'medium':
            report.estimatedResolution = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'low':
            report.estimatedResolution = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            break;
        }
      }
    }
  }
});

// Virtual fields
Report.prototype.daysSinceSubmission = function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
};

Report.prototype.isOverdue = function() {
  return this.status !== 'resolved' && 
         this.status !== 'closed' && 
         this.estimatedResolution && 
         new Date() > this.estimatedResolution;
};

module.exports = Report;