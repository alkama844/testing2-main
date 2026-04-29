## Plan: Mailpro-Nafij Modernization V2.1

Deliver a phased modernization focused on brand-consistent SEO everywhere, dark claymorphism UI/UX, richer admin controls, and an advanced inbox reader that supports raw and HTML views with auto content-mode detection. Primary domain is fixed to mailpro.nafij.me, with alternates mailpro.nafijrahaman.me and mailpro.vercel.app.

**Steps**
1. Phase 0 - Standards Lock (foundation)
1. Finalize global naming standard for app identity and SEO naming convention (site name + feature context) to be applied in titles, headings, classes, ids, aria-labels, and image alt text.
2. Establish domain strategy and enforce one canonical primary domain (mailpro.nafij.me) with alternate domain handling for mailpro.nafijrahaman.me and mailpro.vercel.app.
3. Define UI quality gate (responsive breakpoints, contrast, interaction latency, touch affordances, keyboard focus visibility).

1. Phase 1 - SEO Everywhere System
1. Add page-level SEO metadata across all public pages: title, description, canonical, robots, Open Graph, Twitter card, structured data pointers.
2. Implement semantic naming policy for frontend identifiers:
1. Class names become purpose + brand scoped where reasonable.
2. JS ids align with semantic meaning and SEO-friendly naming.
3. Alt text, aria labels, link titles include contextual brand references naturally.
3. Introduce reusable SEO helper constants in frontend scripts for repeated labels/site strings.
4. Ensure copy-level keyword integration remains natural and non-spammy while covering required terms (mail nafij, mailpro nafij, mail nafijpro, nafijrahaman).
5. Add crawl/index assets and route-safe exclusions:
1. public/robots.txt
2. public/sitemap.xml

1. Phase 2 - UI/UX Redesign (Dark Claymorphism + Special Design)
1. Build tokenized design system in public/style.css: dark palette, elevation layers, clay shadows, rounded geometry, motion tokens.
2. Implement clay-style 3D buttons for all actions with consistent states (default, hover, active press, disabled, focus-visible).
3. Apply a special modern visual style (non-generic): atmospheric background, intentional typography hierarchy, and section-level visual contrast.
4. Improve responsive UX patterns for all pages:
1. Mobile-first spacing and touch targets
2. Tablet grid tuning
3. Desktop readability and density controls
5. Add motion choreography (entry + stagger + press) with reduced-motion support.

1. Phase 3 - Inbox Reader Upgrade (Raw/HTML smart viewing)
1. Enhance email detail rendering in public/inbox.html to support:
1. Raw source view button
2. HTML rendered view button
3. Text fallback view button if needed
2. Add auto-detect content type from Gmail payload/headers and auto-select initial view mode.
3. Add user toggle control so users can switch mode manually at any time.
4. Add safety for rendered HTML view:
1. sanitize/contain rendering strategy (sandbox or strict sanitization)
2. block unsafe script execution
5. Update backend email payload in server.js where needed to return sufficient raw/html/plain-part metadata for mode switching.

1. Phase 4 - Admin System Enhancement
1. Extend models/Account.js with lock metadata and auditability:
1. lock reason
2. lock actor
3. lock timestamp
4. optional expiry
5. unlock history
2. Keep current isPremium behavior backward-compatible during migration.
3. Expand admin controls in server.js and public/admin.html:
1. lock/unlock with reason
2. optional expiry control
3. lock history visibility
4. filtering/search UX for account states
4. Move hardcoded admin/session secrets to environment configuration in env.example and server.js.

1. Phase 5 - New Pages and Brand Trust Content
1. Add author page using profile data from author.MD.
2. Add dedicated credit page with modern special layout highlighting project contributors/support.
3. Add special thanks section on credit page with hosting acknowledgment targeting contact identity: hosting @nafijrahaman.me.
4. Connect all pages through consistent footer/nav links (Home, Inbox, Admin, Author, Credits, Privacy, Terms).

1. Phase 6 - Gmail Sending System (V1)
1. Add compose + send workflow in public/inbox.html.
2. Add send endpoint and Gmail send scope updates in server.js.
3. Add validation/rate-limiting and clear UX feedback.
4. Add sending activity trace for admin observability.

1. Phase 7 - QA, Security, Launch
1. Security checks: no hardcoded secrets, protected admin paths, validated params/body.
2. UX QA: responsive testing, accessibility checks, motion behavior on low-performance devices.
3. Reader QA: verify auto-detect correctness across plain text, HTML, multipart, and malformed emails.
4. SEO QA: canonical correctness, social tags preview, schema validation, robots/sitemap validation under primary and alternate domains.
5. Release sequencing: deploy to primary domain first, then validate alternate domain behavior and canonical consistency.

**Parallelization and Dependencies**
1. Can run in parallel:
1. Phase 1 (SEO everywhere system) and Phase 2 (UI redesign) after Phase 0 standards lock.
2. Phase 5 (author/credit content) can run parallel to late Phase 2 styling.
2. Sequential dependencies:
1. Phase 3 reader upgrade depends on confirming backend payload format adjustments.
2. Phase 4 model migration before advanced admin UI controls.
3. Phase 6 Gmail send after OAuth scope transition plan is finalized.

**Relevant files**
- /workspaces/testing/server.js - route expansion, email payload shaping, send endpoint, domain/canonical behavior helpers.
- /workspaces/testing/models/Account.js - lock/audit schema extension.
- /workspaces/testing/public/style.css - dark claymorphism tokens, 3D button states, responsive/motion system.
- /workspaces/testing/public/index.html - homepage SEO, nav/footer unification, special design sections.
- /workspaces/testing/public/inbox.html - reader mode toggle (raw/html/auto), compose/send UI, improved UX.
- /workspaces/testing/public/admin.html - enhanced lock controls and monitoring UX.
- /workspaces/testing/public/privacy.html - metadata and naming standard compliance.
- /workspaces/testing/public/terms.html - metadata and naming standard compliance.
- /workspaces/testing/public/author.html - author profile page.
- /workspaces/testing/public/credits.html - new credits + hosting thanks page.
- /workspaces/testing/public/robots.txt - crawl directives.
- /workspaces/testing/public/sitemap.xml - indexable URL map.
- /workspaces/testing/author.MD - source data for person/entity SEO and author content.
- /workspaces/testing/env.example - admin/security/domain/send env variables.
- /workspaces/testing/README.md - updated docs and feature map.

**Verification**
1. SEO structure audit on all pages: title/description/canonical/og/twitter/schema presence and consistency.
2. Semantic naming audit: class/id/aria/alt naming follows agreed SEO-friendly convention without overstuffing.
3. Reader tests:
1. HTML-only email auto-renders HTML mode
2. Plain-text-only email auto-renders text/raw mode
3. Multipart email chooses best mode and allows manual toggle
4. Unsafe HTML content remains non-executable
4. Admin tests: lock/unlock reason + expiry + audit record visibility.
5. UI tests: responsive layouts and clay 3D interactions on mobile/tablet/desktop.
6. Domain tests: canonical always mailpro.nafij.me while alternate domains remain functional.

**Decisions (locked from user input)**
- Primary canonical domain: mailpro.nafij.me.
- Alternate working domains: mailpro.nafijrahaman.me, mailpro.vercel.app.
- Must include SEO naming in class/id/alt/labels and site naming consistency across UI.
- Must include raw view + HTML view + auto detect + manual toggle in inbox reader.
- Must include new credit page and special hosting thanks targeting hosting @nafijrahaman.me.

**Scope Boundaries**
- Included: comprehensive SEO, modern dark claymorphism UI, inbox view-mode intelligence, admin lock upgrades, credits/author pages, send-mail v1.
- Deferred: enterprise RBAC matrix, advanced campaign automation, localization, analytics warehouse.

**Further Considerations**
1. SEO naming in classes/ids should be moderated to avoid bloated CSS selectors and maintainability issues; prefer semantic + brand prefix only where meaningful.
2. Raw email view may expose sensitive header details; define whether full raw MIME is always shown or gated behind an explicit advanced toggle.
3. If mailpro.vercel.app stays as fallback, ensure robots/canonical policy prevents duplicate indexing against primary domain.