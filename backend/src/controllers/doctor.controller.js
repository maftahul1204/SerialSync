const { listDoctors } = require('../services/doctorDirectory');

async function searchDoctors(req, res, next) {
  try {
    const { search, area, specialty } = req.query;
    const result = await listDoctors({ search, area, specialty });
    return res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchDoctors };
