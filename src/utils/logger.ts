import pino from 'pino'
import { PrettyOptions } from 'pino-pretty'

const pinoPrettyOpts: PrettyOptions = {
	colorize: true,
	ignore: 'pid,hostname',
	translateTime: 'yyyy-mm-dd HH:MM:ss'
}

const pinoBase = pino({
	level: process.env.LOG_LEVEL || 'info',
	transport: {
		target: 'pino-pretty',
		options: pinoPrettyOpts
	}
})

export const logger = pinoBase
