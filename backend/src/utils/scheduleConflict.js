const { DoctorSchedule } = require('../models/DoctorSchedule');
const { daysOverlap, rangesOverlap } = require('./scheduleTime');

async function findScheduleConflicts(doctorId, candidate, excludeScheduleId = null) {
  const query = {
    doctor: doctorId,
    status: 'active',
  };
  if (excludeScheduleId) {
    query._id = { $ne: excludeScheduleId };
  }

  const existing = await DoctorSchedule.find(query).lean();
  const conflicts = [];

  for (const row of existing) {
    if (!daysOverlap(candidate.daysOfWeek, row.daysOfWeek)) {
      continue;
    }
    if (
      rangesOverlap(candidate.startTime, candidate.endTime, row.startTime, row.endTime)
    ) {
      conflicts.push({
        scheduleId: row._id.toString(),
        chamberId: row.chamber.toString(),
        daysOfWeek: row.daysOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
      });
    }
  }

  return conflicts;
}

module.exports = { findScheduleConflicts };
