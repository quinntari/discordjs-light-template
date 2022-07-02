export function formatNumber (number: number, decimals = false): string {
	return number.toLocaleString('en', { maximumFractionDigits: decimals ? 2 : 0, minimumFractionDigits: decimals ? 2 : 0 })
}
