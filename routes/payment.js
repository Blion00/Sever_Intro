const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/payment/create-qr - Create payment QR code
router.post('/create-qr', auth, async (req, res) => {
  try {
    const { items, total, shipping } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items are required'
      });
    }

    if (!total || total <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount is required and must be greater than 0'
      });
    }

    if (!shipping || !shipping.fullName || !shipping.phone || !shipping.addressLine) {
      return res.status(400).json({
        success: false,
        message: 'Shipping info is required (fullName, phone, addressLine)'
      });
    }

    // Tạo order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Tạo URL thanh toán (có thể tích hợp với VNPay, Momo, v.v.)
    // Ở đây tạo URL demo, trong thực tế sẽ tích hợp với gateway thanh toán thật
    const paymentUrl = `https://payment.introaqua.vn/pay?orderId=${orderId}&amount=${total}&userId=${req.user.id}`;

    // Tạo QR code từ URL thanh toán
    // Sử dụng API công khai để tạo QR code, hoặc có thể dùng thư viện qrcode
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentUrl)}`;

    // Lưu thông tin đơn hàng vào database (có thể tạo model Order sau)
    // await Order.create({ orderId, userId: req.user.id, items, total, status: 'pending' });

    res.json({
      success: true,
      data: {
        qrCode: qrCodeUrl,
        paymentUrl,
        orderId,
        amount: total
      }
    });
  } catch (error) {
    console.error('Error creating payment QR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating payment QR'
    });
  }
});

// GET /api/payment/check/:orderId - Check payment status
router.get('/check/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Kiểm tra trạng thái thanh toán từ database hoặc gateway
    // Ở đây là demo, trong thực tế sẽ query từ database hoặc gọi API gateway
    // const order = await Order.findOne({ where: { orderId, userId: req.user.id } });
    
    // Demo: Giả sử thanh toán thành công sau 30 giây
    // Trong thực tế sẽ kiểm tra từ database hoặc webhook từ gateway
    res.json({
      success: true,
      data: {
        status: 'pending', // 'pending', 'paid', 'failed'
        orderId
      }
    });
  } catch (error) {
    console.error('Error checking payment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking payment status'
    });
  }
});

module.exports = router;

