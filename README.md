# AWS Diagram Studio

A lightweight, AWS-only diagram editor, like a focused draw.io for cloud architecture. It uses the
official [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) and follows the
conventions in AWS's icon deck: group containers with the official colours and corner icons,
Arial 12px labels, and open-arrow connectors with right-angle routing.

Everything runs in the browser, with no backend.

## Getting started

```bash
npm install
npm run dev
```

The first `npm run dev` or `npm run build` downloads the AWS icon package (about 14 MB) and
generates the icon manifest. To refresh the icons at any time:

```bash
npm run icons
```

To use a newer quarterly release, pass its zip URL:
`AWS_ICONS_URL=https://…/Icon-package_….zip npm run icons`.

## Features

- **Icon palette:** 304 service icons and 466 resource icons in 24 categories, with search and
  collapsible sections. Groups sit at the top of the palette.
- **Canvas:** infinite pan and zoom, snap-to-grid, a minimap, and box selection.
- **Connections:** drag from any side handle. Each connection can have a label, a solid or dashed
  line, an elbow, straight or curved path, and arrowheads at the end, both ends or neither.
- **Groups:** AWS Cloud, Region, Availability Zone, VPC, public and private subnet, security group,
  Auto Scaling group, and more. Groups can be resized and nested; nodes dropped or dragged inside
  become children and move with the group.
- **Editing:** double-click (or press Enter) to rename, multi-select, copy, cut, paste, duplicate,
  delete, arrow-key nudge, and undo/redo.
- **Files:** export PNG (2×) or SVG, save and open JSON, and autosave to localStorage.
- **Properties panel:** appears when something is selected.
- **Keyboard shortcuts:** press <kbd>?</kbd> in the app for the full list.

## Project structure

```
scripts/
  fetch-icons.mjs       downloads the AWS package and copies the SVGs to public/aws-icons
  build-manifest.mjs    scans public/aws-icons and writes src/data/icon-manifest.json
src/
  store/diagramStore.ts single Zustand store: nodes, edges, history, clipboard
  data/                 icon manifest access and AWS group styles
  lib/                  pure helpers: nesting geometry, clipboard, persistence, export
  hooks/                keyboard shortcuts, autosave, file actions
  components/
    canvas/             React Flow canvas and empty state
    nodes/ edges/       icon node, group node, AWS-style edge
    sidebar/            icon and group palette
    panel/              properties panel
    toolbar/            top bar, export menu, notices
```

The downloaded icons (`public/aws-icons`) and the generated manifest are git-ignored.

## Notes

- **Icon usage:** AWS allows customers and partners to use these icons in architecture diagrams.
  Per AWS's guidelines, the app shows icons exactly as supplied: no cropping, flipping, rotating,
  recolouring or resizing within a diagram. The icons remain the property of Amazon Web Services.
- **SVG export** embeds the rendered diagram in an SVG `foreignObject`. It displays correctly in
  browsers, but some vector editors (Illustrator, Inkscape) don't render `foreignObject`. Use PNG
  for those.
- **Opened JSON files are validated.** Icon references must point to the bundled `/aws-icons` SVGs,
  and unknown node or group types are rejected.
