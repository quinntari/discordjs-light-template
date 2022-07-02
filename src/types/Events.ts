import { ClientEvents } from 'discord.js-light'
import BotApp from '../structures/BotApp'

export interface EventHandler<T extends keyof ClientEvents = keyof ClientEvents> {
	name: T
	run: (this: BotApp, ...args: ClientEvents[T]) => Promise<void>
}
