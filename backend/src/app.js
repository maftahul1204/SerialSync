const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const chamberRoutes = require('./routes/chamber.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const doctorRoutes = require('./routes/doctor.routes');
const adminRoutes = require('./routes/admin.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'serialsync-api', status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chambers', chamberRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

module.exports = app;
