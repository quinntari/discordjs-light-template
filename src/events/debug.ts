import { debug } from '../config'
import { EventHandler } from '../types/Events'
import { logger } from '../utils/logger'

export default {
	name: 'debug',
	async run (message) {
		if (debug) {
			logger.debug(`Debug: ${message}`)
		}
	}
} as EventHandler<'debug'>
