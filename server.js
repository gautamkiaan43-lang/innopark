// =====================================================
// Worksuite CRM Backend Server
// =====================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const estimateRoutes = require('./routes/estimateRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const offerRoutes = require('./routes/offerRoutes');
const dealRoutes = require('./routes/dealRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const contractRoutes = require('./routes/contractRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const timeTrackingRoutes = require('./routes/timeTrackingRoutes');
const eventRoutes = require('./routes/eventRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const positionRoutes = require('./routes/positionRoutes');
const messageRoutes = require('./routes/messageRoutes');
const groupRoutes = require('./routes/groupRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const customFieldRoutes = require('./routes/customFieldRoutes');
const customSectionRoutes = require('./routes/customSectionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const roleRoutes = require('./routes/roleRoutes');
const hrRoutes = require('./routes/hrRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const companyPackageRoutes = require('./routes/companyPackageRoutes');
const companyRoutes = require('./routes/companyRoutes');
const documentRoutes = require('./routes/documentRoutes');
const socialMediaIntegrationRoutes = require('./routes/socialMediaIntegrationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const emailTemplateRoutes = require('./routes/emailTemplateRoutes');
const financeTemplateRoutes = require('./routes/financeTemplateRoutes');
const projectTemplateRoutes = require('./routes/projectTemplateRoutes');
const creditNoteRoutes = require('./routes/creditNoteRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const bankAccountRoutes = require('./routes/bankAccountRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const leaveRequestRoutes = require('./routes/leaveRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const pwaRoutes = require('./routes/pwaRoutes');
const noteRoutes = require('./routes/noteRoutes');
const orderRoutes = require('./routes/orderRoutes');
const itemRoutes = require('./routes/itemRoutes');
const activityRoutes = require('./routes/activityRoutes');
const leadSourceRoutes = require('./routes/leadSourceRoutes');
const leadPipelineRoutes = require('./routes/leadPipelineRoutes');
const dealPipelineRoutes = require('./routes/dealPipelineRoutes');
const contactRoutes = require('./routes/contactRoutes');


const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// =====================================================
// Middleware
// =====================================================

// CORS first — must run before helmet/routes so preflight always gets headers.
// origin: true echoes the request Origin (works for localhost, Railway, Vercel, etc.).
const corsAllowedHeaders = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Accept-Language',
  'Origin',
  'Cache-Control',
  'Pragma',
  'X-Language',
  'language',
];

const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: corsAllowedHeaders,
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Cache-Control'],
  // Frontend uses Bearer token, not cookies — false avoids strict credential + Origin pairing issues on some hosts
  credentials: false,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Security (after CORS so browser cross-origin requests stay predictable)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files (for uploads)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/uploads', express.static('uploads'));

// =====================================================
// Routes
// =====================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
const apiBase = `/api/${API_VERSION}`;

app.use(`${apiBase}/auth`, authRoutes);
app.use(`${apiBase}/dashboard`, dashboardRoutes);
app.use(`${apiBase}/users`, userRoutes);
app.use(`${apiBase}/leads`, leadRoutes);
app.use(`${apiBase}/projects`, projectRoutes);
app.use(`${apiBase}/tasks`, taskRoutes);
app.use(`${apiBase}/meetings`, require('./routes/meetingRoutes'));
app.use(`${apiBase}/invoices`, invoiceRoutes);
app.use(`${apiBase}/estimates`, estimateRoutes);
app.use(`${apiBase}/proposals`, proposalRoutes);
app.use(`${apiBase}/offers`, offerRoutes);
app.use(`${apiBase}/deals`, dealRoutes);
app.use(`${apiBase}/payments`, paymentRoutes);
app.use(`${apiBase}/activities`, activityRoutes);
app.use(`${apiBase}/lead-sources`, leadSourceRoutes);
app.use(`${apiBase}/lead-pipelines`, leadPipelineRoutes);
app.use(`${apiBase}/deal-pipelines`, dealPipelineRoutes);
app.use(`${apiBase}/contacts`, contactRoutes);
app.use(`${apiBase}/expenses`, expenseRoutes);
app.use(`${apiBase}/contracts`, contractRoutes);
app.use(`${apiBase}/employees`, employeeRoutes);
app.use(`${apiBase}/attendance`, attendanceRoutes);
app.use(`${apiBase}/time-logs`, timeTrackingRoutes);
app.use(`${apiBase}/events`, eventRoutes);
app.use(`${apiBase}/departments`, departmentRoutes);
app.use(`${apiBase}/positions`, positionRoutes);
app.use(`${apiBase}/messages`, messageRoutes);
app.use(`${apiBase}/groups`, groupRoutes);
app.use(`${apiBase}/tickets`, ticketRoutes);
app.use(`${apiBase}/custom-fields`, customFieldRoutes);
app.use(`${apiBase}/custom-sections`, customSectionRoutes);
app.use(`${apiBase}/settings`, settingsRoutes);
app.use(`${apiBase}/roles`, roleRoutes);
app.use(`${apiBase}/hr`, hrRoutes);
app.use(`${apiBase}/company-packages`, companyPackageRoutes);
app.use(`${apiBase}/companies`, companyRoutes);
app.use(`${apiBase}/documents`, documentRoutes);
app.use(`${apiBase}/social-media-integrations`, socialMediaIntegrationRoutes);
app.use(`${apiBase}/reports`, reportRoutes);
app.use(`${apiBase}/email-templates`, emailTemplateRoutes);
app.use(`${apiBase}/finance-templates`, financeTemplateRoutes);
app.use(`${apiBase}/project-templates`, projectTemplateRoutes);
app.use(`${apiBase}/credit-notes`, creditNoteRoutes);
app.use(`${apiBase}/superadmin`, superAdminRoutes);
app.use(`${apiBase}/bank-accounts`, bankAccountRoutes);
app.use(`${apiBase}/audit-logs`, auditLogRoutes);
app.use(`${apiBase}/leave-requests`, leaveRequestRoutes);
app.use(`${apiBase}/notifications`, notificationRoutes);
// PWA Routes - Must be public for manifest
app.use(`${apiBase}/pwa`, pwaRoutes);
app.use(`${apiBase}/notifications`, notificationRoutes);
app.use(`${apiBase}/notes`, noteRoutes);
app.use(`${apiBase}/orders`, orderRoutes);
app.use(`${apiBase}/items`, itemRoutes);
app.use(`${apiBase}/pwa`, pwaRoutes);


// Notification Settings routes
const notificationSettingsRoutes = require('./routes/notificationSettingsRoutes');
const attendanceSettingsRoutes = require('./routes/attendanceSettingsRoutes');
const leaveSettingsRoutes = require('./routes/leaveSettingsRoutes');
const moduleSettingsRoutes = require('./routes/moduleSettingsRoutes');
app.use(`${apiBase}/notification-settings`, notificationSettingsRoutes);
app.use(`${apiBase}/attendance-settings`, attendanceSettingsRoutes);
app.use(`${apiBase}/leave-settings`, leaveSettingsRoutes);
app.use(`${apiBase}/module-settings`, moduleSettingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// =====================================================
// Start Server
// =====================================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Don't exit, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Don't exit immediately, log and continue
});

// Import and run migrations
const migrationService = require('./services/migrationService');
migrationService.run().catch(err => console.error('Migration startup error:', err));

const server = app.listen(PORT, () => {
  console.log(`🚀 Worksuite CRM Backend Server running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}${apiBase}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
});

module.exports = app;

