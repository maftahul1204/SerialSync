const { User } = require('../models/User');
const { Chamber } = require('../models/Chamber');
const { DoctorSchedule } = require('../models/DoctorSchedule');
const { SlotBooking } = require('../models/SlotBooking');
const { SPECIALTIES, DHAKA_AREAS } = require('../constants/specialties');
const {
  generateSlotsForScheduleOnDate,
  applyBookingCounts,
} = require('../utils/appointmentSlots');
const { formatDateYmd, dayOfWeekForYmd, timeToMinutes } = require('../utils/scheduleTime');

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function doctorMatchesSearch(doctor, chambers, search) {
  if (!search) return true;
  const haystack = [
    doctor.fullName,
    doctor.doctorProfile?.specialtyTitle,
    doctor.doctorProfile?.affiliations,
    ...chambers.map((c) => c.name),
    ...chambers.map((c) => c.address),
    ...chambers.map((c) => c.area),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(search);
}

function doctorMatchesArea(chambers, area) {
  if (!area || area === 'all') return true;
  const target = normalizeSearch(area);
  return chambers.some((c) => normalizeSearch(c.area) === target || normalizeSearch(c.city) === target);
}

function doctorMatchesSpecialty(doctor, specialty) {
  if (!specialty || specialty === 'all') return true;
  const slug = doctor.doctorProfile?.specialtySlug || '';
  return slug === specialty;
}

function pickTodaySchedule(schedules, chambers, todayDow) {
  const todays = schedules.filter((s) => s.daysOfWeek.includes(todayDow));
  if (!todays.length) return null;
  const nowMinutes = timeToMinutes(
    `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
  );
  const inSession = todays.find((s) => {
    const start = timeToMinutes(s.startTime);
    const end = timeToMinutes(s.endTime);
    return nowMinutes >= start && nowMinutes <= end;
  });
  return inSession || todays[0];
}

function summarizeTodaySlots(schedules, bookings, todayYmd, todayDow) {
  let serialsLeft = 0;
  let bookedToday = 0;
  let slotDuration = 15;
  let fee = null;

  for (const schedule of schedules) {
    if (!schedule.daysOfWeek.includes(todayDow)) continue;
    slotDuration = schedule.slotDurationMinutes || slotDuration;
    fee = schedule.consultationFee;
    const generated = generateSlotsForScheduleOnDate(schedule, todayYmd);
    const withCounts = applyBookingCounts(generated, bookings);
    for (const slot of withCounts) {
      serialsLeft += slot.remaining;
      bookedToday += slot.bookedCount;
    }
  }

  const estimatedWaitMinutes = bookedToday > 0 ? Math.max(10, Math.round(bookedToday * slotDuration * 0.65)) : null;

  return { serialsLeft, bookedToday, estimatedWaitMinutes, fee };
}

function toPublicDoctorCard(doctor, chambers, schedules, bookings, todayYmd, todayDow) {
  const profile = doctor.doctorProfile || {};
  const specialtyMeta = SPECIALTIES.find((s) => s.slug === profile.specialtySlug);
  const todaySchedule = pickTodaySchedule(schedules, chambers, todayDow);
  const todayChamber = todaySchedule
    ? chambers.find((c) => c._id.toString() === todaySchedule.chamber.toString())
    : chambers[0];

  const { serialsLeft, estimatedWaitMinutes, fee } = summarizeTodaySlots(
    schedules,
    bookings,
    todayYmd,
    todayDow
  );

  const hasTodayHours = schedules.some((s) => s.daysOfWeek.includes(todayDow));
  const isLive = Boolean(todaySchedule && hasTodayHours && serialsLeft > 0);

  let statusBanner = null;
  if (hasTodayHours && todayChamber) {
    const room = profile.roomLabel ? ` (${profile.roomLabel})` : '';
    statusBanner = {
      type: 'today_chamber',
      text: `Today at ${todayChamber.name}${room}`,
    };
  } else if (serialsLeft > 0) {
    statusBanner = { type: 'available', text: 'Available Today' };
  }

  return {
    id: doctor._id.toString(),
    fullName: doctor.fullName,
    specialtyTitle: profile.specialtyTitle || specialtyMeta?.title || 'Specialist',
    specialtySlug: profile.specialtySlug || '',
    affiliations: profile.affiliations || todayChamber?.address || '',
    rating: profile.rating ?? 4.8,
    avatarUrl: profile.avatarUrl || '',
    isOnline: profile.isOnline !== false,
    chambers: chambers.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      area: c.area || '',
      city: c.city || 'Dhaka',
      address: c.address || '',
    })),
    today: {
      hasHours: hasTodayHours,
      isLive,
      serialsLeft,
      estimatedWaitMinutes,
      chamberFee: fee ?? todaySchedule?.consultationFee ?? null,
      chamberName: todayChamber?.name || '',
      statusBanner,
    },
  };
}

async function listDoctors(filters = {}) {
  const search = normalizeSearch(filters.search);
  const area = filters.area || 'all';
  const specialty = filters.specialty || 'all';
  const todayYmd = formatDateYmd(new Date());
  const todayDow = dayOfWeekForYmd(todayYmd);

  const doctors = await User.find({
    role: 'doctor',
    isActive: true,
    doctorApprovalStatus: 'approved',
  }).lean();
  if (!doctors.length) {
    return { doctors: [], meta: { specialties: SPECIALTIES, areas: DHAKA_AREAS } };
  }

  const doctorIds = doctors.map((d) => d._id);
  const [chambers, schedules, bookings] = await Promise.all([
    Chamber.find({ doctor: { $in: doctorIds }, isActive: true }).lean(),
    DoctorSchedule.find({ doctor: { $in: doctorIds }, status: 'active' }).lean(),
    SlotBooking.find({ doctor: { $in: doctorIds }, date: todayYmd }).lean(),
  ]);

  const chambersByDoctor = new Map();
  for (const c of chambers) {
    const key = c.doctor.toString();
    if (!chambersByDoctor.has(key)) chambersByDoctor.set(key, []);
    chambersByDoctor.get(key).push(c);
  }

  const schedulesByDoctor = new Map();
  for (const s of schedules) {
    const key = s.doctor.toString();
    if (!schedulesByDoctor.has(key)) schedulesByDoctor.set(key, []);
    schedulesByDoctor.get(key).push(s);
  }

  const bookingsByDoctor = new Map();
  for (const b of bookings) {
    const key = b.doctor.toString();
    if (!bookingsByDoctor.has(key)) bookingsByDoctor.set(key, []);
    bookingsByDoctor.get(key).push(b);
  }

  let cards = doctors.map((doctor) => {
    const id = doctor._id.toString();
    const docChambers = chambersByDoctor.get(id) || [];
    const docSchedules = schedulesByDoctor.get(id) || [];
    const docBookings = bookingsByDoctor.get(id) || [];
    return toPublicDoctorCard(doctor, docChambers, docSchedules, docBookings, todayYmd, todayDow);
  });

  cards = cards.filter((card, index) => {
    const doctor = doctors[index];
    const docChambers = chambersByDoctor.get(doctor._id.toString()) || [];
    return (
      doctorMatchesSearch(doctor, docChambers, search) &&
      doctorMatchesArea(docChambers, area) &&
      doctorMatchesSpecialty(doctor, specialty)
    );
  });

  cards.sort((a, b) => {
    if (a.today.isLive !== b.today.isLive) return a.today.isLive ? -1 : 1;
    if (a.today.serialsLeft !== b.today.serialsLeft) return b.today.serialsLeft - a.today.serialsLeft;
    return b.rating - a.rating;
  });

  return { doctors: cards, meta: { specialties: SPECIALTIES, areas: DHAKA_AREAS } };
}

module.exports = { listDoctors, SPECIALTIES, DHAKA_AREAS };
