const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { DiagnosticTest } = require('../models/DiagnosticTest');
const { DiagnosticCenter } = require('../models/DiagnosticCenter');
const { PACKAGES, findPackage, buildQuote } = require('../utils/diagnosticPackages');
const { DiagnosticOrder, ORDER_STATUSES } = require('../models/DiagnosticOrder');
const { User } = require('../models/User');
const env = require('../config/env');
const { notify } = require('../services/notificationService');
const { recordAudit } = require('../utils/audit');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { signReportDownload, verifyReportDownload, hashFileBuffer } = require('../utils/reportHmac');

function ensureReportsDir() {
  fs.mkdirSync(env.reportsStorageDir, { recursive: true });
}

async function listTests(req, res, next) {
  try {
    const { search, category } = req.query;
    const query = { isActive: true };
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }
    const tests = await DiagnosticTest.find(query).sort({ category: 1, name: 1 }).limit(100);
    return res.json({ success: true, tests: tests.map((t) => t.toPublicJSON()) });
  } catch (err) {
    next(err);
  }
}

async function listPackages(_req, res, next) {
  try {
    return res.json({ success: true, packages: PACKAGES });
  } catch (err) {
    next(err);
  }
}

/** Resolve the tests (and package discount) a request refers to. */
async function resolveSelection({ testIds, packageId, codes }) {
  if (packageId) {
    const pkg = findPackage(packageId);
    if (!pkg) return { error: 'Unknown package' };
    const rows = await DiagnosticTest.find({ code: { $in: pkg.testCodes }, isActive: true });
    return { tests: rows, discountPercent: pkg.discountPercent, packageName: pkg.name, packageId };
  }
  if (Array.isArray(codes) && codes.length) {
    const rows = await DiagnosticTest.find({ code: { $in: codes.map((c) => String(c).toUpperCase()) }, isActive: true });
    return { tests: rows, discountPercent: 0 };
  }
  if (!Array.isArray(testIds) || !testIds.length) return { error: 'testIds or packageId required' };
  if (!testIds.every((id) => mongoose.Types.ObjectId.isValid(id))) return { error: 'Invalid test id' };
  const rows = await DiagnosticTest.find({ _id: { $in: testIds }, isActive: true });
  return { tests: rows, discountPercent: 0 };
}

function centerSummary(center, quote, now) {
  return {
    ...center.toPublicJSON(now),
    quote: quote
      ? {
          lines: quote.lines.map((l) => ({ code: l.code, name: l.name, price: l.price })),
          missing: quote.missing,
          subtotal: quote.subtotal,
          discount: quote.discount,
          collectionFee: quote.collectionFee,
          freeCollection: quote.freeCollection,
          total: quote.total,
          offersAll: quote.offersAll,
        }
      : undefined,
  };
}

/**
 * Diagnostic centers a patient can pick, with a price quote for the selected tests/package.
 * Query: ?packageId= | ?testIds=a,b | ?codes=CBC,FBS. Sorted: can-serve first, open now, cheapest.
 */
async function listCenters(req, res, next) {
  try {
    const adminAll = req.user.role === 'admin' && req.query.all === 'true';
    const centers = await DiagnosticCenter.find(adminAll ? {} : { isActive: true }).sort({ name: 1 });
    const now = new Date();
    const selection = {
      packageId: req.query.packageId,
      testIds: req.query.testIds ? String(req.query.testIds).split(',').filter(Boolean) : undefined,
      codes: req.query.codes ? String(req.query.codes).split(',').filter(Boolean) : undefined,
    };
    if (!selection.packageId && !selection.testIds && !selection.codes) {
      return res.json({ success: true, centers: centers.map((c) => c.toPublicJSON(now)) });
    }
    const resolved = await resolveSelection(selection);
    if (resolved.error) return res.status(400).json({ success: false, message: resolved.error });
    const list = centers.map((c) => centerSummary(c, buildQuote(c, resolved.tests, resolved), now));
    list.sort(
      (a, b) =>
        Number(b.quote.offersAll && b.acceptingOrders) - Number(a.quote.offersAll && a.acceptingOrders) ||
        Number(b.openNow) - Number(a.openNow) ||
        a.quote.total - b.quote.total
    );
    const eligible = list.filter((c) => c.quote.offersAll && c.acceptingOrders && c.homeCollection);
    return res.json({
      success: true,
      centers: list,
      tests: resolved.tests.map((t) => t.toPublicJSON()),
      packageName: resolved.packageName || '',
      discountPercent: resolved.discountPercent,
      recommendedCenterId: eligible[0]?.id || null,
      cheapestCenterId: [...eligible].sort((a, b) => a.quote.total - b.quote.total)[0]?.id || null,
      fastestCenterId: [...eligible].sort((a, b) => a.turnaroundHours - b.turnaroundHours)[0]?.id || null,
    });
  } catch (err) {
    next(err);
  }
}

async function getCenter(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid center id' });
    }
    const center = await DiagnosticCenter.findById(req.params.id);
    if (!center || (!center.isActive && req.user.role !== 'admin')) {
      return res.status(404).json({ success: false, message: 'Diagnostic center not found' });
    }
    return res.json({ success: true, center: { ...center.toPublicJSON(), prices: center.prices } });
  } catch (err) {
    next(err);
  }
}

function validateCenterBody(body, partial) {
  if (!partial || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) return 'name is required';
  }
  for (const key of ['openFrom', 'openTo']) {
    if (body[key] !== undefined && !/^\d{2}:\d{2}$/.test(body[key])) return `${key} must be HH:mm`;
  }
  for (const key of ['collectionFee', 'freeCollectionAbove', 'turnaroundHours']) {
    if (body[key] !== undefined && (!Number.isFinite(Number(body[key])) || Number(body[key]) < 0)) return `${key} must be a non-negative number`;
  }
  if (body.prices !== undefined) {
    if (!Array.isArray(body.prices)) return 'prices must be an array';
    for (const p of body.prices) {
      if (!p.code || !Number.isFinite(Number(p.price)) || Number(p.price) < 0) return 'each price needs a code and a non-negative price';
    }
  }
  return null;
}

const CENTER_FIELDS = ['name', 'area', 'city', 'address', 'phone', 'accreditation', 'rating', 'openFrom', 'openTo', 'openDays', 'turnaroundHours', 'homeCollection', 'collectionFee', 'freeCollectionAbove', 'acceptingOrders', 'isActive', 'prices'];

async function createCenter(req, res, next) {
  try {
    const error = validateCenterBody(req.body, false);
    if (error) return res.status(400).json({ success: false, message: error });
    const data = {};
    for (const k of CENTER_FIELDS) if (req.body[k] !== undefined) data[k] = req.body[k];
    if (data.prices === undefined) {
      // new centers start with the catalogue price list so they can take orders immediately
      const catalogue = await DiagnosticTest.find({ isActive: true });
      data.prices = catalogue.map((t) => ({ code: t.code, price: t.price }));
    }
    const center = await DiagnosticCenter.create(data);
    await recordAudit(req, 'center.create', { targetType: 'DiagnosticCenter', targetId: center._id, meta: { name: center.name } });
    return res.status(201).json({ success: true, center: center.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function updateCenter(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid center id' });
    }
    const error = validateCenterBody(req.body, true);
    if (error) return res.status(400).json({ success: false, message: error });
    const center = await DiagnosticCenter.findById(req.params.id);
    if (!center) return res.status(404).json({ success: false, message: 'Diagnostic center not found' });
    for (const k of CENTER_FIELDS) if (req.body[k] !== undefined) center[k] = req.body[k];
    await center.save();
    await recordAudit(req, 'center.update', { targetType: 'DiagnosticCenter', targetId: center._id, meta: { fields: Object.keys(req.body) } });
    return res.json({ success: true, center: center.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const { testIds, packageId, address, contactPhone, preferredDate, timeSlot, centerId } = req.body;
    if (!address || !contactPhone || !preferredDate || !timeSlot) {
      return res.status(400).json({ success: false, message: 'address, contactPhone, preferredDate, timeSlot required' });
    }
    const resolved = await resolveSelection({ testIds, packageId });
    if (resolved.error) return res.status(400).json({ success: false, message: resolved.error });
    const { tests: rows, discountPercent, packageName } = resolved;
    if (!rows.length) return res.status(400).json({ success: false, message: 'No valid tests selected' });

    // Pick the diagnostic center: the patient's choice, else the best eligible one.
    const centerCount = await DiagnosticCenter.countDocuments({ isActive: true });
    let center = null;
    let quote = null;
    if (centerId) {
      if (!mongoose.Types.ObjectId.isValid(centerId)) {
        return res.status(400).json({ success: false, message: 'Invalid centerId' });
      }
      center = await DiagnosticCenter.findById(centerId);
      if (!center || !center.isActive) return res.status(404).json({ success: false, message: 'Diagnostic center not found' });
      if (!center.acceptingOrders) {
        return res.status(409).json({ success: false, code: 'CENTER_NOT_ACCEPTING', message: `${center.name} is not accepting orders right now. Please choose another center.` });
      }
      if (!center.homeCollection) {
        return res.status(400).json({ success: false, message: `${center.name} does not offer home collection` });
      }
      quote = buildQuote(center, rows, { discountPercent });
      if (!quote.offersAll) {
        return res.status(400).json({ success: false, code: 'CENTER_MISSING_TESTS', message: `${center.name} does not offer: ${quote.missing.join(', ')}` });
      }
    } else if (centerCount > 0) {
      const all = await DiagnosticCenter.find({ isActive: true, acceptingOrders: true, homeCollection: true });
      const options = all
        .map((c) => ({ c, q: buildQuote(c, rows, { discountPercent }) }))
        .filter((o) => o.q.offersAll)
        .sort((x, y) => Number(y.c.isOpenAt()) - Number(x.c.isOpenAt()) || x.q.total - y.q.total);
      if (!options.length) {
        return res.status(409).json({ success: false, code: 'NO_CENTER_AVAILABLE', message: 'No diagnostic center can currently handle all selected tests' });
      }
      ({ c: center, q: quote } = options[0]);
    }

    let tests;
    let subtotal;
    let discount = 0;
    let collectionFee = 0;
    let totalAmount;
    if (center) {
      tests = quote.lines;
      subtotal = quote.subtotal;
      discount = quote.discount;
      collectionFee = quote.collectionFee;
      totalAmount = quote.total;
    } else {
      // No centers configured: fall back to the catalogue price list.
      tests = rows.map((t) => ({ testId: t._id, code: t.code, name: t.name, price: t.price }));
      subtotal = tests.reduce((sum, t) => sum + t.price, 0);
      discount = Math.round((subtotal * discountPercent) / 100);
      totalAmount = subtotal - discount;
    }

    const order = new DiagnosticOrder({
      patient: req.user._id,
      center: center?._id,
      centerName: center?.name || '',
      centerArea: center?.area || '',
      centerPhone: center?.phone || '',
      tests,
      packageName: packageName || packageId || '',
      address,
      contactPhone,
      preferredDate,
      timeSlot,
      subtotal,
      discount,
      collectionFee,
      totalAmount,
      status: 'pending_dispatch',
      statusHistory: [{ status: 'pending_dispatch', at: new Date(), note: center ? `Order placed with ${center.name}` : 'Order placed' }],
    });

    const phlebotomist = await User.findOne({ role: 'phlebotomist', isActive: true }).sort({ createdAt: 1 });
    if (phlebotomist) {
      order.phlebotomist = phlebotomist._id;
      order.status = 'assigned';
      order.etaMinutes = 45;
      order.statusHistory.push({ status: 'assigned', at: new Date(), note: 'Phlebotomist assigned' });
    }
    await order.save();
    await notify(req.user._id, {
      type: 'order_update',
      title: center ? `Order placed with ${center.name}` : 'Home collection order placed',
      body: `Total ৳${totalAmount}${collectionFee ? ` incl. ৳${collectionFee} collection fee` : ''}. ${preferredDate}, ${timeSlot}.`,
      link: `/reports?order=${order._id}`,
      sms: true,
    });

    return res.status(201).json({ success: true, order: order.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function listMyOrders(req, res, next) {
  try {
    const pg = parsePagination(req.query, { defaultLimit: 50 });
    const query = { patient: req.user._id };
    const [rows, total] = await Promise.all([
      DiagnosticOrder.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
      DiagnosticOrder.countDocuments(query),
    ]);
    return res.json({ success: true, orders: rows.map((o) => o.toPublicJSON()), pagination: pageMeta(pg, total) });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const isOwner = order.patient.toString() === req.user._id.toString();
    const isStaff = ['admin', 'phlebotomist'].includes(req.user.role);
    const isAssigned =
      req.user.role === 'phlebotomist' &&
      order.phlebotomist?.toString() === req.user._id.toString();
    const isSharedDoctor =
      req.user.role === 'doctor' &&
      order.sharedDoctorIds.some((id) => id.toString() === req.user._id.toString());
    if (!isOwner && !isStaff && !isAssigned && !isSharedDoctor) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    const json = order.toPublicJSON();
    if (isOwner) {
      json.downloadToken = signReportDownload(order._id.toString(), req.user._id.toString());
    }
    return res.json({ success: true, order: json });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status, barcodeId, etaMinutes, collectionNote, criticalFlags } = req.body;
    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (req.user.role === 'phlebotomist') {
      if (order.phlebotomist?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not assigned to this order' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    if (status && status !== order.status) {
      order.statusHistory.push({ status, at: new Date(), note: collectionNote || '' });
    }
    if (status) order.status = status;
    if (barcodeId) order.barcodeId = barcodeId;
    if (etaMinutes !== undefined) order.etaMinutes = etaMinutes;
    if (collectionNote) order.collectionNote = collectionNote;
    if (Array.isArray(criticalFlags)) order.criticalFlags = criticalFlags;
    await order.save();
    if (status) {
      await notify(order.patient, {
        type: 'order_update',
        title: `Sample order: ${status.replace(/_/g, ' ')}`,
        body: order.barcodeId ? `Specimen ${order.barcodeId}.` : 'Your home collection order was updated.',
        link: '/reports',
        sms: status === 'sample_collected' || status === 'en_route',
      });
    }
    return res.json({ success: true, order: order.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

/** Parse the optional `results` JSON field and derive abnormal flags (FR-24). */
function parseResults(raw) {
  if (raw === undefined || raw === null || raw === '') return { results: [] };
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return { error: 'results must be valid JSON' };
    }
  }
  if (!Array.isArray(arr)) return { error: 'results must be an array' };
  const results = [];
  for (const r of arr) {
    const value = Number(r.value);
    if (!r.code || !Number.isFinite(value)) return { error: 'each result needs a code and a numeric value' };
    const refLow = r.refLow === undefined || r.refLow === '' ? undefined : Number(r.refLow);
    const refHigh = r.refHigh === undefined || r.refHigh === '' ? undefined : Number(r.refHigh);
    let flag = r.flag || 'normal';
    if (!r.flag) {
      if (refLow !== undefined && value < refLow) flag = 'low';
      else if (refHigh !== undefined && value > refHigh) flag = 'high';
    }
    if (!['normal', 'low', 'high', 'critical'].includes(flag)) return { error: 'invalid result flag' };
    results.push({ code: String(r.code).toUpperCase(), name: r.name || r.code, value, unit: r.unit || '', refLow, refHigh, flag });
  }
  return { results };
}

async function uploadReport(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'PDF report file required' });
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const parsed = parseResults(req.body.results);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
    if (req.file.mimetype !== 'application/pdf' && !req.file.originalname?.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ success: false, message: 'Report must be a PDF file' });
    }
    ensureReportsDir();
    const hash = hashFileBuffer(req.file.buffer);
    const fileName = `${order._id.toString()}-${Date.now()}.pdf`;
    const dest = path.join(env.reportsStorageDir, fileName);
    fs.writeFileSync(dest, req.file.buffer);
    order.reportFileName = fileName;
    order.reportSha256 = hash;
    order.status = 'completed';
    order.statusHistory.push({ status: 'completed', at: new Date(), note: 'Signed report uploaded' });
    order.reportedAt = new Date();
    order.results = parsed.results;
    order.criticalFlags = parsed.results.filter((r) => r.flag !== 'normal').map((r) => `${r.name}: ${r.flag}`);
    await order.save();
    await recordAudit(req, 'report.upload', { targetType: 'DiagnosticOrder', targetId: order._id, meta: { sha256: hash } });
    await notify(order.patient, {
      type: 'report_ready',
      title: 'Your lab report is ready',
      body: order.criticalFlags.length ? `Attention: ${order.criticalFlags.join(', ')}` : 'Signed PDF available in Reports.',
      link: '/reports',
      sms: true,
    });
    return res.json({ success: true, order: order.toPublicJSON(), reportSha256: hash });
  } catch (err) {
    next(err);
  }
}

async function downloadReport(req, res, next) {
  try {
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order || !order.reportFileName) {
      return res.status(404).json({ success: false, message: 'Report not available' });
    }
    const token = req.query.token;
    const patientId = req.user._id.toString();
    const isOwner = order.patient.toString() === patientId;
    const isSharedDoctor =
      req.user.role === 'doctor' &&
      order.sharedDoctorIds.some((id) => id.toString() === req.user._id.toString());
    if (!isOwner && !isSharedDoctor && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    if (isOwner && !verifyReportDownload(token, order._id.toString(), patientId)) {
      return res.status(403).json({ success: false, message: 'Invalid or expired download token' });
    }
    const filePath = path.join(env.reportsStorageDir, order.reportFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Report file missing on server' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Report-SHA256', order.reportSha256);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
}

async function shareWithDoctor(req, res, next) {
  try {
    const { doctorId } = req.body;
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'Valid doctorId required' });
    }
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the patient can share reports' });
    }
    if (!order.sharedDoctorIds.some((id) => id.toString() === doctorId)) {
      const doctor = await User.findById(doctorId);
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      order.sharedDoctorIds.push(doctorId);
      await order.save();
      await notify(doctorId, {
        type: 'system',
        title: 'A patient shared a lab report with you',
        body: `Order ${order._id.toString().slice(-6).toUpperCase()}`,
        link: '/dashboard',
      });
    }
    return res.json({ success: true, order: order.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function phlebotomistQueue(req, res, next) {
  try {
    const query =
      req.user.role === 'admin'
        ? { status: { $nin: ['completed', 'cancelled'] } }
        : { phlebotomist: req.user._id, status: { $nin: ['completed', 'cancelled'] } };
    const orders = await DiagnosticOrder.find(query).sort({ preferredDate: 1 }).limit(50);
    return res.json({ success: true, orders: orders.map((o) => o.toPublicJSON()) });
  } catch (err) {
    next(err);
  }
}

/** FR-27: per-test history for the signed-in patient, ready for charting. */
async function myTrends(req, res, next) {
  try {
    const orders = await DiagnosticOrder.find({
      patient: req.user._id,
      'results.0': { $exists: true },
    }).sort({ reportedAt: 1, createdAt: 1 });
    const series = new Map();
    for (const o of orders) {
      const when = (o.reportedAt || o.createdAt).toISOString().slice(0, 10);
      for (const r of o.results) {
        if (req.query.code && r.code !== String(req.query.code).toUpperCase()) continue;
        if (!series.has(r.code)) {
          series.set(r.code, { code: r.code, name: r.name, unit: r.unit, refLow: r.refLow, refHigh: r.refHigh, points: [] });
        }
        series.get(r.code).points.push({ date: when, value: r.value, flag: r.flag, orderId: o._id.toString() });
      }
    }
    return res.json({ success: true, series: [...series.values()] });
  } catch (err) {
    next(err);
  }
}

/** Admin: every order, paginated, optional ?status= filter. */
async function listAllOrders(req, res, next) {
  try {
    const pg = parsePagination(req.query);
    const query = {};
    if (req.query.status) {
      if (!ORDER_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Invalid status filter' });
      }
      query.status = req.query.status;
    }
    const [rows, total] = await Promise.all([
      DiagnosticOrder.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
      DiagnosticOrder.countDocuments(query),
    ]);
    return res.json({ success: true, orders: rows.map((o) => o.toPublicJSON()), pagination: pageMeta(pg, total) });
  } catch (err) {
    next(err);
  }
}

function validateTestBody(body, partial) {
  if (!partial || body.code !== undefined) {
    if (!body.code || !/^[A-Za-z0-9_-]{2,20}$/.test(body.code)) return 'code must be 2-20 letters, digits, - or _';
  }
  if (!partial || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) return 'name is required';
  }
  if (!partial || body.category !== undefined) {
    if (!body.category || !String(body.category).trim()) return 'category is required';
  }
  if (!partial || body.price !== undefined) {
    if (!Number.isFinite(Number(body.price)) || Number(body.price) < 0) return 'price must be a non-negative number';
  }
  return null;
}

async function createTest(req, res, next) {
  try {
    const error = validateTestBody(req.body, false);
    if (error) return res.status(400).json({ success: false, message: error });
    const { code, name, category, price, fastingRequired, tubeType, preparation } = req.body;
    const test = await DiagnosticTest.create({ code, name, category, price: Number(price), fastingRequired, tubeType, preparation });
    await recordAudit(req, 'test.create', { targetType: 'DiagnosticTest', targetId: test._id, meta: { code: test.code } });
    return res.status(201).json({ success: true, test: test.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function updateTest(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid test id' });
    }
    const error = validateTestBody(req.body, true);
    if (error) return res.status(400).json({ success: false, message: error });
    const test = await DiagnosticTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    for (const key of ['name', 'category', 'price', 'fastingRequired', 'tubeType', 'preparation', 'isActive']) {
      if (req.body[key] !== undefined) test[key] = req.body[key];
    }
    await test.save();
    await recordAudit(req, 'test.update', { targetType: 'DiagnosticTest', targetId: test._id, meta: { fields: Object.keys(req.body) } });
    return res.json({ success: true, test: test.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCenters,
  getCenter,
  createCenter,
  updateCenter,
  myTrends,
  listAllOrders,
  createTest,
  updateTest,
  listTests,
  listPackages,
  createOrder,
  listMyOrders,
  getOrder,
  updateOrderStatus,
  uploadReport,
  downloadReport,
  shareWithDoctor,
  phlebotomistQueue,
};
