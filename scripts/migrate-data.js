#!/usr/bin/env node

/**
 * MongoDB Data Migration Script
 * Migrates email and account data from old MongoDB to new MongoDB
 *
 * Usage: node scripts/migrate-data.js <source-mongodb-uri> <target-mongodb-uri>
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config();

const Account = require('../models/Account');

const BATCH_SIZE = 100;

// Parse command line arguments
const sourceUri = process.argv[2];
const targetUri = process.argv[3];

if (!sourceUri || !targetUri) {
  console.error('Usage: node migrate-data.js <source-mongodb-uri> <target-mongodb-uri>');
  console.error('\nExample:');
  console.error('  node migrate-data.js "mongodb+srv://old-user:password@old-cluster.mongodb.net/mailpro" "mongodb+srv://new-user:password@new-cluster.mongodb.net/mailpro"');
  process.exit(1);
}

let sourceConnection = null;
let targetConnection = null;

async function migrateData() {
  try {
    console.log('🔄 Starting MongoDB data migration...\n');

    // Connect to source database
    console.log('📡 Connecting to source database...');
    sourceConnection = await mongoose.createConnection(sourceUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to source database');

    // Connect to target database
    console.log('📡 Connecting to target database...');
    targetConnection = await mongoose.createConnection(targetUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to target database\n');

    // Get source Account model
    const SourceAccount = sourceConnection.model('Account', new mongoose.Schema({}, { strict: false }));

    // Get target Account model
    const TargetAccount = targetConnection.model('Account', new mongoose.Schema({}, { strict: false }));

    // Count source documents
    const totalAccounts = await SourceAccount.countDocuments();
    console.log(`📊 Found ${totalAccounts} accounts to migrate\n`);

    if (totalAccounts === 0) {
      console.log('ℹ️  No accounts to migrate.');
      return;
    }

    // Migrate in batches
    let migratedCount = 0;
    let page = 0;

    while (migratedCount < totalAccounts) {
      const skip = page * BATCH_SIZE;
      console.log(`📦 Processing batch ${page + 1} (${skip}-${Math.min(skip + BATCH_SIZE, totalAccounts)})...`);

      const accounts = await SourceAccount.find()
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      for (const account of accounts) {
        try {
          // Remove MongoDB internal fields for clean import
          delete account._id;
          delete account.__v;

          // Check if account already exists in target
          const existingAccount = await TargetAccount.findOne({ email: account.email });

          if (existingAccount) {
            console.log(`  ⏭️  Skipping ${account.email} (already exists)`);
            migratedCount++;
            continue;
          }

          // Insert into target database
          await TargetAccount.create(account);
          console.log(`  ✅ Migrated: ${account.email}`);
          migratedCount++;

        } catch (error) {
          console.error(`  ❌ Error migrating account: ${error.message}`);
          migratedCount++;
        }
      }

      page++;
    }

    console.log(`\n✨ Migration complete! ${migratedCount} accounts migrated.\n`);

    // Verify migration
    const targetCount = await TargetAccount.countDocuments();
    console.log(`📊 Target database now has ${targetCount} accounts\n`);

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    // Close connections
    if (sourceConnection) {
      await sourceConnection.close();
      console.log('🔌 Closed source connection');
    }
    if (targetConnection) {
      await targetConnection.close();
      console.log('🔌 Closed target connection');
    }
  }
}

// Run migration
migrateData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
