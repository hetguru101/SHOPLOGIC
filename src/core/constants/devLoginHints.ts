/**
 * Defaults used by `npm run seed:owner` / `npm run seed:platform-owner`.
 * Shown on the login screen only when `import.meta.env.DEV` is true — never ship real passwords in production builds.
 */
export const DEV_SEED_OWNER_EMAIL = 'owner@shoplogic.test';
/** Used by `seed:owner`, `seed:platform-owner`, and kiosk/tech demo Auth users. */
export const DEV_SEED_OWNER_PASSWORD = 'ShopLogic-Owner-Test-2026!';

/** Account with no shop until you complete in-app onboarding (`npm run seed:platform-owner`). */
export const DEV_PLATFORM_OWNER_EMAIL = 'owner.bootstrap@shoplogic.test';

/** One floor terminal per demo shop (`npm run seed:owner`). */
export const DEV_KIOSK_EMAIL = 'floor.kiosk@shoplogic.test';

/** Demo technician on the kiosk roster (`npm run seed:owner`). */
export const DEV_KIOSK_TECH_EMAIL = 'demo.kiosktech@shoplogic.test';
export const DEV_KIOSK_TECH_PIN = '1234';
