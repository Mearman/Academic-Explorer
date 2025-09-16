/**
 * ESLint rule to prevent emoji usage and suggest Mantine icons
 */

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F900}-\u{1F9FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2328}]|[\u{23CF}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu;

const COMMON_ICON_SUGGESTIONS = {
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

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow emoji usage, suggest Mantine icons instead',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noEmoji: 'Avoid using emojis ({{emoji}}). Use Mantine icons instead: {{suggestion}}',
      noEmojiGeneric: 'Avoid using emojis ({{emoji}}). Use appropriate Mantine icons from @tabler/icons-react instead.',
    },
  },

  create(context) {
    function checkForEmojis(node, text) {
      if (!text) return;

      const matches = [...text.matchAll(EMOJI_REGEX)];

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
    };
  },
};