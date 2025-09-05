import * as BABYLON from "babylonjs";
import { scene } from "./core/scene";


let envRoot: BABYLON.TransformNode | null = null;
let envContainer: BABYLON.AssetContainer | null = null;
export let envName: string | null = null;
export let envDataB64: string | null = null;


export function disposeEnvironment(){
try { if (envContainer) envContainer.removeAllFromScene(); if (envRoot) envRoot.dispose(); } catch{}
envContainer = null; envRoot=null; envName=null; envDataB64=null;
}


export function arrayBufferToBase64(buffer: ArrayBuffer){
let binary=""; const bytes=new Uint8Array(buffer); const chunk=0x8000;
for(let i=0;i<bytes.length;i+=chunk){ binary += String.fromCharCode.apply(null, bytes.subarray(i,i+chunk) as unknown as number[]); }
return btoa(binary);
}
export function base64ToArrayBuffer(b64: string){
const s=atob(b64); const len=s.length; const out=new Uint8Array(len); for(let i=0;i<len;i++) out[i]=s.charCodeAt(i); return out.buffer;
}


export async function setEnvironmentFromGLBArrayBuffer(buf: ArrayBuffer, name = "environment.glb"){
disposeEnvironment();
const blob = new Blob([buf], { type:"model/gltf-binary" });
const url = URL.createObjectURL(blob);
try { envContainer = await BABYLON.SceneLoader.LoadAssetContainerAsync(url, undefined, scene); }
finally { URL.revokeObjectURL(url); }
envRoot = new BABYLON.TransformNode("envRoot", scene);
for(const r of envContainer.rootNodes as BABYLON.Node[]) (r as BABYLON.TransformNode).setParent(envRoot);
envContainer.addAllToScene();
envRoot.position.set(0,0,0); envRoot.rotationQuaternion=null; envRoot.rotation.set(0,0,0); envRoot.scaling.setAll(1);
envName = name; envDataB64 = arrayBufferToBase64(buf);
}


export function applyEnvTransform(t:{position:{x:number;y:number;z:number}; rotationYDeg:number; scale:number}){
if(!envRoot) return; envRoot.position.set(t.position.x,t.position.y,t.position.z);
envRoot.rotation.set(0, BABYLON.Angle.FromDegrees(t.rotationYDeg).radians(), 0); envRoot.scaling.setAll(t.scale);
}


export function getEnvRoot(){ return envRoot; }