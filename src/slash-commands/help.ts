import { MessageEmbed } from 'discord.js-light'
import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import AppBot from '../structures/BotApp'
import CustomSlashCommand from '../structures/CustomSlashCommand'

export default class extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: AppBot) {
		super(creator, app, {
			name: 'help',
			description: 'View the commands.',
			longDescription: 'you need help using the help command? O_O',
			options: [{
				type: CommandOptionType.STRING,
				name: 'command',
				description: 'command to get info for',
				required: false
			}],
			guildModsOnly: false,
			worksInDMs: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const command = ctx.options.command

		if (command) {
			const cmd = this.app.slashCreator.commands.find(c => c.commandName === command) as CustomSlashCommand | undefined

			if (!cmd) {
				await ctx.send({
					content: 'That command doesn\'t exist!'
				})

				return
			}

			const cmdEmbed = new MessageEmbed()
				.setColor(11036893)
				.setTitle(`${cmd.commandName} command info`)
				.setDescription(cmd.customOptions.longDescription)

			await ctx.send({
				embeds: [cmdEmbed.toJSON()]
			})
			return
		}

		const allCommands = Array.from(this.app.slashCreator.commands.values()) as CustomSlashCommand[]

		const commandsEmb = new MessageEmbed()
			.setColor(11036893)
			.setDescription(`__**Bot Commands**__\n\n${allCommands.map(c => this.getCommandDisplay(c)).join(', ')}`)

		await ctx.send({
			embeds: [commandsEmb.toJSON()]
		})
	}

	getCommandDisplay (cmd: CustomSlashCommand): string {
		if (!cmd.options || !cmd.options.length) {
			return `[\`${cmd.commandName}\`](https://youtu.be/x7-vwQvn4Fc '${cmd.description}')`
		}

		const optionsDisplay = []

		for (const opt of cmd.options) {
			if (opt.type === CommandOptionType.SUB_COMMAND) {
				optionsDisplay.push(opt.name)
			}
		}

		return `[\`${cmd.commandName}${optionsDisplay.length ? ` ${optionsDisplay.join('/')}` : ''}\`](https://youtu.be/x7-vwQvn4Fc '${cmd.description}')`
	}
}
