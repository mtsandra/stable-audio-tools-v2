export const ICON_CATEGORIES = [
  {
    label: 'Symbols',
    icons: [
      // requested
      '𖦹', '✦', '✧', '⋆', '⟡', '☾', '☼', '❀', '⚘', '♡', '♥',
      '𖤐', '𖥔', '𖧷', '𖣂', '𖠿',
      // stars & florals
      '✩', '✪', '✫', '✭', '✮', '✯', '✰',
      '✶', '✷', '✸', '✹', '✺', '✻', '✼', '✽', '✾', '✿',
      '❁', '❂', '❃', '❄', '❅', '❆', '❇', '❈', '❉', '❊', '❋',
      // shapes & geometry
      '◈', '◉', '◎', '⊹', '△', '▽', '⬡', '◇', '◆', '⌬',
      // planetary / alchemical
      '☿', '♀', '♂', '♃', '♄', '♅', '♆',
      // music
      '♩', '♪', '♫', '♬',
    ],
  },
  {
    label: 'Hieroglyphs',
    icons: [
      // animals
      '𓃠', '𓃡', '𓃢', '𓃰', '𓃻', '𓃒', '𓃖', '𓃗',
      // birds
      '𓅭', '𓅃', '𓅓', '𓅱', '𓅰', '𓅆', '𓅐', '𓅀',
      // reptiles, fish & insects
      '𓆈', '𓆏', '𓆑', '𓆐', '𓆣', '𓆤', '𓆉', '𓆝',
      // people & body
      '𓀀', '𓀔', '𓁐', '𓁿', '𓂀', '𓂋', '𓂧', '𓃀', '𓄁',
      // nature & objects
      '𓄿', '𓄂', '𓇋', '𓇌', '𓇾', '𓉐', '𓊖',
    ],
  },
  {
    label: 'Emojis',
    icons: [
      // celestial
      '🌙', '🌟', '⭐', '💫', '🪐', '🌠', '🌌', '🌑', '🌕', '☀️',
      // elements & weather
      '🌊', '🔥', '💨', '⚡', '🌈', '🌪️', '❄️', '🌧️', '🫧',
      // flora
      '🌸', '🌺', '🌻', '🌿', '🍃', '🪷', '🌾', '🍀', '🌱', '🌵', '🎋',
      // fauna
      '🦋', '🐦', '🦅', '🐺', '🐋', '🐸', '🦉', '🦊', '🐝', '🦌', '🐬', '🦜', '🐚', '🦈', '🐲',
      // mystical & abstract
      '🔮', '💎', '🌀', '✨', '💠', '🪬', '🧿',
      // sound & music
      '🎵', '🎶', '🥁', '🎼', '🎸', '🎹', '🎺', '🎻',
    ],
  },
]

export const ICONS = ICON_CATEGORIES.flatMap(c => c.icons)

export function getIcon(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0
  }
  return ICONS[h % ICONS.length]
}
