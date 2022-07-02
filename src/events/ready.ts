import { EventHandler } from '../types/Events'
import { logger } from '../utils/logger'

export default {
	name: 'ready',
	async run () {
		this.acceptingCommands = true

		try {
			const cmds = await this.bot.application?.commands.fetch()

			logger.info(`Bot ready and listening for ${cmds?.size || 0} commands! (${cmds?.map(c => c.name).join(', ')})`)
		}
		catch (err) {
			logger.info('Bot ready and accepting commands!')
		}
	}
} as EventHandler<'ready'>
