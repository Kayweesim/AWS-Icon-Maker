// Layout constants shared by the canvas and the Clean Up actions.

/** Canvas snap grid. */
export const GRID_SIZE = 8

/** Standard icon size applied by Tidy and Auto-arrange, and used for new icons. */
export const ICON_SIZE = 64
/** Sizes offered in the properties panel (predefined sizes from the AWS icon package). */
export const ICON_SIZES = [32, 48, 64] as const
/** Size of icons saved before icon sizes existed. */
export const LEGACY_ICON_SIZE = 48

/** Labels sit centred below the icon in a fixed-width box. */
export const LABEL_WIDTH = 96
export const LABEL_GAP = 6
export const LABEL_LINE_HEIGHT = 15
/** Average character width of 12px Arial, for estimating label wrapping. */
export const LABEL_CHAR_WIDTH = 6.4

/** Nodes whose centres are within this distance are aligned by Tidy. */
export const ALIGN_THRESHOLD = 10
/** Minimum space Tidy keeps between sibling nodes. */
export const NODE_GAP = 24

/** Space between a group's border and its contents. The top leaves room for the group label. */
export const GROUP_PADDING = { top: 56, right: 32, bottom: 32, left: 32 }
export const GROUP_MIN_SIZE = { width: 160, height: 104 }
/** Group labels wrap instead of being cut off; clean-up widens groups to fit them, up to this width. */
export const GROUP_LABEL_MAX_WIDTH = 320
export const GROUP_LABEL_LINE_HEIGHT = 16
/** Space between a (possibly wrapped) group label and the group's contents. */
export const GROUP_HEADER_GAP = 24

/** Text boxes added with the text tool. */
export const TEXT_FONT_SIZE = 14
export const TEXT_FONT_SIZES = [12, 14, 18, 24] as const
export const TEXT_MAX_WIDTH = 280
export const TEXT_LINE_HEIGHT = 1.3
export const TEXT_PADDING = { x: 4, y: 2 }

/** ELK layered layout spacing for Auto-arrange. */
export const AUTO_ARRANGE_SPACING = {
  nodeNode: 48,
  betweenLayers: 96,
  edgeNodeBetweenLayers: 24,
  components: 64,
}

/** Duration of the clean-up animation. */
export const LAYOUT_ANIMATION_MS = 300
