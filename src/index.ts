import { botToken } from './config'
import AppBot from './structures/BotApp'
import { logger } from './utils/logger'
import Discord from 'discord.js-light'

if (!botToken) {
	throw new Error('No bot token defined in .env')
}

const app = new AppBot({
	intents: [
		'GUILDS',
		'DIRECT_MESSAGES',
		'GUILD_MESSAGES'
	],
	makeCache: Discord.Options.cacheWithLimits({
		ApplicationCommandManager: 0, // guild.commands
		BaseGuildEmojiManager: 0, // guild.emojis
		ChannelManager: 0, // client.channels
		GuildChannelManager: 0, // guild.channels
		GuildBanManager: 0, // guild.bans
		GuildInviteManager: 0, // guild.invites
		GuildManager: Infinity, // client.guilds
		GuildMemberManager: 0, // guild.members
		GuildStickerManager: 0, // guild.stickers
		GuildScheduledEventManager: 0, // guild.scheduledEvents
		MessageManager: 0, // channel.messages
		PermissionOverwriteManager: 0, // channel.permissionOverwrites
		PresenceManager: 0, // guild.presences
		ReactionManager: 0, // message.reactions
		ReactionUserManager: 0, // reaction.users
		RoleManager: 0, // guild.roles
		StageInstanceManager: 0, // guild.stageInstances
		ThreadManager: 0, // channel.threads
		ThreadMemberManager: 0, // threadchannel.members
		UserManager: 0, // client.users
		VoiceStateManager: 0 // guild.voiceStates
	}),
	allowedMentions: {
		repliedUser: false,
		parse: ['users']
	},
	presence: {
		activities: [{
			name: 'hello!',
			type: 'PLAYING'
		}]
	}
})

app.launch()

process.on('SIGINT', () => {
	logger.info('Stopping')
	process.exit(0)
})

process.on('unhandledRejection', (reason, promise) => {
	logger.error(reason as any)
})
