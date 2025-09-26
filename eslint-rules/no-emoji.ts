/**
 * ESLint rule to prevent emoji usage and suggest Mantine icons
 */

import { ESLintUtils } from '@typescript-eslint/utils';

// Unicode ranges for modern emoji detection
// Focus on newer emoji blocks while allowing traditional symbols
const EMOJI_RANGES: [number, number][] = [
  // Core modern emoji blocks (post-2010)
  [0x1F600, 0x1F64F], // Emoticons (😀-🙏)
  [0x1F300, 0x1F5FF], // Miscellaneous Symbols and Pictographs (🌀-🗿)
  [0x1F680, 0x1F6FF], // Transport and Map Symbols (🚀-🛿)
  [0x1F1E0, 0x1F1FF], // Regional Indicator Symbols (🇠-🇿)

  // Extended emoji blocks (post-2015)
  [0x1F900, 0x1F9FF], // Supplemental Symbols and Pictographs (🤀-🧿)
  [0x1F780, 0x1F7FF], // Geometric Shapes Extended (🞀-🟿)
  [0x1F100, 0x1F1FF], // Enclosed Alphanumeric Supplement (🄀-🇿)
  [0x1F200, 0x1F2FF], // Enclosed Ideographic Supplement (🈀-🋿)
  [0x1F000, 0x1F02F], // Mahjong Tiles (🀀-🀯)
  [0x1F0A0, 0x1F0FF], // Playing Cards (🂠-🃿)

  // Emoji modifiers
  [0x1F3FB, 0x1F3FF], // Skin tone modifiers (🏻-🏿)

  // Specific modern emoji symbols (commonly problematic)
  [0x2B50, 0x2B50],   // Star ⭐
  [0x2B55, 0x2B55],   // Circle ⭕
  [0x2B05, 0x2B07],   // Arrows (⬅-⬇)
  [0x2B1B, 0x2B1C],   // Squares (⬛-⬜)

  // Media control symbols that are commonly used as emoji
  [0x23E9, 0x23F3],   // Media symbols (⏩-⏳)
  [0x23F8, 0x23FA],   // Media symbols (⏸-⏺)
  [0x25B6, 0x25B6],   // Play button ▶
  [0x25C0, 0x25C0],   // Reverse button ◀
];

// Generate regex pattern from ranges
function createEmojiRegex(): RegExp {
  const rangePatterns = EMOJI_RANGES.map(([start, end]) => {
    if (start === end) {
      return `\\u{${start.toString(16).toUpperCase()}}`;
    }
    return `\\u{${start.toString(16).toUpperCase()}}-\\u{${end.toString(16).toUpperCase()}}`;
  });

  return new RegExp(`[${rangePatterns.join('')}]`, 'gu');
}

const EMOJI_REGEX = createEmojiRegex();

const COMMON_ICON_SUGGESTIONS: Record<string, string> = {
  '✅': 'IconCheck',
  '❌': 'IconX',
  '⚠️': 'IconAlertTriangle',
  '📄': 'IconFile',
  '📁': 'IconFolder',
  '📊': 'IconChartBar',
  '📈': 'IconTrendingUp',
  '📉': 'IconTrendingDown',
  '🔍': 'IconSearch',
  '⭐': 'IconStar',
  '💾': 'IconDeviceFloppy',
  '🗑️': 'IconTrash',
  '📝': 'IconEdit',
  '🔗': 'IconLink',
  '📋': 'IconClipboard',
  '🏠': 'IconHome',
  '⚙️': 'IconSettings',
  '👤': 'IconUser',
  '📧': 'IconMail',
  '🔔': 'IconBell',
  '🚀': 'IconRocket',
  '💡': 'IconBulb',
  '🎯': 'IconTarget',
  '📍': 'IconMapPin',
  '🔒': 'IconLock',
  '🔓': 'IconLockOpen',
  '📅': 'IconCalendar',
  '⏰': 'IconClock',
  '🖥️': 'IconDeviceDesktop',
  '📱': 'IconDeviceMobile',
  '💻': 'IconDeviceLaptop',
};

type MessageIds = 'noEmoji' | 'noEmojiGeneric';

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`
);

export const noEmojiRule = createRule<[], MessageIds>({
  name: 'no-emoji',
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow emoji usage, suggest Mantine icons instead',
    },
    fixable: null,
    schema: [],
    messages: {
      noEmoji: 'Avoid using emojis ({{emoji}}). Use Mantine icons instead: {{suggestion}}',
      noEmojiGeneric: 'Avoid using emojis ({{emoji}}). Use appropriate Mantine icons from @tabler/icons-react instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    function checkForEmojis(node: any, text: string): void {
      if (!text) return;

      const matches = Array.from(text.matchAll(EMOJI_REGEX));

      for (const match of matches) {
        const emoji = match[0];
        const suggestion = COMMON_ICON_SUGGESTIONS[emoji];

        context.report({
          node,
          messageId: suggestion ? 'noEmoji' : 'noEmojiGeneric',
          data: {
            emoji,
            suggestion: suggestion || 'appropriate Mantine icons from @tabler/icons-react',
          },
        });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          checkForEmojis(node, node.value);
        }
      },

      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          checkForEmojis(quasi, quasi.value.raw);
        }
      },

      JSXText(node) {
        checkForEmojis(node, node.value);
      },

      JSXAttribute(node) {
        if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
          checkForEmojis(node.value, node.value.value);
        }
      },

      // For markdown files - check text content
      Program(node) {
        // This will catch markdown text content when processed by @eslint/markdown
        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();

        // Only check if this looks like markdown content (not a code block)
        if (text && !text.includes('function') && !text.includes('const ') && !text.includes('import ')) {
          const matches = Array.from(text.matchAll(EMOJI_REGEX));
          for (const match of matches) {
            if (match.index !== undefined) {
              const emoji = match[0];
              const suggestion = COMMON_ICON_SUGGESTIONS[emoji];

              context.report({
                node,
                messageId: suggestion ? 'noEmoji' : 'noEmojiGeneric',
                data: {
                  emoji,
                  suggestion: suggestion || 'appropriate Mantine icons from @tabler/icons-react',
                },
                loc: {
                  start: sourceCode.getLocFromIndex(match.index),
                  end: sourceCode.getLocFromIndex(match.index + emoji.length)
                }
              });
            }
          }
        }
      },
    };
  },
});

export default {
  rules: {
    'no-emoji': noEmojiRule,
  },
};