const mongoose = require('mongoose');
require('dotenv').config();

// Plan Schema
const planSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  order: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: [
      'single_session',
      'x2_sessions',
      'x3_sessions',
      'x4_sessions',
      'x5_sessions',
      'x6_sessions',
      'x7_sessions',
      'x8_sessions',
      'x9_sessions',
      'x10_sessions',
      'x11_sessions',
      'x12_sessions',
      'x13_sessions',
      'x14_sessions',
      'x15_sessions',
      'x16_sessions',
      'x17_sessions',
      'x18_sessions',
      'x19_sessions',
      'x20_sessions',
    ],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  features: [{
    type: String,
  }],
  active: {
    type: Boolean,
    default: true,
  },
  isSameDay: {
    type: Boolean,
    default: false,
  },
  isFiveMin: {
    type: Boolean,
    default: false,
  },
  subscribtion: {
    type: String,
    enum: ['monthly', 'single'],
    required: true,
  },
  therapyType: {
    type: String,
    enum: ['individual', 'couples', 'kids', 'psychiatry'],
    required: true,
  }
}, { timestamps: true });

const Plan = mongoose.model('Plan', planSchema);

// Default plans
const defaultPlans = [
  {
    title: "Single Online Therapy Session",
    type: "single_session",
    price: 90.00,
    description: "One-time therapy session with a licensed professional.",
    features: ["1-hour session", "Choose your therapist", "Video consultation"],
    subscribtion: "single",
    therapyType: "individual",
    order: 1
  },
  {
    title: "Monthly Care Plan",
    type: "x4_sessions",
    price: 81.00,
    description: "4 Online Therapy Sessions per month",
    features: ["4 sessions per month", "Flexible scheduling", "Progress tracking", "Priority booking"],
    subscribtion: "monthly",
    therapyType: "individual",
    order: 2
  },
  {
    title: "Monthly Intensive Care Plan",
    type: "x8_sessions",
    price: 73.75,
    description: "8 Online Therapy Sessions per month",
    features: ["8 sessions per month", "Comprehensive care", "Weekly progress reviews", "24/7 messaging support"],
    subscribtion: "monthly",
    therapyType: "individual",
    order: 3
  },
  {
    title: "5 Sessions Package",
    type: "x5_sessions",
    price: 400.00,
    description: "5 Online Therapy Sessions package",
    features: ["5 sessions", "Flexible scheduling", "Progress tracking"],
    subscribtion: "single",
    therapyType: "individual",
    order: 4
  },
  {
    title: "10 Sessions Package",
    type: "x10_sessions",
    price: 750.00,
    description: "10 Online Therapy Sessions package",
    features: ["10 sessions", "Flexible scheduling", "Progress tracking", "Priority booking"],
    subscribtion: "single",
    therapyType: "individual",
    order: 5
  }
];

async function initPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check existing plans
    const existingPlans = await Plan.find({});
    console.log(`Found ${existingPlans.length} existing plans`);

    // Create missing plans
    for (const planData of defaultPlans) {
      const existingPlan = await Plan.findOne({ title: planData.title });
      if (!existingPlan) {
        const plan = new Plan(planData);
        await plan.save();
        console.log(`Created plan: ${planData.title}`);
      } else {
        console.log(`Plan already exists: ${planData.title}`);
      }
    }

    // List all plans
    const allPlans = await Plan.find({}, 'title type price subscribtion therapyType');
    console.log('\nAll plans in database:');
    allPlans.forEach(plan => {
      console.log(`- ${plan.title} (${plan.type}) - ${plan.price} AED - ${plan.subscribtion} - ${plan.therapyType}`);
    });

    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the initialization
initPlans();
