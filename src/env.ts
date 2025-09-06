// src/env.ts — Multi-Environment Manager
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import { scene } from "./core/scene";

export type EnvEntry = {
  id: string;
  name: string;
  container: BABYLON.AssetContainer;
  root: BABYLON.TransformNode;
  dataB64: string;
};

const envs = new Map<string, EnvEntry>();
let activeEnvId: string | null = null;

const genEnvId = () => "env-" + Math.random().toString(36).slice(2, 8);

export function arrayBufferToBase64(buffer: ArrayBuffer){
  let binary=""; const bytes=new Uint8Array(buffer); const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){ binary += String.fromCharCode.apply(null, bytes.subarray(i,i+chunk) as unknown as number[]); }
  return btoa(binary);
}
export function base64ToArrayBuffer(b64: string){
  const s=atob(b64); const len=s.length; const out=new Uint8Array(len); for(let i=0;i<len;i++) out[i]=s.charCodeAt(i); return out.buffer;
}

/** اضافه‌کردن یک محیط جدید از GLB ArrayBuffer؛ id محیط را برمی‌گرداند و همان را active می‌کند */
export async function addEnvironmentFromGLBArrayBuffer(buf: ArrayBuffer, name = "environment.glb"){
  const blob = new Blob([buf], { type: "model/gltf-binary" });
  const url = URL.createObjectURL(blob);
  let container: BABYLON.AssetContainer;
  try {
    container = await BABYLON.SceneLoader.LoadAssetContainerAsync(url, undefined, scene, undefined, ".glb");
  } finally { URL.revokeObjectURL(url); }

  // ابتدا به صحنه اضافه کن تا سلسله‌مراتب container معتبر بماند
  container.addAllToScene();

  // ریشهٔ ترنسفورم جدا برای این محیط
  const root = new BABYLON.TransformNode("envRoot", scene);
  for (const r of container.rootNodes as BABYLON.Node[]) (r as BABYLON.TransformNode).setParent(root);

  // ریست ترنسفورم
  root.position.set(0,0,0); root.rotationQuaternion=null; root.rotation.set(0,0,0); root.scaling.setAll(1);

  // نمایش بالای grid/ground
  root.renderingGroupId = 1;
  root.getChildMeshes().forEach(m => {
    m.renderingGroupId = 1;
    (m as any).metadata = { ...(m as any).metadata, envId: undefined }; // پاکسازی قبلی
  });

  const id = genEnvId();
  // روی کل زیرمجموعه، envId بزن تا بتونیم با پیک انتخابش کنیم
  root.getChildMeshes().forEach(m => { (m as any).metadata = { ...(m as any).metadata, envId: id }; });

  const entry: EnvEntry = { id, name, container, root, dataB64: arrayBufferToBase64(buf) };
  envs.set(id, entry);
  activeEnvId = id;
  return id;
}

/** حذف یک محیط */
export function removeEnvironment(id: string){
  const e = envs.get(id); if(!e) return;
  try { e.container.removeAllFromScene(); e.root.dispose(); } catch {}
  envs.delete(id);
  if (activeEnvId === id) {
    activeEnvId = envs.size ? Array.from(envs.keys())[0] : null;
  }
}

/** انتخاب محیط فعال (برای ابزارها وقتی سنسور انتخاب نشده) */
export function setActiveEnvironment(id: string | null){
  if (id && envs.has(id)) activeEnvId = id;
  else activeEnvId = envs.size ? Array.from(envs.keys())[0] : null;
}

export function getActiveEnvironmentId(){ return activeEnvId; }
export function getActiveEnvRoot(){ return activeEnvId ? envs.get(activeEnvId)!.root : null; }
export function listEnvironments(){ return Array.from(envs.values()).map(e => ({ id:e.id, name:e.name })); }

/** دسترسی خام برای ذخیره/لود پروژه */
export function getAllEnvEntries(){ return Array.from(envs.values()); }

/** ساخت محیط از دادهٔ پروژه (بدون تغییر active مگر خواسته شود) */
export async function addEnvironmentFromProjectB64(dataB64: string, name: string, transform: { position:{x:number;y:number;z:number}; rotationYDeg:number; scale:number }, makeActive = false){
  const buf = base64ToArrayBuffer(dataB64);
  const id = await addEnvironmentFromGLBArrayBuffer(buf, name);
  // اعمال ترنسفورم ذخیره شده
  const e = envs.get(id)!;
  e.root.position.set(transform.position.x, transform.position.y, transform.position.z);
  e.root.rotationQuaternion = null;
  e.root.rotation.set(0, BABYLON.Angle.FromDegrees(transform.rotationYDeg).radians(), 0);
  e.root.scaling.setAll(transform.scale);
  if (makeActive) activeEnvId = id;
  return id;
}

/** برداشتن همه محیط‌ها (برای لود پروژه) */
export function clearAllEnvironments(){
  for (const id of Array.from(envs.keys())) removeEnvironment(id);
}

/** پیدا کردن envId از روی مش پیک‌شده */
export function resolveEnvFromMesh(mesh: BABYLON.Node | null): string | null {
  let cur: BABYLON.Node | null = mesh;
  while (cur) {
    const md = (cur as any).metadata;
    if (md?.envId) return md.envId as string;
    cur = cur.parent;
  }
  return null;
}
