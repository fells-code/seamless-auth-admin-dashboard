---
"seamless-auth-admin-dashboard": minor
---

Add a Hosted Page Branding section to System Configuration for the OpenID Provider's hosted sign-in and consent pages. Admins can set a brand name, an https logo URL (with a small preview), the six page colors as a color picker plus hex value, and a system font stack, and see a live preview of both pages. Values are checked against the API's schema before saving, and WCAG 2.2 AA contrast warnings (4.5:1 for text, 3:1 for the primary color on the card) are shown without blocking the save. Saving asks for step-up and replaces the whole branding object, and Reset to Defaults clears it. Needs `@seamless-auth/types` 0.34.0-next.2.
