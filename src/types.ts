// eslint-disable-next-line unused-imports/no-unused-imports
import type { View } from "obsidian";

export interface Canvas {
	tx: number;
	ty: number;
	zoom: number;
	markViewportChanged: () => void;
	panTo: (x: number, y: number) => void;
}

declare module "obsidian" {
	interface View {
		canvas?: Canvas;
	}
}
