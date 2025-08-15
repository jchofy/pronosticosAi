import mysql from 'mysql2/promise';
import 'dotenv/config';

const config = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'pronosticosai'
};

async function checkMatchesTable() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('📋 Structure of matches table:');
    console.log('='.repeat(50));
    
    const [columns] = await connection.execute('DESCRIBE matches');
    columns.forEach(col => {
      console.log(`${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default}`);
    });

    console.log('\n📊 Sample data:');
    console.log('='.repeat(50));
    const [rows] = await connection.execute('SELECT * FROM matches LIMIT 3');
    console.log(rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkMatchesTable();
