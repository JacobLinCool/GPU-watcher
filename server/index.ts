import { exec } from "child_process";
import { createServer, ServerResponse } from "http";

class Server {
	private port: number;
	private clients: ServerResponse[] = [];

	constructor(port: number) {
		this.port = port;
	}

	public start(): void {
		const server = createServer((req, res) => {
			if (req.url === "/stream") {
				// @ts-expect-error
				this.add_client(res);
			} else {
				res.writeHead(404);
				res.end();
			}
		});

		server.listen(this.port, () => {
			console.log(`Server is running on http://localhost:${this.port}`);
		});

		this.start_command_processes();
	}

	private add_client(res: ServerResponse): void {
		res.writeHead(200, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
			"Content-Type": "text/event-stream",
			Connection: "keep-alive",
			"Cache-Control": "no-cache",
		});

		this.clients.push(res);

		res.on("close", () => {
			this.clients = this.clients.filter((client) => client !== res);
		});
	}

	private start_command_processes(): void {
		const compute_apps_command =
			"nvidia-smi --query-compute-apps=timestamp,gpu_uuid,pid,name,used_memory --format=csv,noheader -l 1";
		const gpu_query_command =
			"nvidia-smi --query-gpu=timestamp,uuid,name,utilization.gpu,utilization.memory,memory.total,memory.free --format=csv,noheader -l 1";

		this.start_command(compute_apps_command, "compute_apps_data", enhance_compute_apps_data);
		this.start_command(gpu_query_command, "gpu_data");
	}

	private start_command(
		command: string,
		event_name: string,
		enhancer?: (data: string) => Promise<string>,
	): void {
		const process = exec(command, { shell: "/bin/bash" });

		process.stdout?.on("data", async (data) => {
			let payload = data.toString().trim();

			if (enhancer) {
				payload = await enhancer(payload);
			}

			const json_data = this.csv_to_json(payload);
			this.stream_data(event_name, JSON.stringify(json_data));
		});

		process.on("close", (code) => {
			if (code !== 0) {
				console.log(`process exited with code ${code}`);
			}
			this.clients.forEach((client) => client.end());
		});
	}

	private csv_to_json(csv: string): { timestamp: string; data: string[] }[] {
		const lines = csv.split("\n");
		return lines.map((line) => {
			const [timestamp, ...rest] = line.split(",");
			return { timestamp, data: rest };
		});
	}

	private stream_data(event_name: string, data: string): void {
		this.clients.forEach((client) => {
			client.write(`event: ${event_name}\ndata: ${data}\n\n`);
		});
	}
}

async function enhance_compute_apps_data(data: string): Promise<string> {
	const lines = data.split("\n");
	const enhanced = await Promise.all(
		lines.map(async (line) => {
			const [timestamp, pid, ...rest] = line.split(",");
			const command = `ps -o "%u,%t,%a" --no-headers -p ${pid}`;
			const output = await run_command(command);
			return `${timestamp},${pid},${rest.join(",")},${output
				.split(",")
				.map((s) => s.trim())
				.join(",")}`;
		}),
	);

	return enhanced.join("\n");
}

function run_command(command: string): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(command, { shell: "/bin/bash" }, (error, stdout, stderr) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout.toString().trim());
		});
	});
}

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

const port = parseInt(process.env.PORT ?? "56789");
const server = new Server(port);
server.start();
