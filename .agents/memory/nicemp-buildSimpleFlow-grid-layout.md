---
name: buildSimpleFlow grid layout
description: Module groups are arranged in a 2D grid (MAX_COLS=4) instead of a single horizontal row.
---

# buildSimpleFlow grid layout

## The rule
Module groups in the "Visão Simples" organogram are placed in a grid of MAX_COLS=4 columns, wrapping to new rows when the limit is reached.

**Why:** With 8 modules (auth, dashboard, users, employees, financeiro, relatorios, comunicacao, configuracoes), a single horizontal row produced a 2600px+ wide canvas that required horizontal scrolling and made comparison impossible.

## Key constants (buildSimpleFlow.ts)
- `MAX_COLS = 4` — groups per row before wrapping
- `MODULE_GAP_X = 48` — horizontal gap between groups in same row  
- `MODULE_GAP_Y = 56` — vertical gap between rows

## Layout variables
```
colIdx, cursorX, cursorY, rowHeight
if (colIdx > 0 && colIdx >= MAX_COLS) → wrap: cursorX=0, cursorY+=rowHeight+MODULE_GAP_Y
```

## How to apply
Any change to buildSimpleFlow.ts that touches module group positioning should maintain the grid pattern. If MAX_COLS needs adjustment, change the constant — do not inline the value.
