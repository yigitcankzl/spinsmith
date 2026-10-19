import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from '@iwsdk/core';

/** Physical envelope: 8 cm wide, 8 cm tall, 2.4 cm deep. Front is local +Z. */
export const FORGE_WHEEL_RADIUS = 0.04;

const iron = new MeshStandardMaterial({ color: 0x17191c, metalness: 0.92, roughness: 0.29 });
const steel = new MeshStandardMaterial({ color: 0x7f858b, metalness: 0.9, roughness: 0.22 });
const brass = new MeshStandardMaterial({ color: 0xb66b22, metalness: 0.86, roughness: 0.24 });
const ember = new MeshStandardMaterial({ color: 0xff7a18, emissive: 0xff4a08, emissiveIntensity: 1.6, metalness: 0.45, roughness: 0.28 });

const wheel = new Group();
wheel.name = 'ForgeWheel';

const back = new Mesh(new CylinderGeometry(0.029, 0.033, 0.012, 32).rotateX(Math.PI / 2), iron);
back.name = 'ForgeWheelHousing';
back.position.z = -0.006;

const rim = new Mesh(new TorusGeometry(0.031, 0.005, 8, 48), steel);
rim.name = 'ForgeWheelRim';

const hub = new Mesh(new CylinderGeometry(0.01, 0.013, 0.018, 24).rotateX(Math.PI / 2), brass);
hub.name = 'ForgeWheelHub';

for (let i = 0; i < 6; i++) {
  const spoke = new Mesh(new BoxGeometry(0.027, 0.004, 0.006), i % 2 ? brass : steel);
  spoke.name = `ForgeWheelSpoke${i + 1}`;
  spoke.position.set(Math.cos((i * Math.PI) / 3) * 0.014, Math.sin((i * Math.PI) / 3) * 0.014, 0);
  spoke.rotation.z = (i * Math.PI) / 3;
  wheel.add(spoke);
}

for (let i = 0; i < 12; i++) {
  const tooth = new Mesh(new BoxGeometry(0.007, 0.0045, 0.008), iron);
  tooth.name = `ForgeWheelTooth${i + 1}`;
  const angle = (i * Math.PI * 2) / 12;
  tooth.position.set(Math.cos(angle) * 0.038, Math.sin(angle) * 0.038, 0);
  tooth.rotation.z = angle;
  wheel.add(tooth);
}

const handle = new Group();
handle.name = 'ForgeWheelHandle';
handle.position.set(0, FORGE_WHEEL_RADIUS, 0.012);
const grip = new Mesh(new CylinderGeometry(0.005, 0.006, 0.018, 16).rotateX(Math.PI / 2), brass);
grip.name = 'ForgeWheelGrip';
const gripCap = new Mesh(new TorusGeometry(0.0062, 0.0014, 6, 20), ember);
gripCap.name = 'ForgeWheelGripGlow';
gripCap.position.z = 0.01;
handle.add(grip, gripCap);

wheel.add(back, rim, hub, handle);
wheel.userData.iwsdkPreviewBounds = 'include';

export default wheel;
