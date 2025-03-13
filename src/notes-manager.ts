import { App, normalizePath } from "obsidian";

/**
 * Manages the creation and storage of atomic notes
 */
export class NotesManager {
	private usedTitles = new Set<string>();

	constructor(
		private app: App,
		private folderPath: string,
	) {}

	/**
	 * Creates the output folder if it doesn't exist
	 */
	async createFolder(): Promise<void> {
		if (!(await this.app.vault.adapter.exists(this.folderPath))) {
			await this.app.vault.createFolder(this.folderPath);
		}
	}

	/**
	 * Saves a note to the filesystem
	 */
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

	/**
	 * Ensures titles are unique by adding a counter if needed
	 */
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
