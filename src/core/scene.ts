import * as BABYLON from "babylonjs";
import { GridMaterial } from "babylonjs-materials";


export const app = document.getElementById("app")!;
export const canvas = document.createElement("canvas");
canvas.id = "renderCanvas";
Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
app.appendChild(canvas);


export const engine = new BABYLON.Engine(canvas, true);
export const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.05, 0.06, 0.10, 1);


export const camera = new BABYLON.ArcRotateCamera(
"cam", Math.PI/3, Math.PI/3, 22, new BABYLON.Vector3(0,1,0), scene
);
camera.lowerRadiusLimit = 6; camera.upperRadiusLimit = 200; camera.attachControl(canvas, true);
new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.2,1,0.3), scene);


// helpers (ground + grid)
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width:40, height:28 }, scene);
ground.isPickable = false;
const gMat = new BABYLON.StandardMaterial("gmat", scene);
gMat.diffuseColor = new BABYLON.Color3(0.10,0.12,0.20); gMat.specularColor = BABYLON.Color3.Black();
ground.material = gMat;


const grid = BABYLON.MeshBuilder.CreateGround("grid", { width:40, height:28, subdivisions:40 }, scene);
grid.isPickable = false;
const gridMat = new GridMaterial("gridMat", scene); gridMat.majorUnitFrequency=2; gridMat.minorUnitVisibility=0.5; gridMat.gridRatio=1; gridMat.opacity=0.22;
grid.material = gridMat; grid.position.y = 0.002;


engine.setHardwareScalingLevel(1/Math.max(1, window.devicePixelRatio||1));
window.addEventListener("resize", () => engine.resize());


export function startRenderLoop(update?: () => void){
engine.runRenderLoop(() => { scene.render(); update?.(); });
}