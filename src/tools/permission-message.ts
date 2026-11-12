/**
 * Reply when the user has turned a permission off. Names the phone's Settings app: "enable it in Settings"
 * was confused with OfflineMate's own Settings tab, which has no permission switches.
 */
export function permissionOffMessage(permission: "Calendar" | "Contacts" | "Notifications"): string {
  return `${permission} access is off for OfflineMate. To turn it on, open your phone's Settings app (not the Settings tab in OfflineMate), go to Apps > OfflineMate and allow ${permission}, then ask again.`;
}
