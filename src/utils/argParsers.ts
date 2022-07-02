import { Guild, GuildMember } from 'discord.js-light'

/**
 * Parse User IDs, username#discriminator and mentions into a guild member
 * @param guild Guild to search for members in
 * @param args Array of arguments to search for a member
 * @returns A guild member
 */
export function getMember (guild: Guild, args: string[]): GuildMember | undefined {
	for (let i = 0; i < args.slice(0, 6).length; i++) {
		const arg = args[i]

		// regex tests for <@!1234etc>, will pass when player mentions someone or types a user id
		const userMatch = arg.match(/^<?@?!?(\d+)>?$/)

		if (userMatch) {
			const userId = userMatch[1]

			const member = guild.members.cache.find(m => m.id === userId)

			if (member) {
				return member
			}
		}
		// regex test for username#discriminator
		else if (/^(.*)#([0-9]{4})$/.test(arg)) {
			const userTag = arg.split('#')
			const previousArgs = args.slice(0, i)

			previousArgs.push(userTag[0])

			for (let i2 = 1; i2 < previousArgs.length + 1; i2++) {
				// start checking args backwards
				const userToCheck = previousArgs.slice(i2 * -1).join(' ')

				const member = guild.members.cache.find(m => !!(m.user.username.toLowerCase() === userToCheck.toLowerCase() && m.user.discriminator === userTag[1]) ||
					!!((m.nickname && m.nickname.toLowerCase() === userToCheck) && m.user.discriminator === userTag[1]))

				if (member) return member
			}
		}
	}
}

/**
 * Parse ONLY a mention into a guild member
 * @param guild Guild to search for members in
 * @param arg Arg to look for a member
 * @returns A guild member
 */
export function getMemberFromMention (guild: Guild, arg?: string): GuildMember | undefined {
	if (arg) {
		// regex tests for <@!1234etc>, will pass when player mentions someone, DOES NOT PASS FOR USER IDs
		const userMatch = arg.match(/^<@!?(\d+)>$/)

		if (userMatch) {
			const userId = userMatch[1]

			const member = guild.members.cache.find(m => m.id === userId)

			if (member) {
				return member
			}
		}
	}
}

/**
 * @param arg Arg to look for user ID
 * @returns User ID
 */
export function getUserID (arg?: string): string | undefined {
	if (!arg) {
		return undefined
	}

	const userMatch = arg.match(/^<?@?!?(\d+)>?$/)

	return userMatch ? userMatch[1] : undefined
}

/**
 * @param guild If arg is a custom emoji, will check to make sure the custom emoji exists in this guild
 * @param arg Arg to look for emoji
 * @returns An emoji in string form that can be parsed by Discord chat
 */
export function getEmoji (guild: Guild, arg?: string): string | undefined {
	if (arg) {
		// regex tests for <a:emojiname:1234>, will pass for custom emojis
		const customEmojiMatch = arg.match(/^<a?:.*:(\d+)>?$/)

		if (customEmojiMatch) {
			const emojiId = customEmojiMatch[1]

			// make sure emoji exists in the guild
			const emoji = guild.emojis.cache.find(e => e.id === emojiId)

			if (emoji) {
				return arg
			}
		}
		else if (/(?=\p{Emoji})(?!\p{Number})/u.test(arg)) {
			const unicodeEmojiMatch = arg.match(/(\p{Emoji})/u)

			if (unicodeEmojiMatch) {
				return unicodeEmojiMatch[1]
			}
		}
	}
}

/**
 * Parses string numbers into usable numbers (ex. '1,234,567' -> 1234567 or '1k' to 1000)
 * @param args Args to check number for
 * @param allowNegatives Whether or not to allow negative numbers (defaults false)
 * @returns A parsed number
 */
export function getNumber (args?: (string | number)[], allowNegatives = false): number | undefined {
	if (args && args[0]) {
		for (let arg of args) {
			if (typeof arg === 'number') {
				return allowNegatives ? arg : arg > 0 ? arg : undefined
			}

			arg = arg.replace(/,/g, '')

			if (isNumber(arg)) {
				let number

				if (arg.endsWith('m')) {
					number = Math.floor(parseFloat(arg) * 1000000)
				}
				else if (arg.endsWith('k')) {
					number = Math.floor(parseFloat(arg) * 1000)
				}
				else {
					if (arg.endsWith('x')) {
						arg = arg.slice(0, -1)
					}

					number = Math.floor(Number(arg))
				}

				if (number > Number.MAX_SAFE_INTEGER) {
					number = Number.MAX_SAFE_INTEGER
				}
				else if (number < Number.MIN_SAFE_INTEGER) {
					number = Number.MIN_SAFE_INTEGER
				}

				return allowNegatives ? number : number > 0 ? number : undefined
			}
		}
	}
}

/**
 * Parses string floats into usable numbers (ex. '1,234.50' -> 1234.50), input will be rounded to nearest 2 decimal places
 * @param arg Arg to check float for
 * @returns A parsed float
 */
export function getFloat (arg?: string): number | undefined {
	if (arg) {
		arg = arg.replace(/,/g, '')

		if (isNumber(arg, true)) {
			let number

			if (arg.endsWith('m')) {
				number = Math.floor(parseFloat(arg) * 1000000)
			}
			else if (arg.endsWith('k')) {
				number = Math.floor(parseFloat(arg) * 1000)
			}
			else {
				number = parseFloat(Number(arg).toFixed(2))
			}

			// don't return numbers lower than 0
			return number > 0 ? number : undefined
		}
	}
}

function isNumber (input: string, allowFloats = false): boolean {
	if (!isNaN(Number(input)) && (allowFloats || !input.includes('.'))) {
		return true
	}
	else if (input.endsWith('m') && !isNaN(Number(input.slice(0, -1)))) {
		return true
	}
	else if (input.endsWith('k') && !isNaN(Number(input.slice(0, -1)))) {
		return true
	}
	else if (input.endsWith('x') && !isNaN(Number(input.slice(0, -1)))) {
		return true
	}

	return false
}
