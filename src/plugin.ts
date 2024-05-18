import { ItemView, Plugin } from "obsidian";

import type { Canvas } from "./types";
import { CanvasKeyboardPanSettingsTab } from "./settings";
import { xor } from "./util";

export enum Direction {
	North = "north",
	West = "west",
	South = "south",
	East = "east",
}

export interface CanvasKeyboardPanSettings {
	keys: Record<Direction, string>;
	maxSpeed: number;
}

export const DEFAULT_SETTINGS: CanvasKeyboardPanSettings = {
	keys: {
		[Direction.North]: "w",
		[Direction.West]: "a",
		[Direction.South]: "s",
		[Direction.East]: "d",
	},
	maxSpeed: 250,
};

export class CanvasKeyboardPan extends Plugin {
	// Settings
	settings: CanvasKeyboardPanSettings = {
		keys: { ...DEFAULT_SETTINGS.keys },
		maxSpeed: DEFAULT_SETTINGS.maxSpeed,
	};

	// State
	PanStart: Date | null = null;
	NorthKeyDown = false;
	EastKeyDown = false;
	SouthKeyDown = false;
	WestKeyDown = false;
	active = false;
	panInterval: number | undefined = undefined;
	async onload() {
		const data = (await this.loadData()) as Partial<CanvasKeyboardPanSettings>;
		if (data) {
			this.settings = { ...DEFAULT_SETTINGS, ...data };
		}
		this.addSettingTab(new CanvasKeyboardPanSettingsTab(this.app, this));

		this.registerDomEvent(this.app.workspace.containerEl, "keydown", (evt) => {
			if (this.app.workspace.activeEditor) {
				return;
			}
			if (Object.values(this.settings.keys).includes(evt.key)) {
				switch (evt.key) {
					case this.settings.keys[Direction.North]:
						this.NorthKeyDown = true;
						this.SouthKeyDown = false;
						break;
					case this.settings.keys[Direction.West]:
						this.WestKeyDown = true;
						this.EastKeyDown = false;
						break;
					case this.settings.keys[Direction.South]:
						this.SouthKeyDown = true;
						this.NorthKeyDown = false;
						break;
					case this.settings.keys[Direction.East]:
						this.EastKeyDown = true;
						this.WestKeyDown = false;
						break;
				}
				this.startPan();
			}
		});

		this.registerDomEvent(this.app.workspace.containerEl, "keyup", (evt) => {
			if (Object.values(this.settings.keys).includes(evt.key)) {
				switch (evt.key) {
					case this.settings.keys[Direction.North]:
						this.NorthKeyDown = false;
						break;
					case this.settings.keys[Direction.West]:
						this.WestKeyDown = false;
						break;
					case this.settings.keys[Direction.South]:
						this.SouthKeyDown = false;
						break;
					case this.settings.keys[Direction.East]:
						this.EastKeyDown = false;
						break;
				}
				this.stopPan();
			}
		});

		this.registerEvent(this.app.workspace.on("active-leaf-change", () => {}));

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				// Reset state just in case
				this.stopPan(true);

				if (this.getActiveCanvas()) {
					this.active = true;
				} else {
					this.active = false;
				}
			}),
		);

		// Events that should also stop any active panning
		const events = ["active-leaf-change", "file-open", "file-menu", "files-menu"] as const;
		for (const event of events) {
			this.registerEvent(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Some bad types here, need to use any :(
				this.app.workspace.on(event as any, () => {
					this.stopPan(true);
				}),
			);
		}
	}

	public startPan(): void {
		if (this.panInterval === undefined) {
			this.panInterval = this.registerInterval(window.setInterval(() => this.handlePanKeys(), 10));
		}
	}

	public stopPan(force = false): void {
		if (!this.panning || force) {
			window.clearInterval(this.panInterval);
			this.panInterval = undefined;
		}
		if (force) {
			this.NorthKeyDown = false;
			this.WestKeyDown = false;
			this.SouthKeyDown = false;
			this.EastKeyDown = false;
		}
	}

	public get panning(): boolean {
		return xor(this.EastKeyDown, this.WestKeyDown) || xor(this.NorthKeyDown, this.SouthKeyDown);
	}

	public getActiveCanvas(): Canvas | undefined {
		const canvas = this.app.workspace.getActiveViewOfType(ItemView)?.canvas;
		if (!canvas) {
			// if at any point this is false, make sure we stop panning.
			this.stopPan();
		}
		return canvas;
	}

	public handlePanKeys(): void {
		let ms = 0;
		if (this.PanStart === null) {
			this.PanStart = new Date();
		} else {
			ms = new Date().getTime() - this.PanStart.getTime();
		}
		let dx = 0;
		let dy = 0;
		// NORTH
		if (this.NorthKeyDown && !this.SouthKeyDown) {
			dy -= this.getPanDistance(ms, this.settings.maxSpeed);
		}
		// SOUTH
		else if (this.SouthKeyDown && !this.NorthKeyDown) {
			dy += this.getPanDistance(ms, this.settings.maxSpeed);
		}
		// WEST
		if (this.WestKeyDown && !this.EastKeyDown) {
			dx -= this.getPanDistance(ms, this.settings.maxSpeed);
		}
		// EAST
		else if (this.EastKeyDown && !this.WestKeyDown) {
			dx += this.getPanDistance(ms, this.settings.maxSpeed);
		}

		this.pan(dx, dy);
	}

	public pan(dx: number, dy: number): void {
		const canvas = this.getActiveCanvas();
		if (!canvas) {
			return;
		}
		// Zoom seems to be between -4 and 1, so add 5 to get it always >= 1
		const zoom = (canvas.zoom ?? -4) + 5;
		dx = dx / zoom;
		dy = dy / zoom;

		canvas.tx += dx;
		canvas.ty += dy;

		// Before updating the canvas at all, make sure these are never NaN, just in case
		if (isNaN(canvas.tx)) {
			canvas.tx = 0;
		}
		if (isNaN(canvas.ty)) {
			canvas.ty = 0;
		}
		canvas.markViewportChanged();
	}

	public getPanDistance(msPanning: number = 0, max: number = 250) {
		if (msPanning < 1) {
			return 0;
		}
		return Math.min((Math.log10(msPanning) * max) / 3, 250);
	}

	public resetCanvas(): void {
		this.getActiveCanvas()?.panTo(0, 0);
	}
}
