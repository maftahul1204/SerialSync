/**
 * Single source of truth for "where can this role go". Used by the staff header and the
 * patient account menu so nobody has to type URLs.
 */

const DASHBOARD = { href: '/dashboard', label: 'Dashboard', desc: 'Your overview' };
const PROFILE = { href: '/profile', label: 'Profile', desc: 'Account details' };
const NOTIFICATIONS = { href: '/notifications', label: 'Notifications', desc: 'Alerts and messages' };

const PORTALS = {
  schedule: { href: '/dashboard/schedule', label: 'Schedule portal', desc: 'Chambers, fees and weekly availability' },
  queue: { href: '/dashboard/assistant', label: 'Queue console', desc: 'Advance serials, walk-ins, delays' },
  collections: { href: '/dashboard/collections', label: 'Home collections', desc: 'Dispatch queue and barcodes' },
  approvals: { href: '/dashboard/admin', label: 'Doctor approvals', desc: 'Review BMDC registrations' },
  lab: { href: '/dashboard/admin/diagnostics', label: 'Lab reports & catalogue', desc: 'Upload reports, manage tests' },
  audit: { href: '/dashboard/admin/audit', label: 'Audit log', desc: 'Who changed what' },
};

/** Patient account-menu entries (the main patient nav lives in PatientShell). */
export const PATIENT_MENU = [
  { href: '/profile', label: 'Profile', desc: 'Account details' },
  { href: '/family', label: 'Family care', desc: 'People you book for' },
  { href: '/diagnostics', label: 'Book home tests', desc: 'Lab tests collected at home' },
  { href: '/bookings', label: 'My serial bookings', desc: 'Upcoming and past serials' },
  NOTIFICATIONS,
];

/**
 * Links for a staff role. `portals` are the role-specific workspaces; `core` are always shown.
 * Doctors only get the schedule portal once approved.
 */
export function staffNav(user) {
  if (!user) return { core: [DASHBOARD], portals: [] };
  const core = [DASHBOARD];
  let portals = [];
  switch (user.role) {
    case 'doctor':
      if (user.doctorApprovalStatus === 'approved') portals = [PORTALS.schedule];
      break;
    case 'assistant':
      portals = [PORTALS.queue];
      break;
    case 'phlebotomist':
      portals = [PORTALS.collections];
      break;
    case 'admin':
      portals = [PORTALS.approvals, PORTALS.lab, PORTALS.audit, PORTALS.schedule, PORTALS.queue, PORTALS.collections];
      break;
    default:
      break;
  }
  return { core, portals, account: [PROFILE, NOTIFICATIONS] };
}

/** Does `pathname` belong to `href`? Exact match, or a sub-path for non-root sections. */
export function isActivePath(pathname, href) {
  if (!pathname) return false;
  if (pathname === href) return true;
  // Section links such as /dashboard/admin should stay active on nested pages that have no own link.
  const children = Object.values(PORTALS)
    .map((p) => p.href)
    .filter((h) => h !== href && h.startsWith(`${href}/`));
  if (children.some((c) => pathname === c || pathname.startsWith(`${c}/`))) return false;
  return href !== '/dashboard' && pathname.startsWith(`${href}/`);
}
