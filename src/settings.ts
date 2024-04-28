import type { CanvasKeyboardPan, CanvasKeyboardPanSettings } from "./plugin";
import { DEFAULT_SETTINGS, Direction } from "./plugin";
import { PluginSettingTab, Setting, setIcon } from "obsidian";

import type { App } from "obsidian";

export class CanvasKeyboardPanSettingsTab extends PluginSettingTab {
	keySettingsListener: ((evt: KeyboardEvent) => void) | null = null;
	activeDirection: Direction | null = null;
	keys: Partial<CanvasKeyboardPanSettings["keys"]> = {};

	public constructor(
		public app: App,
		public plugin: CanvasKeyboardPan,
	) {
		super(app, plugin);
	}

	public display() {
		this.containerEl.empty();
		const keyboardViewContainer = this.containerEl.createDiv();
		keyboardViewContainer.appendChild(this.renderKeyboardView(this.plugin.settings.keys, null));
		new Setting(this.containerEl)
			.setName("Controls")
			.setDesc("Which set of keys pan the canvas.")
			.addButton((button) => {
				button.setButtonText("Update controls");
				button.onClick(() => {
					this.activeDirection = Direction.North;
					this.keys = {};
					keyboardViewContainer.empty();
					keyboardViewContainer.appendChild(this.renderKeyboardView(this.keys, this.activeDirection));
					const listener = ((evt: KeyboardEvent) => {
						if (this.activeDirection === null) {
							return;
						}

						this.keys[this.activeDirection] = evt.key;
						switch (this.activeDirection) {
							case Direction.North:
								this.activeDirection = Direction.West;
								break;
							case Direction.West:
								this.activeDirection = Direction.South;
								break;
							case Direction.South:
								this.activeDirection = Direction.East;
								break;
							case Direction.East:
								this.activeDirection = null;
								void this.saveKeys(this.keys);
								break;
						}
						keyboardViewContainer.empty();
						keyboardViewContainer.appendChild(this.renderKeyboardView(this.keys, this.activeDirection));
					}).bind(this);
					this.keySettingsListener = listener;
					this.plugin.registerDomEvent(document, "keypress", listener);
				});
			});

		new Setting(this.containerEl)
			.setName("Maximum pan speed")
			.setDesc("Canvas units to pan by")
			.addExtraButton((button) => {
				button.setIcon("rotate-ccw");
				button.setTooltip("Restore default");
				button.onClick(async () => {
					this.plugin.settings.maxSpeed = DEFAULT_SETTINGS.maxSpeed;
					await this.plugin.saveData(this.plugin.settings);
					this.display();
				});
			})
			.addSlider((slider) => {
				const displayValue = createSpan({ text: this.plugin.settings.maxSpeed.toString() });
				slider.sliderEl.parentElement?.prepend(displayValue);
				slider.setLimits(50, 500, 10);
				slider.setValue(this.plugin.settings.maxSpeed);
				slider.onChange((value) => {
					displayValue.setText(value.toString());
					this.plugin.settings.maxSpeed = value;
					void this.plugin.saveData(this.plugin.settings);
				});
			});
	}

	public async saveKeys(keys: Partial<CanvasKeyboardPanSettings["keys"]>): Promise<void> {
		if (!keys[Direction.North] || !keys[Direction.West] || !keys[Direction.South] || !keys[Direction.East]) {
			return;
		}
		this.plugin.settings = {
			...this.plugin.settings,
			keys: { ...(keys as Required<CanvasKeyboardPanSettings["keys"]>) },
		};
		await this.plugin.saveData(this.plugin.settings);
		if (this.keySettingsListener) {
			document.removeEventListener("keypress", this.keySettingsListener);
			this.keySettingsListener = null;
		}
		this.display();
	}

	public renderKeyboardView(
		keys: Partial<CanvasKeyboardPanSettings["keys"]>,
		activeKey: Direction | null,
	): HTMLElement {
		const container = createDiv({ cls: "pan-kb-mapping-container" });

		// Create icons
		const icons: Record<Direction, HTMLDivElement> = {
			[Direction.North]: container.createDiv({ cls: ["pan-kb", "pan-kb-north"] }),
			[Direction.West]: container.createDiv({ cls: ["pan-kb", "pan-kb-west"] }),
			[Direction.South]: container.createDiv({ cls: ["pan-kb", "pan-kb-south"] }),
			[Direction.East]: container.createDiv({ cls: ["pan-kb", "pan-kb-east"] }),
		};
		setIcon(icons.north, "lucide-arrow-up-square");
		setIcon(icons.west, "lucide-arrow-left-square");
		setIcon(icons.south, "lucide-arrow-down-square");
		setIcon(icons.east, "lucide-arrow-right-square");

		// Create labels
		const labels: Record<Direction, HTMLDivElement> = {
			[Direction.North]: container.createDiv({
				cls: ["pan-kb-label", "pan-kb-label-north"],
				text: keys[Direction.North] ?? "?",
			}),
			[Direction.West]: container.createDiv({
				cls: ["pan-kb-label", "pan-kb-label-west"],
				text: keys[Direction.West] ?? "?",
			}),
			[Direction.South]: container.createDiv({
				cls: ["pan-kb-label", "pan-kb-label-south"],
				text: keys[Direction.South] ?? "?",
			}),
			[Direction.East]: container.createDiv({
				cls: ["pan-kb-label", "pan-kb-label-east"],
				text: keys[Direction.East] ?? "?",
			}),
		};

		// Set active
		if (activeKey !== null) {
			icons[activeKey].classList.add("active");
			labels[activeKey].classList.add("active");
		}

		return container;
	}
}
