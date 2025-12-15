const { sequelize, testConnection } = require('../config/database');

// Import models
const User = require('./User');
const Bill = require('./Bill');
const Report = require('./Report');
const News = require('./News');
const PricingTier = require('./PricingTier');

// Define associations
User.hasMany(Bill, { 
  foreignKey: 'createdBy',
  as: 'createdBills'
});

Bill.belongsTo(User, { 
  foreignKey: 'createdBy',
  as: 'creator'
});

User.hasMany(Report, { 
  foreignKey: 'assignedTo',
  as: 'assignedReports'
});

Report.belongsTo(User, { 
  foreignKey: 'assignedTo',
  as: 'assignee'
});

User.hasMany(News, { 
  foreignKey: 'author',
  as: 'authoredNews'
});

News.belongsTo(User, { 
  foreignKey: 'author',
  as: 'authorInfo'
});

// Sync database
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Bill,
  Report,
  News,
  PricingTier,
  syncDatabase,
  testConnection
};
