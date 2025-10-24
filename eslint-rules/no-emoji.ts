/**
 * ESLint rule to prevent emoji usage and suggest Mantine icons
 */

import { ESLintUtils } from "@typescript-eslint/utils"

// Unicode ranges for modern emoji detection
// Focus on newer emoji blocks while allowing traditional symbols
const EMOJI_RANGES: [number, number][] = [
	// Core modern emoji blocks (post-2010)
	[0x1f600, 0x1f64f], // Emoticons (😀-🙏)
	[0x1f300, 0x1f5ff], // Miscellaneous Symbols and Pictographs (🌀-🗿)
	[0x1f680, 0x1f6ff], // Transport and Map Symbols (🚀-🛿)
	[0x1f1e0, 0x1f1ff], // Regional Indicator Symbols (🇠-🇿)

	// Extended emoji blocks (post-2015)
	[0x1f900, 0x1f9ff], // Supplemental Symbols and Pictographs (🤀-🧿)
	[0x1f780, 0x1f7ff], // Geometric Shapes Extended (🞀-🟿)
	[0x1f100, 0x1f1ff], // Enclosed Alphanumeric Supplement (🄀-🇿)
	[0x1f200, 0x1f2ff], // Enclosed Ideographic Supplement (🈀-🋿)
	[0x1f000, 0x1f02f], // Mahjong Tiles (🀀-🀯)
	[0x1f0a0, 0x1f0ff], // Playing Cards (🂠-🃿)

	// Emoji modifiers
	[0x1f3fb, 0x1f3ff], // Skin tone modifiers (🏻-🏿)

	// Specific modern emoji symbols (commonly problematic)
	[0x2b50, 0x2b50], // Star ⭐
	[0x2b55, 0x2b55], // Circle ⭕
	[0x2b05, 0x2b07], // Arrows (⬅-⬇)
	[0x2b1b, 0x2b1c], // Squares (⬛-⬜)

	// Media control symbols that are commonly used as emoji
	[0x23e9, 0x23f3], // Media symbols (⏩-⏳)
	[0x23f8, 0x23fa], // Media symbols (⏸-⏺)
	[0x25b6, 0x25b6], // Play button ▶
	[0x25c0, 0x25c0], // Reverse button ◀
	[0x2705, 0x2705], // Check mark ✅
	[0x274c, 0x274c], // Cross mark ❌
]

// Generate regex pattern from ranges
function createEmojiRegex(): RegExp {
	const rangePatterns = EMOJI_RANGES.map(([start, end]) => {
		if (start === end) {
			return `\\u{${start.toString(16).toUpperCase()}}`
		}
		return `\\u{${start.toString(16).toUpperCase()}}-\\u{${end.toString(16).toUpperCase()}}`
	})

	return new RegExp(`[${rangePatterns.join("")}]`, "gu")
}

const EMOJI_REGEX = createEmojiRegex()

const COMMON_ICON_SUGGESTIONS: Record<string, string> = {
	"✅": "IconCheck",
	"❌": "IconX",
	"⚠️": "IconAlertTriangle",
	"📄": "IconFile",
	"📁": "IconFolder",
	"📊": "IconChartBar",
	"📈": "IconTrendingUp",
	"📉": "IconTrendingDown",
	"🔍": "IconSearch",
	"⭐": "IconStar",
	"💾": "IconDeviceFloppy",
	"🗑️": "IconTrash",
	"📝": "IconEdit",
	"🔗": "IconLink",
	"📋": "IconClipboard",
	"🏠": "IconHome",
	"⚙️": "IconSettings",
	"👤": "IconUser",
	"📧": "IconMail",
	"🔔": "IconBell",
	"🚀": "IconRocket",
	"💡": "IconBulb",
	"🎯": "IconTarget",
	"📍": "IconMapPin",
	"🔒": "IconLock",
	"🔓": "IconLockOpen",
	"📅": "IconCalendar",
	"⏰": "IconClock",
	"🖥️": "IconDeviceDesktop",
	"📱": "IconDeviceMobile",
	"💻": "IconDeviceLaptop",
}

type MessageIds = "noEmoji" | "noEmojiGeneric"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`
)

export const noEmojiRule = createRule<[], MessageIds>({
	name: "no-emoji",
	meta: {
		type: "problem",
		docs: {
			description: "disallow emoji usage, suggest Mantine icons instead",
		},
		fixable: "code",
		schema: [],
		messages: {
			noEmoji: "Avoid using emojis ({{emoji}}). Use Mantine icons instead: {{suggestion}}",
			noEmojiGeneric:
				"Avoid using emojis ({{emoji}}). Use appropriate Mantine icons from @tabler/icons-react instead.",
		},
	},
	defaultOptions: [],
	create(context) {
		function checkForEmojis(node: any, text: string): void {
			if (!text) return

			const matches = Array.from(text.matchAll(EMOJI_REGEX))

			for (const match of matches) {
				const emoji = match[0]
				const suggestion = COMMON_ICON_SUGGESTIONS[emoji]

				context.report({
					node,
					messageId: suggestion ? "noEmoji" : "noEmojiGeneric",
					data: {
						emoji,
						suggestion: suggestion || "appropriate Mantine icons from @tabler/icons-react",
					},
				})
			}
		}

		return {
			Literal(node) {
				if (typeof node.value === "string") {
					checkForEmojis(node, node.value)
				}
			},

			TemplateLiteral(node) {
				for (const quasi of node.quasis) {
					checkForEmojis(quasi, quasi.value.raw)
				}
			},

			JSXText(node) {
				checkForEmojis(node, node.value)
			},

			JSXAttribute(node) {
				if (node.value && node.value.type === "Literal" && typeof node.value.value === "string") {
					checkForEmojis(node.value, node.value.value)
				}
			},
		}
	},
})

export default {
	rules: {
		"no-emoji": noEmojiRule,
	},
}
