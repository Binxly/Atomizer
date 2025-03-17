/**
 * Formats the current date and time in a user-friendly format
 * For frontmatter, we use a human-readable format with spaces
 */
export const getFormattedDateTime = (): string => {
	const date = new Date();
	return date
		.toISOString()
		.replace("T", " ")
		.replace(/\.\d+Z$/, "");
};

/**
 * Returns an ISO-formatted timestamp for OpenAI API
 */
export const getISOTimestamp = (): string => {
	return new Date().toISOString();
};
