export const debug = process.env.NODE_ENV !== 'production'

export const botToken = process.env.BOT_TOKEN

export const clientId = process.env.BOT_CLIENT_ID

// This is only used for text commands (commands that rely on message.content)
// you can also just mention the bot if you don't have the message content intent
// ex. =ban <user> or @bot ban <user> both work
export const prefix = process.env.PREFIX || '-'

export const icons = {
} as const

// User ids of users who have admin permissions (can run commands with the 'admin' category)
export const adminUsers = ['494220264129953792']
