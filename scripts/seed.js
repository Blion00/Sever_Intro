require('dotenv').config();
const { User, News, PricingTier, syncDatabase } = require('../models');

// Sample data
const sampleUsers = [
  {
    username: 'admin',
    email: 'admin@introaqua.vn',
    password: 'admin123',
    fullName: 'Administrator',
    phone: '0123456789',
    role: 'admin',
    address: {
      street: '123 Admin Street',
      ward: 'Admin Ward',
      district: 'Admin District',
      city: 'Ho Chi Minh City'
    }
  },
  {
    username: 'customer1',
    email: 'customer1@example.com',
    password: 'customer123',
    fullName: 'Nguyen Van A',
    phone: '0987654321',
    role: 'customer',
    address: {
      street: '456 Customer Street',
      ward: 'Customer Ward',
      district: 'District 1',
      city: 'Ho Chi Minh City'
    }
  },
  {
    username: 'staff1',
    email: 'staff1@introaqua.vn',
    password: 'staff123',
    fullName: 'Tran Thi B',
    phone: '0912345678',
    role: 'staff',
    address: {
      street: '789 Staff Street',
      ward: 'Staff Ward',
      district: 'District 2',
      city: 'Ho Chi Minh City'
    }
  }
];

const sampleNews = [
  {
    title: 'Thông báo về việc bảo trì hệ thống cấp nước',
    summary: 'Hệ thống cấp nước sẽ được bảo trì định kỳ vào cuối tuần này.',
    content: 'Kính gửi quý khách hàng, chúng tôi xin thông báo về việc bảo trì hệ thống cấp nước định kỳ...',
    category: 'maintenance',
    tags: ['bảo trì', 'hệ thống', 'cấp nước'],
    status: 'published',
    isFeatured: true,
    targetAudience: 'all'
  },
  {
    title: 'Hướng dẫn tiết kiệm nước trong mùa khô',
    summary: 'Những mẹo đơn giản giúp bạn tiết kiệm nước và giảm chi phí hóa đơn.',
    content: 'Mùa khô đang đến, việc tiết kiệm nước không chỉ giúp bảo vệ môi trường mà còn giảm chi phí...',
    category: 'tips',
    tags: ['tiết kiệm', 'nước', 'mùa khô', 'mẹo'],
    status: 'published',
    isFeatured: false,
    targetAudience: 'customers'
  },
  {
    title: 'Cập nhật biểu giá nước mới từ tháng 1/2025',
    summary: 'Biểu giá nước mới sẽ có hiệu lực từ ngày 1/1/2025 với mức tăng nhẹ.',
    content: 'Theo quy định mới của thành phố, biểu giá nước sẽ được điều chỉnh...',
    category: 'announcement',
    tags: ['biểu giá', 'nước', '2025', 'thông báo'],
    status: 'published',
    isFeatured: true,
    targetAudience: 'all'
  }
];

const samplePricing = [
  {
    code: 'family',
    name: 'Gói Gia đình',
    badge: 'Phổ biến',
    description: 'Thích hợp cho hộ gia đình 3-5 người sử dụng hằng ngày.',
    price: 65000,
    unit: 'mỗi bình 20L',
    includes: [
      'Giao trong 2 giờ tại nội thành',
      'Cho mượn tối đa 4 vỏ miễn phí',
      'Nhắc lịch đổi bình định kỳ qua SMS',
    ],
  },
  {
    code: 'office',
    name: 'Gói Văn phòng',
    badge: 'Tiết kiệm',
    description: 'Giao định kỳ cho doanh nghiệp nhỏ và văn phòng co-working.',
    price: 58000,
    unit: 'mỗi bình 20L',
    includes: [
      'Tối thiểu 8 bình/tuần',
      'Miễn phí thiết lập kệ và van rót',
      'Báo cáo tiêu thụ & công nợ hàng tháng',
    ],
  },
  {
    code: 'dealer',
    name: 'Gói Đại lý',
    badge: 'Sỉ',
    description: 'Dành cho đại lý phân phối, chung cư và căng-tin trường học.',
    price: 52000,
    unit: 'mỗi bình 20L',
    includes: [
      'Đơn tối thiểu 30 bình/lần',
      'Ưu tiên giao sáng sớm & cuối ngày',
      'Hỗ trợ vật phẩm POS và biển hiệu',
    ],
  },
];

async function seedDatabase() {
  try {
    // Sync database
    await syncDatabase(false);
    console.log('✅ Database synchronized');

    // Clear existing data
    await User.destroy({ where: {} });
    await News.destroy({ where: {} });
    await PricingTier.destroy({ where: {} });
    console.log('🗑️  Cleared existing data');

    // Create users
    console.log('👥 Creating users...');
    for (const userData of sampleUsers) {
      const user = await User.create(userData);
      console.log(`   Created user: ${user.username} (${user.role})`);
    }

    // Get admin user for news author
    const adminUser = await User.findOne({ where: { role: 'admin' } });

    // Create news articles
    console.log('📰 Creating news articles...');
    for (const newsData of sampleNews) {
      const news = await News.create({
        ...newsData,
        author: adminUser.id
      });
      console.log(`   Created news: ${news.title}`);
    }

    // Create pricing tiers
    console.log('💧 Creating pricing tiers...');
    for (const tier of samplePricing) {
      await PricingTier.create(tier);
      console.log(`   Created pricing: ${tier.name} (${tier.price.toLocaleString('vi-VN')}đ)`);
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Sample accounts created:');
    console.log('   Admin: admin@introaqua.vn / admin123');
    console.log('   Customer: customer1@example.com / customer123');
    console.log('   Staff: staff1@introaqua.vn / staff123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    console.log('🔌 Seeding completed');
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();
