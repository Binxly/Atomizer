import { App, Modal, Setting } from "obsidian";

/**
 * Modal for confirming before creating atomic notes
 */
export class ConfirmationModal extends Modal {
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
