import { App, PluginSettingTab, Setting } from "obsidian";
import type AtomizerPlugin from "./main";

/**
 * Settings interface for the Atomizer plugin
 */
export interface AtomizerSettings {
	apiKey: string;
	outputFolder: string;
	model: string;
	enableAtomizedTag: boolean;
	customTags: string;
}

/**
 * Default settings for the Atomizer plugin
 */
export const DEFAULT_SETTINGS: AtomizerSettings = {
	apiKey: "",
	outputFolder: "atomic-notes",
	model: "gpt-4o-mini",
	enableAtomizedTag: true,
	customTags: "",
};

/**
 * Settings tab for the Atomizer plugin
 */
export class AtomizerSettingTab extends PluginSettingTab {
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
