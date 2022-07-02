import Discord, { Guild, GuildMember, User } from 'discord.js-light'
import { SlashCreator, GatewayServer, CommandContext, InteractionResponseFlags, InteractionResponseType, MessageOptions, ApplicationCommandType } from 'slash-create'
import { TextCommand } from '../types/Commands'
import ComponentCollector from '../utils/ComponentCollector'
import { clientId, botToken } from '../config'
import fs from 'fs'
import path from 'path'
import CustomSlashCommand, { isCustomSlashCommand } from './CustomSlashCommand'
import { logger } from '../utils/logger'
import { EventHandler } from '../types/Events'

class BotApp {
	bot: Discord.Client
	commands: TextCommand[]
	slashCreator: SlashCreator
	componentCollector: ComponentCollector
	acceptingCommands: boolean

	constructor (options: Discord.ClientOptions) {
		if (!clientId) {
			throw new Error('BOT_CLIENT_ID not defined in .env file')
		}
		else if (!botToken) {
			throw new Error('No bot token defined in .env')
		}

		this.bot = new Discord.Client(options)
		this.commands = []
		this.slashCreator = new SlashCreator({
			applicationID: clientId,
			token: botToken,
			handleCommandsManually: true,
			allowedMentions: {
				roles: false,
				users: true,
				everyone: false
			}
		})
		this.componentCollector = new ComponentCollector(this)
		this.acceptingCommands = false
	}

	async launch (): Promise<void> {
		const botEventFiles = fs.readdirSync(path.join(__dirname, '..', '/events')).filter(file => file.endsWith('.js') || file.endsWith('.ts'))

		this.commands = await this.loadCommands()

		this.slashCreator.withServer(
			new GatewayServer(
				handler => this.bot.ws.on('INTERACTION_CREATE', handler)
			)
		)

		await this.loadSlashCommmands()

		this.slashCreator.on('commandInteraction', (i, res, webserverMode) => {
			if (!this.acceptingCommands) {
				return res({
					status: 200,
					body: {
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: 'Restarting! Try using this command again in a minute or two...',
							flags: InteractionResponseFlags.EPHEMERAL
						}
					}
				})
			}

			const command = this.getSlashCommand(i.data.name, 'guild_id' in i ? i.guild_id : undefined)

			if (!command) {
				return res({
					status: 200,
					body: {
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: 'That command was recently removed.',
							flags: InteractionResponseFlags.EPHEMERAL
						}
					}
				})
			}

			const ctx = new CommandContext(this.slashCreator, i, res, webserverMode, command.deferEphemeral)

			return this._handleSlashCommand(command, ctx)
		})

		this.slashCreator.on('debug', msg => {
			logger.debug(msg)
		})

		// load bot gateway events
		for (const event of botEventFiles) {
			let eventHandler = await import(`../events/${event}`) as EventHandler | { default: EventHandler }

			if ('default' in eventHandler) {
				eventHandler = eventHandler.default
			}

			if (eventHandler.name === 'ready') {
				// using .once here because the ready event is called every time the bot reconnects and we may have functions
				// inside the ready event that we want called only once.
				this.bot.once(eventHandler.name, eventHandler.run.bind(this))
			}
			else {
				this.bot.on(eventHandler.name, eventHandler.run.bind(this))
			}
		}

		logger.info('[APP] Listening for events')
		await this.bot.login(botToken)
	}

	async loadCommands (): Promise<TextCommand[]> {
		const commandFiles = fs.readdirSync(path.join(__dirname, '..', '/text-commands'))
		const commandsArr: TextCommand[] = []

		for (const file of commandFiles) {
			if (file.endsWith('.js') || file.endsWith('.ts')) {
				try {
					// remove command file cache so you can reload commands while bot is running: eval app.commands = app.loadCommands();
					delete require.cache[require.resolve(`../text-commands/${file}`)]
				}
				catch (err) {
					logger.warn(err)
				}

				const { command }: { command: TextCommand } = await import(`../text-commands/${file}`)

				commandsArr.push(command)
			}
			else if (!file.endsWith('.map')) {
				const directory = fs.readdirSync(path.join(__dirname, '..', `/text-commands/${file}`)).filter(f => f.endsWith('.js'))

				for (const subFile of directory) {
					try {
						delete require.cache[require.resolve(`../text-commands/${file}/${subFile}`)]
					}
					catch (err) {
						logger.warn(err)
					}

					const { command }: { command: TextCommand } = await import(`../text-commands/${file}/${subFile}`)

					commandsArr.push(command)
				}
			}
		}

		return commandsArr
	}

	async loadSlashCommmands (): Promise<void> {
		const botCommandFiles = fs.readdirSync(path.join(__dirname, '..', '/slash-commands'))
		const commands = []

		for (const file of botCommandFiles) {
			if (file.endsWith('.js') || file.endsWith('.ts')) {
				const fileInfo = await import(`../slash-commands/${file}`)
				const command = 'default' in fileInfo ? fileInfo.default : fileInfo

				if (isCustomSlashCommand(command)) {
					commands.push(new command(this.slashCreator, this))
				}
				else {
					console.debug(`${file} does not default export a class thats extends the CustomSlashCommand class`)
				}
			}
			else if (!file.endsWith('.map')) {
				const directory = fs.readdirSync(path.join(__dirname, '..', `/slash-commands/${file}`)).filter(f => f.endsWith('.js'))

				for (const subFile of directory) {
					const fileInfo = await import(`../slash-commands/${file}/${subFile}`)
					const command = 'default' in fileInfo ? fileInfo.default : fileInfo

					if (isCustomSlashCommand(command)) {
						commands.push(new command(this.slashCreator, this))
					}
					else {
						console.debug(`${subFile} does not default export a class thats extends the CustomSlashCommand class`)
					}
				}
			}
		}

		this.slashCreator.registerCommands(commands)

		if (process.argv.slice(2)[0] === 'register-commands') {
			console.log(`Registering ${this.slashCreator.commands.size} slash commands`)
			this.slashCreator.syncCommands()
		}
	}

	/**
	 * Used to fetch a user from cache if possible, or makes an API call if not
	 * @param userID ID of user to fetch
	 * @returns A user object
	 */
	async fetchUser (userID: string): Promise<User> {
		const cachedUser = this.bot.users.cache.get(userID)

		if (cachedUser) {
			return cachedUser
		}

		// fetch user using api call
		return this.bot.users.fetch(userID)
	}

	/**
	 * Fetches a member from a guilds cache if possible, or makes an API call if not
	 * @param guild Guild to check for member in
	 * @param userID ID of user to get member object of
	 * @returns A guild member object
	 */
	async fetchMember (guild: Guild, userID: string): Promise<GuildMember | undefined> {
		let member = guild.members.cache.get(userID)

		if (member) {
			return member
		}

		try {
			await guild.members.fetch()

			member = guild.members.cache.get(userID)

			if (member) {
				return member
			}
		}
		catch (err) {
			logger.error(err)
		}
	}

	private getSlashCommand (commandName: string, guildID?: string): CustomSlashCommand | undefined {
		return guildID ?
			this.slashCreator.commands.find(command =>
				!!(command.guildIDs &&
				command.guildIDs.includes(guildID) &&
				command.commandName === commandName &&
				command.type === ApplicationCommandType.CHAT_INPUT)
			) as CustomSlashCommand | undefined ||
				this.slashCreator.commands.get(`${ApplicationCommandType.CHAT_INPUT}:global:${commandName}`) as CustomSlashCommand | undefined :
			this.slashCreator.commands.get(`${ApplicationCommandType.CHAT_INPUT}:global:${commandName}`) as CustomSlashCommand | undefined
	}

	private async _handleSlashCommand (command: CustomSlashCommand, ctx: CommandContext) {
		try {
			let afterCommandMessage: MessageOptions | undefined

			// command was run in a server
			if (ctx.guildID) {
				// check if user has manage server permission before running GuildModCommand
				if (command.customOptions.guildModsOnly && (!ctx.member || !ctx.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD))) {
					return ctx.send({
						content: 'You need the `Manage Server` permission to use this command!',
						flags: InteractionResponseFlags.EPHEMERAL
					})
				}
			}

			// non-worksInDMs command cannot be used in DM channel
			else if (!command.customOptions.worksInDMs) {
				return ctx.send({
					content: 'That command cannot be used in DMs.',
					flags: InteractionResponseFlags.EPHEMERAL
				})
			}

			// defer response before running command since command may take time to execute
			if (!command.customOptions.noDefer) {
				await ctx.defer(command.deferEphemeral)
			}

			// recursive function to respond AFTER a user uses a command, it checks to make sure
			// the bot has already responded before sending the notification
			const sendAfterCommandMessage = (msg: MessageOptions, attemptNum = 1) => new Promise<boolean>((resolve, reject) => {
				setTimeout(async () => {
					try {
						if (attemptNum >= 5) {
							// command hasn't been responded to in over 5 seconds? give up i guess
							reject(new Error('Command not responded to after 5000 ms'))
							return
						}

						const hasResponded = await ctx.fetch()

						// ensure command was responded to before sending this message
						if (hasResponded.content || hasResponded.embeds.length) {
							await ctx.sendFollowUp(msg)
							resolve(true)
						}
						else {
							// try to respond again
							resolve(sendAfterCommandMessage(msg, attemptNum + 1))
						}
					}
					catch (err) {
						logger.warn(err)
					}
				}, 1000)
			})

			if (afterCommandMessage) {
				sendAfterCommandMessage(afterCommandMessage).catch(err => {
					logger.warn(err)
				})
			}

			logger.info(`Command (${command.commandName}) run by ${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) in ${ctx.guildID ? `guild (${ctx.guildID})` : 'DMs'}`)
			await command.run(ctx)
		}
		catch (err) {
			logger.error(err)
			ctx.send({
				content: 'The command didn\'t work... woops?',
				ephemeral: command.deferEphemeral
			}).catch(msgErr => {
				logger.warn(msgErr)
			})
		}
	}
}

export default BotApp
