const mongoose = require('mongoose');
const Job = require('../backend/models/Job');
require('dotenv').config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('🗑️  Dropping existing jobs collection...');
    
    // Drop the entire collection to start fresh
    await Job.collection.drop();
    console.log('✅ Dropped jobs collection');
    
    console.log('🔧 Creating optimized indexes...');
    
    // Create new indexes
    await Job.ensureIndexes();
    console.log('✅ Created new indexes');
    
    // Display all indexes
    const indexes = await Job.collection.indexes();
    console.log('\n📊 Current indexes:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}`);
    });
    
    console.log('\n✅ Database optimization complete');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createIndexes();