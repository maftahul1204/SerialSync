const mongoose = require('mongoose');
const { FamilyMember, RELATIONS } = require('../models/FamilyMember');

const MAX_MEMBERS = 10;

function validateBody(body, partial = false) {
  const { fullName, relation, age } = body;
  if (!partial || fullName !== undefined) {
    if (!fullName || !String(fullName).trim()) return 'fullName is required';
  }
  if (!partial || relation !== undefined) {
    if (!RELATIONS.includes(relation)) return `relation must be one of: ${RELATIONS.join(', ')}`;
  }
  if (age !== undefined && age !== null && (!Number.isFinite(Number(age)) || age < 0 || age > 120)) {
    return 'age must be between 0 and 120';
  }
  return null;
}

async function list(req, res, next) {
  try {
    const rows = await FamilyMember.find({ owner: req.user._id }).sort({ createdAt: 1 });
    return res.json({ success: true, members: rows.map((m) => m.toPublicJSON()) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const error = validateBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const count = await FamilyMember.countDocuments({ owner: req.user._id });
    if (count >= MAX_MEMBERS) {
      return res.status(409).json({ success: false, message: `You can add up to ${MAX_MEMBERS} family members` });
    }
    const { fullName, relation, gender, age, phone, bloodGroup } = req.body;
    const member = await FamilyMember.create({ owner: req.user._id, fullName, relation, gender, age, phone, bloodGroup });
    return res.status(201).json({ success: true, member: member.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function findOwned(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid member id' });
    return null;
  }
  const member = await FamilyMember.findOne({ _id: req.params.id, owner: req.user._id });
  if (!member) res.status(404).json({ success: false, message: 'Family member not found' });
  return member;
}

async function update(req, res, next) {
  try {
    const member = await findOwned(req, res);
    if (!member) return;
    const error = validateBody(req.body, true);
    if (error) return res.status(400).json({ success: false, message: error });
    for (const key of ['fullName', 'relation', 'gender', 'age', 'phone', 'bloodGroup']) {
      if (req.body[key] !== undefined) member[key] = req.body[key];
    }
    await member.save();
    return res.json({ success: true, member: member.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const member = await findOwned(req, res);
    if (!member) return;
    await member.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
