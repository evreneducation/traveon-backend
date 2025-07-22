import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

async function debugDatabase() {
  try {
    console.log('🔍 Inspecting database structure...\n');

    // Check if bookings table exists
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bookings'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.log('❌ Bookings table does not exist');
      return;
    }

    console.log('✅ Bookings table exists\n');

    // Get current table structure
    const columns = await client`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      ORDER BY ordinal_position;
    `;

    console.log('📋 Current table structure:');
    console.table(columns);

    // Check for data type issues
    const textColumns = columns.filter(col => 
      ['character varying', 'text', 'character'].includes(col.data_type)
    );

    if (textColumns.length > 0) {
      console.log('\n⚠️  Text columns that need conversion:');
      textColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

    // Check for missing required columns
    const requiredColumns = [
      'adults', 'children', 'travel_date', 'contact_name', 
      'contact_email', 'contact_phone', 'hotel_category', 
      'flight_included', 'total_amount', 'currency', 'status', 
      'payment_status', 'special_requests'
    ];

    const existingColumns = columns.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n❌ Missing required columns:');
      missingColumns.forEach(col => console.log(`  - ${col}`));
    }

    // Check for data in the table
    const rowCount = await client`SELECT COUNT(*) as count FROM bookings;`;
    console.log(`\n📊 Total rows in bookings table: ${rowCount[0].count}`);

    if (rowCount[0].count > 0) {
      // Show sample data
      const sampleData = await client`SELECT * FROM bookings LIMIT 3;`;
      console.log('\n📄 Sample data:');
      console.table(sampleData);
    }

    // Check for specific problematic data
    const problematicData = await client`
      SELECT adults, children, total_amount 
      FROM bookings 
      WHERE adults IS NOT NULL 
         OR children IS NOT NULL 
         OR total_amount IS NOT NULL 
      LIMIT 5;
    `;

    if (problematicData.length > 0) {
      console.log('\n🚨 Potentially problematic data:');
      console.table(problematicData);
    }

  } catch (error) {
    console.error('❌ Error inspecting database:', error);
  } finally {
    await client.end();
  }
}

debugDatabase(); 