import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    corsOrigins: [
      'https://mariahavensfrontend.onrender.com',
      'https://mariahavensbackend.onrender.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
      /\.onrender\.com$/
    ]
  },
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'a-very-secret-and-secure-key-that-you-should-change',
  
  // CORS origins
  CORS_ORIGINS: [
    'https://mariahavensfrontend.onrender.com',
    'https://mariahavensbackend.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'https://menu.mariahavens.com',
    /\.onrender\.com$/
  ],
  
  // Email configuration
  EMAIL: {
    HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.EMAIL_PORT || '587'),
    SECURE: process.env.EMAIL_SECURE === 'true',
    USER: process.env.EMAIL_USER,
    PASSWORD: process.env.EMAIL_PASSWORD,
    FROM: process.env.EMAIL_FROM || 'Maria Havens POS <noreply@mariahavens.com>',
  },
  
  // Database configuration
  DATABASE: {
    HOST: process.env.DATABASE_HOST,
    PORT: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : 5432,
    NAME: process.env.DATABASE_NAME,
    USER: process.env.DATABASE_USER,
    PASSWORD: process.env.DATABASE_PASSWORD,
    SSL: process.env.DATABASE_SSL === 'true',
  }
};

export default config;