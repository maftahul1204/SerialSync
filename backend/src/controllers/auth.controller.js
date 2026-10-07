const { User, ROLES } = require('../models/User');
const { COOKIE_NAME, signAccessToken, cookieOptions } = require('../utils/jwt');
const { generateResetToken, hashResetToken } = require('../utils/resetToken');
const env = require('../config/env');

const PASSWORD_MIN = 8;

function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  return null;
}

async function register(req, res, next) {
  try {
    const { fullName, email, password, phone, role } = req.body;
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    let assignedRole = 'patient';
    if (role && ROLES.includes(role)) {
      if (role === 'admin' && env.nodeEnv === 'production') {
        return res.status(403).json({ success: false, message: 'Admin signup is restricted' });
      }
      if (role !== 'admin' || env.nodeEnv !== 'production') {
        assignedRole = role;
      }
    }

    const passwordHash = await User.hashPassword(password);
    const createPayload = {
      fullName,
      email,
      phone,
      passwordHash,
      role: assignedRole,
    };
    if (assignedRole === 'doctor') {
      createPayload.doctorApprovalStatus = 'pending';
    }
    if (assignedRole === 'doctor' && req.body.doctorProfile && typeof req.body.doctorProfile === 'object') {
      const dp = req.body.doctorProfile;
      createPayload.doctorProfile = {
        specialtyTitle: dp.specialtyTitle,
        specialtySlug: dp.specialtySlug,
        affiliations: dp.affiliations,
        roomLabel: dp.roomLabel,
        rating: dp.rating,
        avatarUrl: dp.avatarUrl,
        isOnline: dp.isOnline,
      };
    }
    const user = await User.create(createPayload);

    const token = signAccessToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions());
    return res.status(201).json({ success: true, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = signAccessToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions());
    return res.json({ success: true, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'strict', httpOnly: true });
  return res.json({ success: true, message: 'Logged out' });
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const generic = {
      success: true,
      message: 'If that email exists, a reset link has been generated',
    };
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+passwordResetTokenHash +passwordResetExpires'
    );
    if (!user) {
      return res.json(generic);
    }

    const { raw, hash } = generateResetToken();
    user.passwordResetTokenHash = hash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const payload = { ...generic };
    if (env.nodeEnv !== 'production') {
      payload.resetToken = raw;
      payload.resetUrl = `${env.clientUrl}/reset-password?token=${raw}`;
    }

    return res.json(payload);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const passwordError = validatePassword(password);
    if (!token || passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError || 'Reset token is required',
      });
    }

    const hash = hashResetToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: hash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpires +passwordHash');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.passwordHash = await User.hashPassword(password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const passwordError = validatePassword(newPassword);
    if (!currentPassword || passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError || 'Current password is required',
      });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();
    return res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  return res.json({ success: true, user: req.user.toSafeJSON() });
}

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
};
