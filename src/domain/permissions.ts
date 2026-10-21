export const STAFF_PERMISSIONS = [
  [
    "listings",
    "Review listings",
    "Hide, restore or remove snack and Pawn listings.",
  ],
  [
    "catalogue",
    "Manage catalogue",
    "Add or rename products and choose shared photos.",
  ],
  ["uploads", "Review uploads", "Review product photos and payment QRs."],
  [
    "reports",
    "Review reports",
    "Read reports, record a response and resolve them.",
  ],
  [
    "accounts",
    "View accounts",
    "Search student names, IDs, contact details and locations.",
  ],
  [
    "reset_access",
    "Reset account access",
    "Issue temporary passwords after checking identity.",
  ],
  [
    "delete_accounts",
    "Delete student accounts",
    "Permanently remove ordinary student accounts and their listings.",
  ],
  [
    "block_accounts",
    "Suspend or unblock sellers",
    "Suspend ordinary sellers across the site and revoke their sessions.",
  ],
  [
    "manage_staff",
    "Manage Vice-Maintainers",
    "Assign roles and delegate only permissions this person already holds.",
  ],
  [
    "edit_identity",
    "Correct student IDs",
    "Correct a student's five-digit college ID after checking identity.",
  ],
  ["hostels", "Manage bhawans", "Add, rename or remove hostel entries."],
  [
    "site",
    "Manage site controls",
    "Change maintenance, availability, announcements and wordlists.",
  ],
  ["activity", "View activity", "Read the Maintainer audit log."],
  [
    "notifications",
    "View notifications",
    "See events for sections this person can access.",
  ],
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number][0];
type Staff =
  | {
      role?: string;
      permissions?: string | string[];
      must_change_password?: number;
    }
  | null
  | undefined;
export function isStaff(user: Staff) {
  return (
    !!user &&
    !user.must_change_password &&
    ["admin", "vice"].includes(user.role || "")
  );
}
export function permissionsOf(user: Staff): string[] {
  try {
    const value =
      typeof user?.permissions === "string"
        ? JSON.parse(user.permissions)
        : user?.permissions;
    return Array.isArray(value)
      ? value.filter((p) => typeof p === "string")
      : [];
  } catch {
    return [];
  }
}
export function hasPermission(user: Staff, permission: StaffPermission) {
  return (
    isStaff(user) &&
    (user?.role === "admin" || permissionsOf(user).includes(permission))
  );
}
export function validStudentId(value: unknown): value is string {
  return typeof value === "string" && /^\d{5}$/.test(value);
}
export function validUsername(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9_]{2,23}$/.test(value);
}
