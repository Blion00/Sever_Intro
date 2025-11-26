const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  billNumber: {
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
  billingPeriod: {
    type: DataTypes.JSON,
    allowNull: false
  },
  waterUsage: {
    type: DataTypes.JSON,
    allowNull: false
  },
  rates: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      baseRate: 0,
      consumptionRate: 5000,
      serviceFee: 50000,
      environmentalFee: 10000
    }
  },
  amounts: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      baseAmount: 0,
      consumptionAmount: 0,
      serviceAmount: 0,
      environmentalAmount: 0,
      subtotal: 0,
      tax: 0,
      total: 0
    }
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  meterInfo: {
    type: DataTypes.JSON,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'bills',
  hooks: {
    beforeCreate: (bill) => {
      if (!bill.billNumber) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        bill.billNumber = `BILL${year}${month}${random}`;
      }
      
      // Calculate amounts
      if (bill.waterUsage && bill.rates) {
        const consumption = bill.waterUsage.currentReading - bill.waterUsage.previousReading;
        bill.waterUsage.consumption = consumption;
        
        bill.amounts.consumptionAmount = consumption * bill.rates.consumptionRate;
        bill.amounts.subtotal = bill.amounts.baseAmount + 
                               bill.amounts.consumptionAmount + 
                               bill.amounts.serviceAmount + 
                               bill.amounts.environmentalAmount;
        bill.amounts.tax = bill.amounts.subtotal * 0.1;
        bill.amounts.total = bill.amounts.subtotal + bill.amounts.tax;
      }
    },
    beforeUpdate: (bill) => {
      if (bill.changed('waterUsage') || bill.changed('rates')) {
        const consumption = bill.waterUsage.currentReading - bill.waterUsage.previousReading;
        bill.waterUsage.consumption = consumption;
        
        bill.amounts.consumptionAmount = consumption * bill.rates.consumptionRate;
        bill.amounts.subtotal = bill.amounts.baseAmount + 
                               bill.amounts.consumptionAmount + 
                               bill.amounts.serviceAmount + 
                               bill.amounts.environmentalAmount;
        bill.amounts.tax = bill.amounts.subtotal * 0.1;
        bill.amounts.total = bill.amounts.subtotal + bill.amounts.tax;
      }
    }
  }
});

// Virtual fields
Bill.prototype.isOverdue = function() {
  return this.status === 'pending' && new Date() > this.dueDate;
};

module.exports = Bill;