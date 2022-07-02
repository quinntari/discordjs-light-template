import { EventHandler } from '../types/Events'
import { logger } from '../utils/logger'

export default {
	name: 'error',
	async run (error) {
		logger.error(`Error: ${error.message}`)
	}
} as EventHandler<'error'>
