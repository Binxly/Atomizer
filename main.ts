import {
	App,
	Editor,
	MarkdownView,
	MarkdownFileInfo,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	normalizePath,
} from "obsidian";

import OpenAI from "openai";

// Types and Interfaces
interface APIError extends Error {
	response?: {
		status: number;
		data: any;
	};
}

interface AtomizerSettings {
	apiKey: string;
	outputFolder: string;
	model: string;
	enableAtomizedTag: boolean;
	customTags: string;
}

// Constants
const DEFAULT_SETTINGS: AtomizerSettings = {
	apiKey: "",
	outputFolder: "atomic-notes",
	model: "gpt-4o-mini",
	enableAtomizedTag: true,
	customTags: "",
};

/**
 * Formats the current date and time in a user-friendly format
 * For frontmatter, we use a human-readable format with spaces
 */
const getFormattedDateTime = (): string => {
	const date = new Date();
	return date
		.toISOString()
		.replace("T", " ")
		.replace(/\.\d+Z$/, "");
};

// Move SYSTEM_PROMPT into a function that takes settings as a parameter
const getSystemPrompt = (settings: AtomizerSettings): string => {
	return `You are an expert at creating atomic notes from a single, larger note.
            Take the content from a larger note and break it down into separate compact yet detailed atomic notes. Each note MUST be separated by placing '<<<>>>' on its own line between notes. Do not include an index or main note. Follow these rules:
1. Each note should contain exactly one clear idea. This can contain multiple lines.
2. Each note must have a YAML frontmatter section at the top with:
---
date: "${getFormattedDateTime()}"
tags: ${settings.enableAtomizedTag ? "atomized" : ""}${settings.customTags ? (settings.enableAtomizedTag ? ", " : "") + settings.customTags : ""}
---
3. You MUST separate each note by placing '<<<>>>' on its own line between notes
4. After the frontmatter, each note must start with a level 1 heading (# Title)
5. The content should be self-contained and independently understandable
6. Use proper Markdown formatting
7. Do not include the separator at the start or end of the response`;
};

// OpenAI Service
class OpenAIService {
	constructor(
		private apiKey: string,
		private model: string,
		private settings: AtomizerSettings,
	) {}

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
					content: getSystemPrompt(this.settings),
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
}

// Notes Manager
class NotesManager {
	private usedTitles = new Set<string>();

	constructor(
		private app: App,
		private folderPath: string,
	) {}

	async createFolder(): Promise<void> {
		if (!(await this.app.vault.adapter.exists(this.folderPath))) {
			await this.app.vault.createFolder(this.folderPath);
		}
	}

	async saveNote(note: string): Promise<void> {
		const titleMatch = note.match(/^#\s+(.+)$/m);
		if (!titleMatch || !titleMatch[1]) {
			console.warn("No title found in note:", note.slice(0, 100));
			return;
		}

		const baseTitle = titleMatch[1].trim();
		const title = this.getUniqueTitle(baseTitle);
		const fileName = `${this.folderPath}/${normalizePath(title)}.md`;
		await this.app.vault.create(fileName, note.trim());
	}

	private getUniqueTitle(baseTitle: string): string {
		let title = baseTitle;
		let counter = 1;
		while (this.usedTitles.has(title)) {
			title = `${baseTitle} ${counter}`;
			counter++;
		}
		return normalizePath(title);
	}
}

// Main Plugin Class
export default class AtomizerPlugin extends Plugin {
	settings: AtomizerSettings = DEFAULT_SETTINGS;
	private statusBarItem!: HTMLElement;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon("atom", "Atomize note", async () => {
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				await this.atomizeNote(activeView);
			} else {
				new Notice("Please open a note to atomize");
			}
		});

		// Add command
		this.addCommand({
			id: "atomize-current-note",
			name: "Atomize current note",
			editorCallback: async (
				editor: Editor,
				ctx: MarkdownView | MarkdownFileInfo,
			) => {
				if (ctx instanceof MarkdownView) {
					await this.atomizeNote(ctx);
				} else {
					new Notice("Please open a note to atomize");
				}
			},
		});

		// Add settings tab
		this.addSettingTab(new AtomizerSettingTab(this.app, this));

		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText("Atomizer: ready");
	}

	async atomizeNote(view: MarkdownView) {
		if (!this.validateSettings()) return;

		const content = view.getViewData();
		if (!content.trim()) {
			new Notice("The current note is empty");
			return;
		}

		new ConfirmationModal(this.app, async () => {
			const loadingNotice = new Notice("Processing note...", 0);

			try {
				const openAIService = new OpenAIService(
					this.settings.apiKey,
					this.settings.model,
					this.settings,
				);
				const notesManager = new NotesManager(
					this.app,
					this.settings.outputFolder,
				);

				const responseContent = await openAIService.generateAtomicNotes(
					content,
					this.getISOTimestamp(),
				);
				if (!responseContent)
					throw new Error("No content received from OpenAI");

				const atomicNotes = responseContent
					.split("<<<>>>")
					.map((note) => note.trim())
					.filter((note) => note.length > 0);

				if (atomicNotes.length === 0) {
					throw new Error(
						"No atomic notes were generated. The response may not be properly formatted.",
					);
				}

				await notesManager.createFolder();

				for (const note of atomicNotes) {
					await notesManager.saveNote(note);
				}

				new Notice(
					`Successfully created ${atomicNotes.length} atomic notes`,
				);
			} catch (error) {
				this.handleError(error);
			} finally {
				loadingNotice.hide();
				this.statusBarItem.setText("Atomizer: Ready");
			}
		}).open();
	}

	private validateSettings(): boolean {
		if (!this.settings.apiKey) {
			new Notice("Please set your OpenAI API key in settings");
			return false;
		}
		return true;
	}

	private handleError(error: unknown) {
		console.error("Detailed error:", error);

		if (error instanceof Error) {
			new Notice(`Error: ${error.message || "Unknown error occurred"}`);

			const apiError = error as APIError;
			if (apiError.response) {
				console.error("OpenAI API Error:", {
					status: apiError.response.status,
					data: apiError.response.data,
				});
			}
		} else {
			new Notice("An unknown error occurred");
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Returns an ISO-formatted timestamp for OpenAI API
	 */
	private getISOTimestamp(): string {
		return new Date().toISOString();
	}
}

class AtomizerSettingTab extends PluginSettingTab {
	plugin: AtomizerPlugin;

	constructor(app: App, plugin: AtomizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("OpenAI API key")
			.setDesc("Enter your OpenAI API key")
			.addText((text) =>
				text
					.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Model")
			.setDesc("Choose the OpenAI model to use")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("gpt-4o-mini", "GPT-4o Mini")
					.addOption("gpt-4o", "GPT-4o")
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Output folder")
			.setDesc("Folder where atomic notes will be created")
			.addText((text) =>
				text
					.setPlaceholder("atomic-notes")
					.setValue(this.plugin.settings.outputFolder)
					.onChange(async (value) => {
						this.plugin.settings.outputFolder = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Enable "atomized" tag')
			.setDesc('Automatically add the "atomized" tag to generated notes')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableAtomizedTag)
					.onChange(async (value) => {
						this.plugin.settings.enableAtomizedTag = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Custom tags")
			.setDesc(
				"Additional tags to add to generated notes (comma-separated)",
			)
			.addText((text) =>
				text
					.setPlaceholder("tag1, tag2, tag3")
					.setValue(this.plugin.settings.customTags)
					.onChange(async (value) => {
						this.plugin.settings.customTags = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}

class ConfirmationModal extends Modal {
	constructor(
		app: App,
		private onConfirm: () => void,
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText(
			"This will create multiple atomic notes in your vault. Continue?",
		);

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => this.close()),
			)
			.addButton((btn) =>
				btn
					.setButtonText("Continue")
					.setCta()
					.onClick(() => {
						this.close();
						this.onConfirm();
					}),
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
