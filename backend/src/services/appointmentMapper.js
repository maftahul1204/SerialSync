async function toAppointmentJSON(doc, { doctor, chamber, schedule } = {}) {
  if (!doc) return null;
  const base = {
    id: doc._id.toString(),
    doctorId: doc.doctor.toString(),
    scheduleId: doc.schedule.toString(),
    chamberId: doc.chamber.toString(),
    date: doc.date,
    slotStart: doc.slotStart,
    slotEnd: doc.slotEnd,
    serialNumber: doc.serialNumber,
    status: doc.status,
    confirmationCode: doc.confirmationCode,
    patientNote: doc.patientNote || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if (doctor) {
    base.doctor = {
      id: doctor._id.toString(),
      fullName: doctor.fullName,
      specialtyTitle: doctor.doctorProfile?.specialtyTitle || '',
    };
  }
  if (chamber) {
    base.chamber = {
      id: chamber._id.toString(),
      name: chamber.name,
      address: chamber.address || '',
      area: chamber.area || '',
      city: chamber.city || '',
    };
  }
  if (schedule) {
    base.consultationFee = schedule.consultationFee;
  }
  return base;
}

module.exports = { toAppointmentJSON };
