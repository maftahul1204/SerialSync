const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const env = require('./config/env');
const { originCheck } = require('./config/cors');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const chamberRoutes = require('./routes/chamber.routes');
const { requireAuth, requireRole } = require('./middleware/auth');
const { listChamberDirectory } = require('./controllers/chamber.controller');
const scheduleRoutes = require('./routes/schedule.routes');
const doctorRoutes = require('./routes/doctor.routes');
const adminRoutes = require('./routes/admin.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const queueRoutes = require('./routes/queue.routes');
const diagnosticRoutes = require('./routes/diagnostic.routes');
const notificationRoutes = require('./routes/notification.routes');
const familyRoutes = require('./routes/family.routes');
const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

if (env.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
if (env.nodeEnv !== 'test' && process.env.NODE_ENV !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(
  cors({
    origin: originCheck,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'serialsync-api', status: 'ok' });
});

app.get('/api/ready', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ success: dbUp, database: dbUp ? 'up' : 'down' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.get(
  '/api/chambers/directory',
  requireAuth,
  requireRole('assistant', 'admin'),
  listChamberDirectory
);
app.use('/api/chambers', chamberRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/family', familyRoutes);

app.use(errorHandler);

module.exports = app;
