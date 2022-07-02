import { CommandContext, SlashCommand, SlashCommandOptions, SlashCreator } from 'slash-create'
import BotApp from './BotApp'

interface BaseCommandOptions {
	guildModsOnly: boolean

	/**
	 * description to display in help
	 */
	longDescription: string

	/**
	 * this should only be set to true if the command is pinging users in initial response.
	 */
	noDefer?: boolean
}

interface DMCommandOptions extends BaseCommandOptions {
	worksInDMs: true
	guildModsOnly: false
}

interface GuildCommandOptions extends BaseCommandOptions {
	worksInDMs: false
}

type CommandOptions = DMCommandOptions | GuildCommandOptions

// omitting throttling and permissions because they aren't supported with manual cmd handling
type CustomSlashCommandOptions = Omit<SlashCommandOptions, 'throttling' | 'permissions'> & CommandOptions

class CustomSlashCommand extends SlashCommand {
	app: BotApp
	customOptions: CommandOptions

	constructor (
		creator: SlashCreator,
		app: BotApp,
		slashOptions: CustomSlashCommandOptions
	) {
		if (!slashOptions.guildIDs?.length) {
			slashOptions.guildIDs = undefined
		}

		super(creator, slashOptions)

		this.app = app
		this.customOptions = slashOptions
	}

	async handle (ctx: CommandContext, textPrefix?: string): Promise<any> {
		throw new Error(`${this.commandName} does not have a "handle" method`)
	}
}

/**
 * Checks if given argument is declaration of CustomSlashCommand
 */
export const isCustomSlashCommand = (type: any): boolean => typeof type === 'function' && /^\s*class\s+/.test(type.toString())

export default CustomSlashCommand
