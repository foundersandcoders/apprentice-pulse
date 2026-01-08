// Shared Tailwind CSS classes for consistent styling across the application

export const styles = {
	// Layout
	container: {
		narrow: 'p-6 max-w-2xl mx-auto',
		standard: 'p-6 max-w-4xl mx-auto',
		wide: 'p-6 max-w-6xl mx-auto',
	},

	// Cards
	card: {
		base: 'bg-white border border-gray-200 rounded-xl shadow-sm',
		hover: 'hover:shadow-lg hover:border-blue-300 transition-all',
		success: 'bg-green-50 border-green-300',
		warning: 'bg-orange-50 border-orange-300',
		error: 'bg-red-50 border-red-300',
	},

	// Headers
	header: {
		section: 'mb-6 flex justify-between items-start',
		title: 'text-2xl font-bold',
		subtitle: 'text-gray-600 mt-1',
	},

	// Buttons
	button: {
		base: 'px-4 py-2 rounded-lg font-medium transition-colors',
		primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
		secondary: 'border border-gray-300 hover:bg-gray-50',
		danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed',
		success: 'bg-green-600 text-white',
		warning: 'bg-orange-600 text-white',
		disabled: 'bg-gray-300 text-gray-500 cursor-not-allowed',
		link: 'text-blue-600 hover:underline',
		large: 'px-4 py-3 rounded-lg font-medium transition-colors',
	},

	// Forms
	form: {
		label: 'block text-sm font-medium text-gray-700 mb-2',
		input: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500',
		inputLarge: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500',
		error: 'mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm',
	},

	// Badges
	badge: {
		base: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
		gray: 'bg-gray-100 text-gray-800',
		blue: 'bg-blue-100 text-blue-800',
		green: 'bg-green-100 text-green-800',
		red: 'bg-red-100 text-red-800',
		orange: 'bg-orange-100 text-orange-800',
		purple: 'bg-purple-100 text-purple-800',
	},

	// Status indicators
	status: {
		tag: 'inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium',
		late: 'bg-red-100 text-red-800',
		soon: 'bg-orange-100 text-orange-800',
		normal: 'bg-blue-100 text-blue-800',
	},

	// Alerts
	alert: {
		success: 'p-4 bg-green-50 border border-green-200 rounded-xl text-green-700',
		error: 'p-4 bg-red-50 border border-red-200 rounded-xl text-red-700',
		warning: 'p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-700',
		info: 'p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700',
	},

	// Utility
	link: 'text-blue-600 hover:underline',
	textMuted: 'text-gray-500',
	textSmall: 'text-sm',
	spacing: {
		section: 'mb-6',
		item: 'mb-4',
		compact: 'mb-2',
	},
} as const;

// Helper function to combine classes
export function cn(...classes: (string | undefined | false)[]) {
	return classes.filter(Boolean).join(' ');
}
