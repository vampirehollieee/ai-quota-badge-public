# Public fixes implementation plan

Goal: implement the requested organization selector, local-time formatting, cleanup, and browser-language UI on public-fixes, then submit a PR.

Architecture: retain quota row labels as stable internal identifiers. Translate only at presentation boundaries from Chrome locale message catalogs. Keep organization names in worker memory and selected IDs in local settings, outside quota history. Serialize organization selection with refreshes and reset only Claude observations when its effective organization changes.

Tasks:
- Add tests for organization default/selection/removal, privacy, and per-organization history isolation; implement provider selection and popup controls.
- Add zh_TW/en catalogs and a UI-language resolver. Translate static and dynamic UI, errors, badges and manifest metadata; use Intl's default timezone everywhere.
- Remove unused core files; update documentation and synthetic preview mocks.
- Run all tests and browser checks for English, Chinese and organization controls. Capture synthetic screenshots; check staged diff, commit, push public-fixes, open a PR against main.

Constraints: only this public repository; no private repository changes, merges, releases or store publication. No organization names in quota snapshots/reset events. No language switch. Watch for stale selection after organization removal, switching during a refresh, timezone day rollover, missing translations and long organization names.
