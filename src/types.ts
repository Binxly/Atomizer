/**
 * Error type for OpenAI API errors
 */
export interface APIError extends Error {
	response?: {
		status: number;
		data: any;
	};
}
