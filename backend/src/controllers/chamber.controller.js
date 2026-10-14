const { Chamber } = require('../models/Chamber');

async function listMyChambers(req, res, next) {
  try {
    const chambers = await Chamber.find({ doctor: req.user._id }).sort({ name: 1 });
    return res.json({
      success: true,
      chambers: chambers.map((c) => c.toPublicJSON()),
    });
  } catch (err) {
    next(err);
  }
}

async function createChamber(req, res, next) {
  try {
    const { name, address, city, area, phone } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Chamber name is required' });
    }
    const chamber = await Chamber.create({
      doctor: req.user._id,
      name,
      address,
      city,
      area,
      phone,
    });
    return res.status(201).json({ success: true, chamber: chamber.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function updateChamber(req, res, next) {
  try {
    const chamber = await Chamber.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!chamber) {
      return res.status(404).json({ success: false, message: 'Chamber not found' });
    }
    const { name, address, city, area, phone, isActive } = req.body;
    if (name !== undefined) chamber.name = name;
    if (address !== undefined) chamber.address = address;
    if (city !== undefined) chamber.city = city;
    if (area !== undefined) chamber.area = area;
    if (phone !== undefined) chamber.phone = phone;
    if (isActive !== undefined) chamber.isActive = Boolean(isActive);
    await chamber.save();
    return res.json({ success: true, chamber: chamber.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyChambers, createChamber, updateChamber };
