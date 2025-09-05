// Shared types & flags
export const GLB_WORLD_SCALE = 5; // magnifier for small GLB models (e.g., cm)
export const ENABLE_PULSE = true; // visual pulse on new readings


export type SensorType = "temperature" | "humidity" | "co2" | "light" | "solar";


export type SensorNode = {
id: string;
label: string;
type: SensorType;
deviceId: string;
topic?: string;
position: { x: number; y: number; z: number };
color?: string;
scale?: number;
};


export type Reading =
| { deviceId: string; kind: "temperature" | "humidity" | "co2"; roomId?: string; ts: number; value: number; unit: string }
| { deviceId: string; kind: "light"; roomId?: string; ts: number; on: boolean; powerW: number }
| { deviceId: string; kind: "solar"; ts: number; powerW: number; voltage: number; current: number };


export type ProjectFile = {
kind: "digital-twin-project";
version: 1;
connection: { url: string; topic: string; user?: string; pass?: string };
sensors: SensorNode[];
environment?: {
name: string;
dataB64: string; // GLB embedded as base64
transform: { position: {x:number;y:number;z:number}; rotationYDeg: number; scale: number };
};
};


export const palette: Record<SensorType, string> = {
temperature: "#ff5a5f",
humidity: "#00b894",
co2: "#3a86ff",
light: "#ffd6a5",
solar: "#ffd166",
};


export const genId = () => "s-" + Math.random().toString(36).slice(2, 8);