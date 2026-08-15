import { Notice } from "obsidian";
import OpenAI from "openai";
import { AtomizerSettings } from "./settings";
import { getFormattedDateTime } from "./utils";

/**
 * Service for interacting with the OpenAI API
 */
export class OpenAIService {
	constructor(
		private apiKey: string,
		private model: string,
		private settings: AtomizerSettings,
	) {}

	/**
	 * Generate atomic notes from content using OpenAI
	 * @param content The content to process
	 * @param timestamp ISO timestamp
	 * @param sourceFilePath Path to the source file
	 */
	async generateAtomicNotes(
		content: string,
		timestamp: string,
		sourceFilePath: string,
	): Promise<string> {
		// Inform user about network request
		new Notice("Sending request to OpenAI...", 3000);

		const openai = new OpenAI({
			apiKey: this.apiKey,
			dangerouslyAllowBrowser: true,
		});

		try {
			const completion = await openai.chat.completions.create({
				model: this.model,
				messages: [
					{
						role: "system",
						content: this.getSystemPrompt(sourceFilePath),
					},
					{
						role: "user",
						content: content,
					},
				],
				temperature: 0.7,
				max_tokens: 4000,
			});

			return completion.choices[0]?.message?.content ?? "";
		} catch (error: any) {
			// Handle specific OpenAI API errors
			if (error?.status === 401) {
				throw new Error("Invalid OpenAI API key. Please check your settings.");
			} else if (error?.status === 429) {
				throw new Error("OpenAI API rate limit exceeded. Please try again later.");
			} else if (error?.status === 404) {
				throw new Error(`Model '${this.model}' not found. Please check your model selection.`);
			} else if (error?.status === 400) {
				throw new Error("Invalid request to OpenAI. The content may be too long or contain invalid characters.");
			} else if (error?.code === "ENOTFOUND" || error?.code === "ECONNREFUSED") {
				throw new Error("Network error. Please check your internet connection.");
			} else if (error?.message) {
				throw new Error(`OpenAI API error: ${error.message}`);
			} else {
				throw new Error("Failed to generate atomic notes. Please try again.");
			}
		}
	}

	/**
	 * Generate the system prompt for OpenAI
	 * @param sourceFilePath Path to the source file for back-linking
	 */
	private getSystemPrompt(sourceFilePath: string): string {
		return `You are an expert at creating atomic notes from a single, larger note.
                Take the content from a larger note and break it down into separate compact yet detailed atomic notes. Each note MUST be separated by placing '<<<>>>' on its own line between notes. Do not include an index or main note. Follow these rules:
1. Each note should contain exactly one clear idea. This can contain multiple lines.
2. Each note must have a YAML frontmatter section at the top with:
---
date: "${getFormattedDateTime()}"
tags: ${this.settings.enableAtomizedTag ? "atomized" : ""}${this.settings.customTags ? (this.settings.enableAtomizedTag ? ", " : "") + this.settings.customTags : ""}
source: "[[${sourceFilePath}]]"
---
3. You MUST separate each note by placing '<<<>>>' on its own line between notes
4. After the frontmatter, each note must start with a level 1 heading (# Title). The title must be specific and descriptive, clearly identifying the unique subject or concept of the note. Avoid generic or ambiguous titles (e.g., "Historical Context", "Introduction", "Key Points") that could apply to any topic. Instead, include specific terms, names, or concepts from the content so that the title alone distinguishes this note from notes on other subjects.
5. The content should be self-contained and independently understandable
6. Use proper Markdown formatting
7. Do not include the separator at the start or end of the response`;
	}
}
