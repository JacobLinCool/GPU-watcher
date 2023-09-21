<script lang="ts">
	import { Connector } from "$lib/connector";
	import type { State } from "$lib/state";
	import { onMount } from "svelte";

	const state: State = {
		gpus: [],
		processes: [],
	};

	const connector = new Connector();
	connector.on("gpu_data", (details) => {
		for (const d of details) {
			const uuid = d.data[0];
			const gpu = state.gpus.find((gpu) => gpu.uuid === uuid);
			if (gpu) {
				gpu.name = d.data[1];
				gpu.gpu_utilization = parseFloat(d.data[2]);
				gpu.memory_utilization = parseFloat(d.data[3]);
				gpu.total_memory = parseFloat(d.data[4]);
				gpu.free_memory = parseFloat(d.data[5]);
			} else {
				state.gpus.push({
					uuid: d.data[0],
					name: d.data[1],
					gpu_utilization: parseFloat(d.data[2]),
					memory_utilization: parseFloat(d.data[3]),
					total_memory: parseFloat(d.data[4]),
					free_memory: parseFloat(d.data[5]),
				});
			}
		}
		state.gpus = state.gpus;
	});
	connector.on("compute_apps_data", (details) => {
		for (const d of details) {
			const pid = d.data[1];
			const process = state.processes.find((process) => process.pid === pid);
			if (process) {
				process.gpu_uuid = d.data[0];
				process.name = d.data[2];
				process.used_memory = d.data[3];
				process.user = d.data[4];
				process.time = d.data[5];
				process.command = d.data[6];
			} else {
				state.processes.push({
					gpu_uuid: d.data[0],
					pid: d.data[1],
					name: d.data[2],
					used_memory: d.data[3],
					user: d.data[4],
					time: d.data[5],
					command: d.data[6],
				});
			}
		}
		state.processes = state.processes;
	});

	onMount(() => {
		const signal = new URLSearchParams(location.search).get("signal");
		if (signal) {
			connector.add(signal);
		}
	});
</script>

<div class="flex h-full w-full items-center justify-center">
	<div class="space-y-4 rounded bg-gray-100 p-4 shadow">
		<!-- GPU Information -->
		<div class="bordered card">
			<div class="card-title">GPUs</div>
			<div class="card-body">
				{#each state.gpus as gpu (gpu.uuid)}
					<div class="mb-2 rounded bg-white p-2 shadow">
						<h3 class="text-lg font-semibold">{gpu.name} ({gpu.uuid})</h3>
						<div class="space-y-2">
							<div>GPU Utilization: {gpu.gpu_utilization}%</div>
							<div>Memory Utilization: {gpu.memory_utilization}%</div>
							<div>Total Memory: {gpu.total_memory} MiB</div>
							<div>Free Memory: {gpu.free_memory} MiB</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Processes Information -->
		<div class="bordered card">
			<div class="card-title">Processes</div>
			<div class="card-body">
				{#each state.processes as process (process.pid)}
					<div class="mb-2 rounded bg-white p-2 shadow">
						<h3 class="text-lg font-semibold">{process.name} (PID {process.pid})</h3>
						<div class="space-y-2">
							<div>GPU UUID: {process.gpu_uuid}</div>
							<div>Used Memory: {process.used_memory} MiB</div>
							<div>User: {process.user}</div>
							<div>Time: {process.time}</div>
							<div>Command: {process.command}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
