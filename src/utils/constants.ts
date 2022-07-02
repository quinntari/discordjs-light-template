import { ButtonStyle, ComponentButton, ComponentType } from 'slash-create'

export const PREVIOUS_BUTTON = (disabled: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label: 'Previous Page',
	custom_id: 'previous',
	style: ButtonStyle.SECONDARY,
	disabled
})

export const NEXT_BUTTON = (disabled: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label: 'Next Page',
	custom_id: 'next',
	style: ButtonStyle.SECONDARY,
	disabled
})

export const GRAY_BUTTON = (label: string, customID: string, disabled?: boolean, icon?: string | { name: string, id: string }): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.SECONDARY,
	disabled,
	emoji: icon ? {
		name: typeof icon === 'string' ? icon : icon.name,
		id: typeof icon === 'string' ? undefined : icon.id
	} : undefined
})
