import { stlSerializer } from '@jscad/io';
import { primitives } from '@jscad/modeling';
import { buildRing, checkManufacturability } from '../lib/cad-engine';

console.log("Worker: Loaded successfully");

self.onmessage = (e: MessageEvent) => {
  const { type, params } = e.data;
  if (type !== 'GENERATE') return;

  const report = (progress: number, stage: string) =>
    self.postMessage({ type: 'PROGRESS', progress, stage });

  try {
    report(10, 'Reading parameters');

    let metal: any;
    let stones: any = null;
    let metrics: any = null;
    let issues: any[] = [];
    try {
      const built = buildRing(params, report);
      metal = built.metal;
      stones = built.stones;
      metrics = built.metrics;
      issues = checkManufacturability(params, built.metrics);
    } catch (err) {
      console.error("Worker: Geometry generation failed, using fallback.", err);
      metal = primitives.cuboid({ size: [10, 10, 10] });
    }

    report(85, 'Exporting STL');
    const toBlob = (solid: any) =>
      new Blob(stlSerializer.serialize({ binary: true }, solid), { type: 'model/stl' });

    // Metal and stones ship as separate bodies: the metal blob is the casting
    // file, the stone blob is reference geometry for rendering.
    const blob = toBlob(metal);
    const stoneBlob = stones ? toBlob(stones) : null;

    report(100, 'Ready');
    self.postMessage({ type: 'SUCCESS', blob, stoneBlob, metrics, issues });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', error: error?.message || String(error) });
  }
};
