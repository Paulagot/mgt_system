import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the server root directory (two levels up from src/config/)
const envPath = join(__dirname, '../../.env');
console.log('🔍 Looking for .env at:', envPath);

const result = dotenvConfig({ path: envPath });
if (result.error) {
  console.log('❌ Error loading .env:', result.error.message);
} else {
  console.log('✅ .env file loaded successfully');
}

/**
 * Environment configuration
 */
const config = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_NAME: process.env.DB_NAME || 'fundraisely',
  DB_TABLE_PREFIX: process.env.DB_TABLE_PREFIX || 'fundraisely_',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
};

// Debug logging
console.log('🔧 Environment variables:');
console.log('DB_HOST:', config.DB_HOST);
console.log('DB_USER:', config.DB_USER);
console.log('DB_NAME:', config.DB_NAME);
console.log('DB_TABLE_PREFIX:', config.DB_TABLE_PREFIX);

export default config;
export { config };