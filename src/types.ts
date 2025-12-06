/**
 * Error type for OpenAI API errors
 * @deprecated No longer used - errors are now thrown as standard Error objects with descriptive messages
 */
export interface APIError extends Error {
	response?: {
		status: number;
		data: unknown;
	};
	status?: number;
	code?: string;
}
