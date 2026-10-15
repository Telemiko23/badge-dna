/**
 * DRAFT reveal orders proposed by the assistant for the PNG-v2 package (2026-10-15).
 * They are editorial proposals for the owner to review and replace, NOT approved sequences:
 * no difficulty was measured and no player has tested them. Entries are semantic group names
 * from the package manifests (the part after the "NN-" prefix).
 *
 * Rough logic: open with a piece that is partial or abstract but not empty (a ring or a lone
 * letter says almost nothing), add shape/pattern pieces in the middle, finish on the most
 * identifying piece or the letter. Variants of one club open with different pieces so the game
 * can avoid repeating what the player has already seen.
 */
export interface DraftVariant {
  key: string
  order: string[]
  note: string
}

/** Pieces left out of every draft, with the reason. They stay in the library for the owner to decide. */
export const EXCLUDED: Record<string, string> = {
  'brighton:letter-b': "the letter is the first letter of the club's name (owner rule, 2026-10-15)",
  'everton:letter-e': "the letter is the first letter of the club's name (owner rule, 2026-10-15)",
  'ipswich:letter-i': "the letter is the first letter of the club's name (owner rule, 2026-10-15)",
}

/**
 * Pieces re-packed by the owner's decision (2026-10-15): their small parts, far apart in the original,
 * are moved next to each other so the piece stays readable on a phone. Only pixels are moved.
 */
export const REPACK: Record<string, { mergeGap?: number }> = {
  'manchester_city:year': {},
  'brentford:year': {},
  'chelsea:roses': {},
  'chelsea:footballs': {},
  'manchester_united:ornament-group': {},
  'manchester_united:curled-scrolls': {},
}

export const DRAFTS: Record<string, DraftVariant[]> = {
  arsenal: [
    { key: 'a', order: ['blue-bands', 'gold-frame', 'wheel', 'letter-e'], note: 'opens on the blue bands' },
    { key: 'b', order: ['white-bands', 'wheel', 'letter-e', 'gold-frame', 'blue-bands'], note: 'opens on the white bands' },
  ],
  manchester_city: [
    { key: 'a', order: ['diagonal-bands', 'rose', 'outer-ring', 'ship'], note: 'opens on the diagonal bands' },
    { key: 'b', order: ['rose', 'inner-ring', 'diagonal-bands', 'year', 'ship'], note: 'opens on the rose' },
  ],
  brighton: [
    { key: 'a', order: ['white-ring', 'seagull', 'blue-disc'], note: 'opens on the white ring' },
    { key: 'b', order: ['blue-disc', 'ring', 'seagull'], note: 'opens on the blue disc' },
  ],
  everton: [
    { key: 'a', order: ['banner', 'laurels', 'shield-outline', 'tower', 'year'], note: 'opens on the banner' },
    { key: 'b', order: ['tower', 'banner', 'shield-outline', 'year'], note: 'opens on the tower' },
  ],
  brentford: [
    { key: 'a', order: ['bee-wings-and-limbs', 'red-and-black-ring', 'letter-t', 'bee-body'], note: 'opens on the wings' },
    { key: 'b', order: ['outer-outline', 'year', 'bee-body', 'red-and-black-ring', 'letter-t'], note: 'opens on the outline' },
  ],
  chelsea: [
    { key: 'a', order: ['staff', 'roses', 'blue-ring', 'lion', 'letter-e'], note: 'opens on the staff' },
    { key: 'b', order: ['footballs', 'blue-ring', 'staff', 'lion'], note: 'opens on the two footballs' },
  ],
  leeds: [
    { key: 'a', order: ['chevron-pairs', 'rose', 'shield-border', 'football', 'letter-f'], note: 'opens on the chevrons' },
    { key: 'b', order: ['football', 'shield-border', 'letter-f', 'rose'], note: 'opens on the football' },
  ],
  hull_city: [
    { key: 'a', order: ['tiger-ear', 'black-frame', 'tiger-muzzle', 'tiger-head'], note: 'opens on the ear' },
    { key: 'b', order: ['tiger-muzzle', 'year', 'white-outline', 'tiger-head'], note: 'opens on the muzzle' },
  ],
  liverpool: [
    { key: 'a', order: ['leg', 'wings', 'head', 'letter-f'], note: 'opens on the leg' },
    { key: 'b', order: ['torso', 'branch', 'head', 'wings'], note: 'opens on the torso (check: it touches the canvas edge)' },
  ],
  ipswich: [
    { key: 'a', order: ['waves', 'blue-fields', 'horse', 'football'], note: 'opens on the waves' },
    { key: 'b', order: ['football', 'red-outline', 'blue-fields', 'horse'], note: 'opens on the football' },
  ],
  manchester_united: [
    { key: 'a', order: ['footballs', 'ship', 'letter-n', 'devil'], note: 'opens on the two footballs' },
    { key: 'b', order: ['ornament-group', 'devil', 'curled-scrolls', 'ship', 'letter-n'], note: 'opens on the ornaments' },
  ],
  nottingham_forest: [
    { key: 'a', order: ['stars', 'trunk-and-waves', 'tree-crown', 'letter-r'], note: 'opens on the stars' },
  ],
  aston_villa: [
    { key: 'a', order: ['star', 'blue-field', 'lion', 'letter-f'], note: 'opens on the star' },
    { key: 'b', order: ['claret-frame', 'star', 'white-outline', 'lion'], note: 'opens on the claret frame' },
  ],
  bournemouth: [
    { key: 'a', order: ['red-stripes', 'motion-lines', 'black-frame', 'player-head', 'football'], note: 'opens on the stripes' },
    { key: 'b', order: ['football', 'player-head', 'red-stripes', 'letter-n'], note: 'opens on the football' },
  ],
  fulham: [
    { key: 'a', order: ['black-panels', 'white-field', 'white-outline', 'letter-c'], note: 'opens on the black panels' },
  ],
  tottenham: [
    { key: 'a', order: ['tail', 'ball-upper', 'head', 'body'], note: 'opens on the tail' },
    { key: 'b', order: ['ball-lower', 'head', 'ball-upper', 'tail', 'body'], note: 'opens on the lower half of the ball' },
  ],
  crystal_palace: [
    { key: 'a', order: ['banner', 'year', 'football', 'palace', 'eagle'], note: 'opens on the banner' },
    { key: 'b', order: ['palace', 'letter-a', 'football', 'eagle'], note: 'opens on the palace' },
  ],
  newcastle: [
    { key: 'a', order: ['banner', 'flag', 'upper-tower', 'seahorse-left', 'striped-shield'], note: 'opens on the banner' },
    { key: 'b', order: ['seahorse-right', 'letter-e', 'striped-shield', 'flag'], note: 'opens on the right seahorse' },
  ],
  sunderland: [
    { key: 'a', order: ['banner', 'bridge', 'temple', 'lion-left'], note: 'opens on the banner' },
    { key: 'b', order: ['lion-right', 'letter-a', 'temple', 'bridge', 'banner'], note: 'opens on the right lion' },
  ],
  coventry: [
    { key: 'a', order: ['banner-lower', 'bird-left', 'letter-e', 'bird-right'], note: 'opens on the lower banner' },
    { key: 'b', order: ['banner-upper', 'bird-right', 'banner-lower', 'bird-left', 'letter-e'], note: 'opens on the upper banner' },
  ],
}
