import { EventEmitter } from 'events'
import { ComponentContext, ComponentType, CommandContext, Message, MessageOptions } from 'slash-create'
import BotApp from '../structures/BotApp'
import { GRAY_BUTTON, NEXT_BUTTON, PREVIOUS_BUTTON } from './constants'
import { disableAllComponents } from './messageUtils'

interface Collector {
	messageID: string
	e: CollectorEventEmitter
	filter: (ctx: ComponentContext) => boolean
	collected: ComponentContext[]
	limit?: number
	timeout: NodeJS.Timeout
}

interface CollectorEventEmitter extends EventEmitter {
	on: CollectorEvents<this>
	once: CollectorEvents<this>
}

interface CollectorEvents<T> {
	(event: 'collect', listener: (ctx: ComponentContext) => void): T
	(event: 'end', listener: (msg: string | ComponentContext[]) => void): T
}

export interface CollectorObject {
	collector: CollectorEventEmitter
	stopCollector: (reason?: string) => void
}

class ComponentCollector {
	private app: BotApp
	private collectors: Collector[]

	constructor (app: BotApp) {
		this.app = app
		this.collectors = []

		this.app.slashCreator.on('componentInteraction', this.verify.bind(this))
	}

	private async verify (ctx: ComponentContext): Promise<void> {
		try {
			const colObj = this.collectors.find(obj => obj.messageID === ctx.message.id)

			if (colObj) {
				if (!colObj.filter(ctx)) {
					await ctx.send({
						ephemeral: true,
						content: 'This button is meant for someone else.'
					})
					return
				}

				colObj.collected.push(ctx)
				colObj.e.emit('collect', ctx)

				if (colObj.limit && colObj.collected.length >= colObj.limit) {
					this.stopCollector(colObj, colObj.collected)
				}
			}
			else {
				// in case bot restarts or button wasn't removed from the message
				await ctx.acknowledge()

				await ctx.editOriginal({
					content: 'Message timed out.',
					components: disableAllComponents(ctx.message.components)
				})
			}
		}
		catch (err) {
			console.error(err)
		}
	}

	/**
	 * An event-driven way to collect button clicks from users
	 * @param messageID ID of the message to collect button interactions from
	 * @param filter Filter the button interactions will have to pass
	 * @param time How long the button collector lasts in milliseconds
	 * @param limit How many button interactions to collect max
	 * @returns An object with an event emitting object: collector, and and function used to stop the collector early: stopCollector
	 */
	createCollector (messageID: string, filter: (i: ComponentContext) => boolean, time = 15000, limit?: number): CollectorObject {
		const eventCollector = new EventEmitter()

		const collectorObj: Collector = {
			messageID,
			timeout: setTimeout(() => {
				this.stopCollector(collectorObj, 'time')
			}, time),
			e: eventCollector,
			collected: [],
			limit,
			filter
		}

		this.collectors.push(collectorObj)

		return {
			collector: collectorObj.e,
			stopCollector: (reason?: string) => { this.stopCollector(collectorObj, reason) }
		}
	}

	/**
	 * Used to wait for a button click from a user on a given message
	 * @param messageID ID of the message to collect button interactions from
	 * @param filter Filter the button interactions will have to pass
	 * @param time How long the button collector lasts in milliseconds
	 * @param limit How many button interactions to collect max
	 * @returns An array of button interactions
	 */
	awaitClicks (messageID: string, filter: (i: ComponentContext) => boolean, time = 15000, limit = 1): Promise<ComponentContext[]> {
		const { collector } = this.createCollector(messageID, filter, time, limit)

		return new Promise((resolve, reject) => {
			collector.once('end', val => {
				if (val !== 'time') {
					resolve(val as ComponentContext[])
				}
				else {
					reject(val)
				}
			})
		})
	}

	/**
	 * Used to create a message with pagination buttons based on an array of messages
	 * @param ctx Command context to use when responding
	 * @param pages Array of messages to become pages
	 * @param otherComponentHandler Function that handles clicks on components unrelated to pagination (so custom buttons alongside the page buttons),
	 * the return value determines whether the pagination loop continues or not (true = continue pagination, false = stop the button listener)
	 */
	async paginate (
		ctx: CommandContext | ComponentContext,
		pages: MessageOptions[],
		otherComponentHandler?: (
			/**
			 * The component context of the interaction
			 */
			pageCtx: ComponentContext,
			/**
			 * The current page number
			 */
			page: number
		) => Promise<{
			/**
			 * Whether or not to continue pagination after handling the custom component
			 */
			continuePagination: boolean
			/**
			 * If this custom component changed the pages in any way, you can supply the new pages here
			 */
			newPages?: {
				messages: MessageOptions[]
				/**
				 * Whether to add page buttons to messages automatically, defaults true
				 */
				addPageComponents?: boolean
				/**
				 * Whether to reset the page to 0, requires the provided new pages array length to be SAME as initial message array provided.
				 * defaults true
				 */
				resetPageNumber?: boolean
			}
		}>,
		addPageComponents = true
	): Promise<void> {
		if (!otherComponentHandler && pages.length === 1) {
			await ctx.send(pages[0])
			return
		}

		if (addPageComponents && pages.length > 1) {
			pages = ComponentCollector.addPageButtonsToPages(pages)
		}

		const botMessage = await ctx.send(pages[0]) as Message
		let page = 0
		let looping = true

		while (looping) {
			try {
				const componentCtx = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id, 30000))[0]
				await componentCtx.acknowledge()

				if (componentCtx.customID === 'previous' && page !== 0) {
					page--

					await componentCtx.editParent(pages[page])
				}
				else if (componentCtx.customID === 'next' && page !== (pages.length - 1)) {
					page++

					await componentCtx.editParent(pages[page])
				}
				else if (componentCtx.customID !== 'pageNum' && otherComponentHandler) {
					const handledResult = await otherComponentHandler(componentCtx, page)
					if (handledResult.continuePagination || handledResult.newPages) {
						if (handledResult.newPages) {
							const resetPageNumber = handledResult.newPages.resetPageNumber !== undefined ? handledResult.newPages.resetPageNumber : true
							const addNewPageComponents = handledResult.newPages.addPageComponents !== undefined ? handledResult.newPages.addPageComponents : true

							if (
								!resetPageNumber &&
								handledResult.newPages.messages.length !== pages.length
							) {
								throw new Error('new pages array length must match old pages length when not resetting page number')
							}

							if (addNewPageComponents && handledResult.newPages.messages.length > 1) {
								pages = ComponentCollector.addPageButtonsToPages(handledResult.newPages.messages)
							}
							else {
								pages = handledResult.newPages.messages
							}

							if (resetPageNumber) {
								page = 0
							}

							await componentCtx.editParent(pages[page])
						}
					}
					else {
						looping = false
					}
				}
			}
			catch (err) {
				looping = false
				botMessage.edit({
					content: 'menu expired',
					components: disableAllComponents(botMessage.components)
				}).catch(error => console.warn(error))
			}
		}
	}

	static addPageButtonsToPages (messages: MessageOptions[]): MessageOptions[] {
		for (let i = 0; i < messages.length; i++) {
			const page = messages[i]
			const buttons = [
				PREVIOUS_BUTTON(i === 0),
				GRAY_BUTTON(`Page ${i + 1} / ${messages.length}`, 'pageNum'),
				NEXT_BUTTON(i === (messages.length - 1))
			]

			if (page.components) {
				page.components.push({
					type: ComponentType.ACTION_ROW,
					components: buttons
				})
			}
			else {
				page.components = [{
					type: ComponentType.ACTION_ROW,
					components: buttons
				}]
			}
		}

		return messages
	}

	private stopCollector (collectorObj: Collector, message: string | ComponentContext[] = 'forced'): void {
		if (this.collectors.includes(collectorObj)) {
			clearTimeout(collectorObj.timeout)
			collectorObj.e.emit('end', message)
			this.collectors.splice(this.collectors.indexOf(collectorObj), 1)
		}
	}
}

export default ComponentCollector
