import {
	Editor,
	MarkdownView,
	MarkdownFileInfo,
	Notice,
	Plugin,
} from "obsidian";

import {
	AtomizerSettings,
	AtomizerSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";

import { OpenAIService } from "./openai-service";
import { NotesManager } from "./notes-manager";
import { ConfirmationModal } from "./modals";
import { getISOTimestamp } from "./utils";
import { APIError } from "./types";

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

	onunload() {
		// Clean up the status bar item
		this.statusBarItem.remove();
	}

	async atomizeNote(view: MarkdownView) {
		if (!this.validateSettings()) return;

		const content = view.getViewData();
		if (!content.trim()) {
			new Notice("The current note is empty");
			return;
		}

		new ConfirmationModal(this.app, async () => {
			this.statusBarItem.setText("Atomizer: Processing...");
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

				// Get the source file name to include in the generated notes
				const sourceFileName = view.file?.basename || "Unknown Source";

				const responseContent = await openAIService.generateAtomicNotes(
					content,
					getISOTimestamp(),
					sourceFileName,
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
				this.statusBarItem.setText("Atomizer: Ready");
			} catch (error) {
				this.handleError(error);
				this.statusBarItem.setText("Atomizer: Error");
			} finally {
				loadingNotice.hide();
			}
		}).open();
	}

	private validateSettings(): boolean {
		// Validate API key
		if (!this.settings.apiKey || !this.settings.apiKey.trim()) {
			new Notice("Please set your OpenAI API key in settings");
			return false;
		}

		// Validate API key format (basic check for OpenAI key pattern)
		if (!this.settings.apiKey.startsWith("sk-")) {
			new Notice("Invalid OpenAI API key format. Keys should start with 'sk-'");
			return false;
		}

		// Validate output folder
		if (!this.settings.outputFolder || !this.settings.outputFolder.trim()) {
			new Notice("Output folder path cannot be empty");
			return false;
		}

		// Check for invalid characters in folder path
		const invalidChars = /[<>:"|?*\x00-\x1f]/;
		if (invalidChars.test(this.settings.outputFolder)) {
			new Notice("Output folder path contains invalid characters");
			return false;
		}

		// Validate model selection
		const validModels = ["gpt-4o-mini", "gpt-4o"];
		if (!validModels.includes(this.settings.model)) {
			new Notice(`Invalid model selected: ${this.settings.model}. Please choose a valid model in settings.`);
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
}
