---
name: setState updater return value is stale
description: Trying to synchronously read a value out of a React setState updater callback always yields a stale/initial value, since the updater runs asynchronously on the next render.
---

Pattern that silently breaks: capturing a variable from inside a `setState(s => ...)` updater
and returning/using it immediately after the `setState` call, assuming it reflects state after
the update.

```js
let buf = null;
setState((s) => { buf = s.value; return { ...s, value: null }; });
return buf; // always the value BEFORE setState was called (often the initial value), not after
```

**Why:** React updater functions are queued and run during the next render/reconciliation, not
synchronously when `setState` is called. Code right after the `setState` call executes before
the updater has run, so any variable captured "inside" it is still whatever it was initialized
to (frequently `null`). This produced a real bug where a "take value and clear it" helper always
returned `null`, so a dependent effect silently never fired — no error, no crash, just a stuck UI.

**How to apply:** Never try to extract a value synchronously from a setState updater's closure.
Instead, read the current value directly from the render's own state/closure (e.g. `state.value`
already available in the calling scope), and only use the updater to clear/mutate stored state.
