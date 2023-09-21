export interface State {
	gpus: GPUState[];
	processes: ProcessState[];
}

// --query-gpu=timestamp,uuid,name,utilization.gpu,utilization.memory,memory.total,memory.free
export interface GPUState {
	uuid: string;
	name: string;
	gpu_utilization: number;
	memory_utilization: number;
	total_memory: number;
	free_memory: number;
}

// --query-compute-apps=timestamp,gpu_uuid,pid,name,used_memory
//  ps -o "%u,%t,%a"
export interface ProcessState {
	gpu_uuid: string;
	pid: string;
	name: string;
	used_memory: string;
	user: string;
	time: string;
	command: string;
}
