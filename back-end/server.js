
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/UserRoutes.js";
import schedualRoutes from "./routes/schedualRoutes.js";
import announcmentAdminsRoutes from "./routes/adminAnnouncmentRoutes.js";
import cookieParser from "cookie-parser";
import admissionRoutes from './routes/admissionRoutes.js';
import announcmentRoutes from './routes/announcmentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js'
import classGradeRoutes from './routes/classGradeRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import dotenv from "dotenv";

// Global error handlers to catch crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration
const allowedOrigins = [
  "http://127.0.0.1:5500", 
  "http://localhost:5500",
  "http://127.0.0.1:5001",
  "http://localhost:5001",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Serve your static HTML/CSS/JS
app.use(express.static(path.join(__dirname, "../front-end/src/pages/html")));
app.use("/css", express.static(path.join(__dirname, "../front-end/src/pages/css")));
app.use("/js", express.static(path.join(__dirname, "../front-end/src/pages/html/js")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files for role-specific dashboards
app.use("/Admin", express.static(path.join(__dirname, "../front-end/src/pages/html/Admin")));
app.use("/Student", express.static(path.join(__dirname, "../front-end/src/pages/html/Student")));
app.use("/Teacher", express.static(path.join(__dirname, "../front-end/src/pages/html/Teacher")));
app.use("/Parent", express.static(path.join(__dirname, "../front-end/src/pages/html/Parent")));

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/schedules", schedualRoutes);
app.use("/api/admin-announcements", announcmentAdminsRoutes);
app.use('/api/admissions', admissionRoutes);  
app.use('/api/announcements', announcmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/classGrade', classGradeRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Home route - redirect to home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../front-end/src/pages/html/Home.html'));
});

// Favicon handler (prevent 404 errors)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Error handling middleware (must be after routes)
app.use(notFound);
app.use(errorHandler);



app.listen(PORT, () => {
  connectDB();
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
