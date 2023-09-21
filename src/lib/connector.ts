type GPUStateListener = (
	detail: {
		timestamp: string;
		data: [
			uuid: string,
			name: string,
			gpu_utilization: string,
			memory_utilization: string,
			total_memory: string,
			free_memory: string,
		];
	}[],
) => void;
type ProcessStateListener = (
	detail: {
		timestamp: string;
		data: [
			gpu_uuid: string,
			pid: string,
			name: string,
			used_memory: string,
			user: string,
			time: string,
			command: string,
		];
	}[],
) => void;
type Listener = GPUStateListener | ProcessStateListener;

export class Connector {
	private readonly sources: Map<string, EventSource> = new Map();
	private readonly listeners: Map<string, Listener[]> = new Map();

	add(...urls: string[]): void {
		urls.forEach((url) => {
			if (!this.sources.has(url)) {
				const source = new EventSource(url);
				this.sources.set(url, source);

				source.addEventListener("gpu_data", (event) =>
					this.emit("gpu_data", JSON.parse(event.data)),
				);
				source.addEventListener("compute_apps_data", (event) =>
					this.emit("compute_apps_data", JSON.parse(event.data)),
				);
				source.onerror = (error) => this.emit("error", error);
			}
		});
	}

	remove(...urls: string[]): void {
		urls.forEach((url) => {
			const source = this.sources.get(url);
			if (source) {
				source.close();
				this.sources.delete(url);
			}
		});
	}

	on(event: "gpu_data", listener: GPUStateListener): void;
	on(event: "compute_apps_data", listener: ProcessStateListener): void;
	on(event: string, listener: Listener): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}

		const listeners = this.listeners.get(event);
		listeners?.push(listener);
	}

	off(event: "gpu_data", listener: GPUStateListener): void;
	off(event: "compute_apps_data", listener: ProcessStateListener): void;
	off(event: string, listener: (...args: any[]) => void): void {
		const listeners = this.listeners.get(event);
		if (listeners) {
			const index = listeners.indexOf(listener);
			if (index >= 0) {
				listeners.splice(index, 1);

				// Detach listener from all current sources
				this.sources.forEach((source) => {
					source.removeEventListener(event, listener);
				});
			}
		}
	}

	private emit(event: string, ...args: unknown[]): void {
		console.log(event, ...args);
		const listeners = this.listeners.get(event);
		listeners?.forEach((listener) => {
			// @ts-expect-error
			listener(...args);
		});
	}
}
