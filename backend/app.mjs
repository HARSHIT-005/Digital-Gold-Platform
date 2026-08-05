import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.mjs';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler.mjs';

// Import routes
import authRoutes from './routes/auth.mjs';
import holdingRoutes from './routes/holding.mjs';
import transactionRoutes from './routes/transactions.mjs';
//import redemptionRoutes from './routes/redemption.mjs';
import adminRoutes from './routes/admin.mjs';
import notificationRoutes from './routes/notification.mjs';
import inventoryRoutes from './routes/inventory.mjs';
import userRoutes from './routes/user.mjs';
import goldRoutes from './routes/gold.mjs';



dotenv.config(); // load .env
await connectDB(); // connect to MongoDB

const app = express();

app.use(express.json()); // parse JSON bodies
app.use(cors({
  origin: process.env.CORS_ORIGIN, // allow all origins or specify your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // allowed HTTP methods
  credentials: true,
})); // enable CORS for all routes

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/holdings', holdingRoutes);
app.use('/api/transactions', transactionRoutes);
//app.use('/api/redemption', redemptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/gold', goldRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('<h1> Digital Gold Platform API is running</h1>');
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

export default app;
