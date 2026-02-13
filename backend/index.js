import "dotenv/config";
import express from "express"
import loginRoutes from "./login.js"
import FormRoutes from "./routers/formHandling.js"
import AdminRoutes from "./routers/Admin.js"
import cors from "cors"
import helmet from "helmet";
import compression from "compression";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;
const app = express();

// Request Logging Middleware with Status Code
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url } = req;
  const origin = req.headers['origin'] || 'No Origin';

  console.log(`📩 [${new Date().toISOString()}] Incoming: ${method} ${url} | Origin: ${origin}`);

  // Log body (safely)
  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***REDACTED***';
    // console.log('   Body:', JSON.stringify(safeBody)); // Uncomment if deep debugging needed
  }

  // Log Response Status on Finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`📤 ${color}[${status}]${reset} ${method} ${url} completed in ${duration}ms`);
  });

  next();
});

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(express.json());

// Ensure uploads directory exists and serve it
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve PDF files with proper Headers for Preview
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(filePath) + '"');
    }
  }
}));

// Database initialization - seeding handled in db.js
import { db, dbReady } from "./db.js";
await dbReady; // Wait for database to be ready

const isLocalOrigin = (origin) => {
  if (!origin) return true;
  // Match localhost, 127.0.0.1, or private network IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
  // Modified to support http and https
  return /^(http|https):\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    // console.log(`🔍 CORS Check: ${origin}`);

    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }

    // Allow local network IPs
    if (isLocalOrigin(origin)) {
      return callback(null, true);
    }

    // Allow configured frontend URL (production)
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    // Reject all others
    console.warn(`🚫 CORS Rejected: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions));

app.use("/login", loginRoutes);
app.use("/form", FormRoutes);
app.use("/admin", AdminRoutes);
app.listen(port, '0.0.0.0', () => {
  console.log(`Running at 0.0.0.0:${port}`)
})