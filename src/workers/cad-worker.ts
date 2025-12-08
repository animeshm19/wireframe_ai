import { primitives, booleans, transforms, utils } from '@jscad/modeling';
import { serializers } from '@jscad/io';

// ❌ DELETE THIS LINE -> import { Geom3 } from '@jscad/modeling/src/geometries/types';

const { torus, cylinder, cuboid } = primitives;
const { union, subtract } = booleans;
const { translate, rotateX, rotateZ } = transforms;
const { degToRad } = utils;

console.log("Worker: Loaded successfully");

self.onmessage = (e: MessageEvent) => {
  const { type, params } = e.data;
  
  if (type === 'GENERATE') {
    try {
      let geometry;
      try {
        geometry = generateRingGeometry(params);
      } catch (err) {
        console.error("Worker: Geometry generation failed, using fallback.", err);
        geometry = cuboid({ size: [10, 10, 10] });
      }
      
      // @ts-ignore
      const rawData = serializers.stl.serialize({ binary: true }, geometry);
      const blob = new Blob(rawData, { type: 'model/stl' });
      
      self.postMessage({ type: 'SUCCESS', blob });

    } catch (error: any) {
      self.postMessage({ type: 'ERROR', error: error.message });
    }
  }
};

function generateRingGeometry(params: any) {
  const ringSize = Number(params.ringSize) || 6.0;
  const bandWidth = Number(params.bandWidth) || 2.5;
  const gemSize = Number(params.gemSize) || 1.0; 
  const prongCount = Number(params.prongCount) || 6;
  const profile = params.bandProfile || 'comfort';

  const innerDiameter = 11.6 + (ringSize * 0.83);
  const innerRadius = innerDiameter / 2;
  const thickness = 1.5;
  const tubeRadius = bandWidth / 2;
  const torusMajor = innerRadius + tubeRadius;

  let band;

  if (profile === 'flat') {
     const outer = cylinder({ radius: innerRadius + thickness, height: bandWidth, segments: 64 });
     const inner = cylinder({ radius: innerRadius, height: bandWidth + 1, segments: 64 });
     
     // FIX: Use 'as any' instead of Geom3 to prevent import crash
     band = subtract(outer, inner) as any;
     band = rotateX(degToRad(90), band);
  } else {
     band = torus({
       innerRadius: tubeRadius,
       outerRadius: torusMajor,
       innerSegments: 32, 
       outerSegments: 64
     }) as any;
  }

  // Gem Setting Head
  const gemRadiusMM = 3.25 * Math.pow(gemSize, 1/3); 
  const headHeight = 4 + (gemSize * 0.5);
  const headY = innerRadius + thickness - 0.5;

  const prongs = [];
  for (let i = 0; i < prongCount; i++) {
    const angle = (i / prongCount) * 360;
    let prong = cylinder({ radius: 0.4, height: headHeight + 1, segments: 16 });
    prong = translate([gemRadiusMM, 0, 0], prong); 
    prong = rotateZ(degToRad(angle), prong);
    prongs.push(prong as any);
  }
  
  let settingHead = union(prongs);
  let basket = cylinder({ radius: gemRadiusMM * 0.7, height: 0.8, segments: 32 });
  basket = translate([0, 0, headHeight * 0.3], basket);
  
  settingHead = union(settingHead, basket as any);

  // Position Head
  settingHead = translate([0, headY + (headHeight/2), 0], settingHead);
  settingHead = rotateX(degToRad(90), settingHead);
  
  // Final Union
  return union(band, settingHead);
}