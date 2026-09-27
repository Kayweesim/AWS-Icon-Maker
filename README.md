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

The first `npm run dev`, `npm run build` or `npm test` downloads the AWS icon package (about 14 MB)
and generates the icon manifest and code mappings. To refresh the icons at any time:

```bash
npm run icons
```

To use a newer quarterly release, pass its zip URL:
`AWS_ICONS_URL=https://…/Icon-package_….zip npm run icons`.

## Deploying (Vercel)

The app is a static site with no backend, so any static host works. `vercel.json` configures
Vercel: `npm ci`, `npm run build`, output in `dist`, an SPA rewrite and cache headers.

1. Push the repo to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo → **Deploy**.
   The settings come from `vercel.json`; nothing needs to be entered.
3. Every push to `main` redeploys; every branch and pull request gets its own preview URL.

The build downloads the AWS icon package from `d1.awsstatic.com` (about 14 MB, roughly 10 s), so
the build machine needs network access. If AWS retires that URL, set `AWS_ICONS_URL` to the
current zip in **Project → Settings → Environment Variables**.

Diagrams are stored in each person's browser (localStorage), so the deployment is a shared *tool*,
not a shared *document*: share work by sending the exported `.json` or `.drawio` file. Live
multi-user editing would need a sync backend (e.g. Liveblocks) and is not built yet.

## Features

- **Icon palette:** 304 service icons and 466 resource icons in 24 categories, with search and
  collapsible sections. Groups sit at the top of the palette.
- **Canvas:** infinite pan and zoom, snap-to-grid, a minimap, and box selection. Hold
  <kbd>Shift</kbd> while dragging a selection box to pick only services, text and arrows, and skip
  the groups around them, so you can move services independently of their VPC or Region.
- **Quick add:** press <kbd>S</kbd> to open a search panel at your cursor. Type (for example
  "lambda", "s3" or "public subnet"), use ↑/↓ to pick, and press Enter to place the highlighted
  service or group exactly at that point, inside a group if the cursor was over one. The last
  option adds what you typed as text.
- **Labels stay clear of arrows:** an icon's bottom connection point sits below its label.
- **Arrows:** a searchable Arrows palette at the top of the sidebar has presets for common
  architecture connections: data flow, async/event (dashed), two-way, replication/backup, network
  link and monitoring/logs. Click a preset, then click two services. Or select a service, press
  <kbd>A</kbd> and click another (Shift-click keeps chaining). You can also drag from a side
  handle. Groups have several connection points along each side (more on bigger groups), so an
  arrow can meet a VPC or Region where it should rather than only at the middle of a side; a point
  you pick by hand survives Tidy and Auto-arrange as long as that side still faces the other node.
  Each arrow can have a label, a solid or dashed line, an elbow, straight or curved path,
  and arrowheads at the end, both ends or neither. Several arrows between the same two services
  (a request and its reply, say) are drawn side by side: the second below the first.
- **Text:** press <kbd>T</kbd> and click anywhere, including inside a group, to add a text box you
  can drag, resize the font of, and connect arrows to. Text is exported as comments.
- **Groups:** AWS Cloud, Region, Availability Zone, VPC, public and private subnet, security group,
  Auto Scaling group, and more. Groups can be resized and nested; nodes dropped or dragged inside
  become children and move with the group. Select or drag a group by its top-left icon or its
  label; clicks anywhere else inside reach the services in it (or start a box selection).
  Deleting a group deletes its contents too. To remove just the group (an outer AWS Cloud, say)
  and keep everything inside, <kbd>⌘</kbd>-click its icon or label and press Delete, or use
  **Delete group, keep contents** in the properties panel.
- **Editing:** double-click (or press Enter) to rename, multi-select, copy, cut, paste, duplicate,
  delete, arrow-key nudge, undo/redo, and icon sizes of 32, 48 or 64px.
- **Files:** export PNG (2×), SVG or a draw.io file, save and open JSON, and autosave to
  localStorage. The `.drawio` export opens in draw.io / diagrams.net with native AWS group
  containers, the official icons embedded as images, and editable arrows and labels.
- **Properties panel:** appears when something is selected.
- **Keyboard shortcuts:** press <kbd>?</kbd> in the app for the full list.

### Export as Code

**Export as Code** in the toolbar opens a panel with the current diagram as code. The code updates
live as you edit. Each format has Copy and Download buttons.

| Format | Output | Use it |
| --- | --- | --- |
| Mermaid | `architecture-beta` diagram with nested groups and labelled edges | Paste into a ```` ```mermaid ```` block on GitHub, Notion or any Markdown file |
| Python | Runnable script for [`diagrams`](https://diagrams.mingrammer.com/), with nested `Cluster`s in AWS group colours | `pip install diagrams` (needs Graphviz), then run it to render a PNG |
| Terraform | Scaffold with one `resource` block per node and placeholder values | Replace the placeholders, then `terraform init` and `plan` |

- Mermaid uses its built-in icons by default, which render everywhere. The **AWS logos** option
  uses the iconify `logos` pack, which only renders where that pack is registered (for example
  mermaid.live).
- Services with no mapping still export: they become a generic node with a `TODO: unmapped` comment.
- Terraform never infers networking, security group rules or IAM from arrows. Connections are
  listed as comments. Containment is used only where a type needs it, such as `vpc_id` for subnets.

### Clean Up

The ✨ menu in the toolbar tidies messy diagrams. With nodes selected, it applies to the selection
only; otherwise to the whole diagram. Each action animates into place, is a single undo step, and
re-attaches connections on the sides that face each other.

- **Tidy** (<kbd>Shift</kbd>+<kbd>T</kbd>) keeps the layout as drawn. It resets icons to 64px,
  snaps to the grid, aligns nodes within 10px of each other, separates overlapping nodes, and
  fits each group to its contents with even padding. Groups stay wide enough for their label,
  and long labels wrap (with extra top padding) instead of being cut off.
- **Auto-arrange** (<kbd>Shift</kbd>+<kbd>A</kbd>) rebuilds the layout with
  [ELK](https://eclipse.dev/elk/)'s layered algorithm. It flows left to right along the arrows
  with minimal crossings. Group contents are laid out inside their group (subnet → VPC → Region),
  so nodes never leave their parent.

Sizes, grid, padding and spacing live in `src/layout/config.ts`.

## Project structure

```
scripts/
  fetch-icons.mjs                downloads the AWS package and copies the SVGs to public/aws-icons
  build-manifest.mjs             scans public/aws-icons and writes src/data/icon-manifest.json
  build-code-mappings.mjs        writes src/data/code-mappings.json (icon id -> Mermaid/diagrams/Terraform)
  build-terraform-templates.mjs  writes src/exporters/terraform-templates.json from the provider schema
  data/                          curated mapping overrides, snapshots of iconify and diagrams names
src/
  store/diagramStore.ts   single Zustand store: nodes, edges, history, clipboard, layout animation
  exporters/              pure diagram -> code functions: mermaid.ts, python.ts, terraform.ts
  layout/                 pure layout functions: tidy.ts, autoArrange.ts, config.ts
  data/                   icon manifest, code mappings, AWS group styles
  lib/                    nesting geometry, clipboard, persistence, image export, highlighting
  hooks/                  keyboard shortcuts, autosave, file and clean-up actions, generated code
  components/
    canvas/ nodes/ edges/ React Flow canvas, icon and group nodes, AWS-style edge
    sidebar/ panel/       palette and properties panel
    code/                 Export as Code panel
    toolbar/              top bar, menus, notices
```

The downloaded icons (`public/aws-icons`), the manifest and the code mappings are generated and
git-ignored. `terraform-templates.json` is committed, since regenerating it needs Terraform.

## Tests

```bash
npm test
```

Unit tests cover each exporter on a sample diagram (ALB → two EC2 instances in private subnets
→ RDS, inside a VPC) and on awkward input, plus Tidy and Auto-arrange on a deliberately messy
diagram. Mermaid output is checked with Mermaid's own parser.

Two toolchain checks run only when their tools are available:

- `DIAGRAMS_PYTHON=/path/to/python`, a Python with `diagrams` installed, plus Graphviz on PATH:
  runs the generated scripts and inspects the Graphviz output.
- `TERRAFORM_PLUGIN_DIR=/path/to/.terraform/providers`, a local copy of the hashicorp/aws
  provider: runs `terraform validate` and `terraform fmt -check` on scaffolds for the sample, the
  awkward input, and every mapped resource type.

## Notes

- **Icon usage:** AWS allows customers and partners to use these icons in architecture diagrams.
  The icons remain the property of Amazon Web Services. The app never crops, flips, rotates or
  recolours them, and only scales them uniformly to the package's predefined sizes.
- **SVG image export** embeds the rendered diagram in an SVG `foreignObject`. It displays
  correctly in browsers, but some vector editors (Illustrator, Inkscape) don't render
  `foreignObject`. Use PNG for those.
- **Opened JSON files are validated.** Icon references must point to the bundled `/aws-icons` SVGs,
  and unknown node or group types are rejected.
