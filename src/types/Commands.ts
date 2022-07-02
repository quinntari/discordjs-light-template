import { Message } from 'discord.js-light'
import BotApp from '../structures/BotApp'

interface CommandArguments {
	prefix: string
	args: string[]
}

type TextCommandPermissionLevel = 'admin' | 'public'

interface BaseTextCommand {
	name: string
	aliases: string[]
	permissionLevel: TextCommandPermissionLevel
	worksInDMs: boolean
}

export interface DMTextCommand extends BaseTextCommand {
	worksInDMs: true
	execute(app: BotApp, message: Message, commandArgs: CommandArguments): Promise<void>
}

export interface GuildTextCommand extends BaseTextCommand {
	worksInDMs: false
	execute(app: BotApp, message: Message, commandArgs: CommandArguments): Promise<void>
}

export type TextCommand = DMTextCommand | GuildTextCommand
