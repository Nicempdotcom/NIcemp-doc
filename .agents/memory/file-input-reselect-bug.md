---
name: File input onChange not firing on repeated selection
description: A hidden <input type="file"> stops firing 'change' when the user re-selects the same file, making an upload UI look completely broken ("nothing happens, doesn't even flicker").
---

Browsers only fire `change` on `<input type="file">` when its `value` differs from before. If a user repeatedly tries to upload the same file (very common while debugging an upload flow), the second and later attempts produce no event at all — no error, no state change, nothing visibly happens.

**Why:** the input's `value` is unchanged, so from the DOM's perspective nothing changed, so no event fires. This uniquely defeats surface-level debugging (console, on-page error banners) because the app code never even runs.

**How to apply:** in any file-drop-zone/file-input `onChange` handler, reset `e.target.value = ''` immediately after reading `e.target.files`, so the same file can be re-selected and still trigger the handler. When a user reports a file upload UI that "does nothing at all" on repeated tries but the OS file picker opens fine, suspect this before anything else — it's cheaper to fix than to chase worker/CSP/sandbox theories first.
