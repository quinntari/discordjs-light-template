import { Message, MessageOptions, MessagePayload, User } from 'discord.js-light'
import { AnyComponent, AnyComponentButton, ComponentActionRow, ComponentSelectMenu, ComponentType } from 'slash-create'
import { logger } from './logger'

export async function reply<T extends Message> (msg: T, content: string | MessagePayload | MessageOptions): Promise<T> {
	return msg.reply(content) as Promise<T>
}

export async function messageUser (user: User, content: string | MessagePayload | MessageOptions, throwErr = false): Promise<void> {
	try {
		await user.send(content)
	}
	catch (err) {
		logger.warn(`Failed to send message to user: ${user.id}`)

		if (throwErr) {
			throw err
		}
	}
}

/**
 * Disable all components
 * @param components Array of component action rows or buttons
 * @returns Components with all components disabled
 */
export function disableAllComponents (components: (AnyComponentButton | ComponentSelectMenu)[]): (AnyComponentButton | ComponentSelectMenu)[]
export function disableAllComponents (components: AnyComponent[]): ComponentActionRow[]
export function disableAllComponents (components: AnyComponent[]): AnyComponent[] {
	if (isActionRowComponents(components)) {
		return components.map(r => ({ ...r, components: r.components.map(c => ({ ...c, disabled: true })) }))
	}

	return (components as (AnyComponentButton | ComponentSelectMenu)[]).map(c => ({ ...c, disabled: true }))
}

function isActionRowComponents (components: AnyComponent[]): components is ComponentActionRow[] {
	return components.every(c => c.type === ComponentType.ACTION_ROW)
}
