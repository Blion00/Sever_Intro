const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PricingTier = sequelize.define('PricingTier', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  badge: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  includes: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'pricing_tiers'
});

module.exports = PricingTier;

