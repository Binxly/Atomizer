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
	 */
	async generateAtomicNotes(
		content: string,
		timestamp: string,
	): Promise<string> {
		if (!this.apiKey) {
			new Notice(
				"OpenAI API key is not set. Please configure it in plugin settings.",
			);
			return "";
		}

		// Inform user about network request
		new Notice("Sending request to OpenAI...", 3000);

		const openai = new OpenAI({
			apiKey: this.apiKey,
			dangerouslyAllowBrowser: true,
		});

		const completion = await openai.chat.completions.create({
			model: this.model,
			messages: [
				{
					role: "system",
					content: this.getSystemPrompt(),
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
	}

	/**
	 * Generate the system prompt for OpenAI
	 */
	private getSystemPrompt(): string {
		return `You are an expert at creating atomic notes from a single, larger note.
                Take the content from a larger note and break it down into separate compact yet detailed atomic notes. Each note MUST be separated by placing '<<<>>>' on its own line between notes. Do not include an index or main note. Follow these rules:
1. Each note should contain exactly one clear idea. This can contain multiple lines.
2. Each note must have a YAML frontmatter section at the top with:
---
date: "${getFormattedDateTime()}"
tags: ${this.settings.enableAtomizedTag ? "atomized" : ""}${this.settings.customTags ? (this.settings.enableAtomizedTag ? ", " : "") + this.settings.customTags : ""}
---
3. You MUST separate each note by placing '<<<>>>' on its own line between notes
4. After the frontmatter, each note must start with a level 1 heading (# Title)
5. The content should be self-contained and independently understandable
6. Use proper Markdown formatting
7. Do not include the separator at the start or end of the response`;
	}
}
