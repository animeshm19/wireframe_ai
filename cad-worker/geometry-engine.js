const { primitives, booleans, transforms, utils } = require('@jscad/modeling');
// FIX: Import from the main package, not a subpath
const { serializers } = require('@jscad/io');

const { torus, cylinder } = primitives;
const { union } = booleans;
const { translate, rotateX } = transforms;
const { degToRad } = utils;

function getRingDiameter(usSize) {
  return 11.6 + (usSize * 0.83);
}

function generateRingSTL(params) {
  const ringSize = Number(params.ringSize) || 6.0;
  const bandWidth = Number(params.bandWidth) || 2.5;
  const gemSize = Number(params.gemSize) || 1.0; 
  
  const innerDiameter = getRingDiameter(ringSize);
  const innerRadius = innerDiameter / 2;
  const tubeRadius = bandWidth / 2; 
  const majorRadius = innerRadius + tubeRadius; 

  let band = torus({
    innerRadius: tubeRadius,
    outerRadius: majorRadius,
    segments: 64,
    outerSegments: 64
  });

  const gemRadius = (3 + (gemSize * 0.5)) / 2; 
  const settingHeight = 4;

  let setting = cylinder({
    radius: gemRadius + 0.8,
    height: settingHeight,
    segments: 32
  });
  
  setting = translate([0, majorRadius + tubeRadius - 1, 0], setting);
  setting = rotateX(degToRad(90), setting);

  let finalShape = union(band, setting);
  
  // FIX: Use the serializer from the destructured object
  const rawData = serializers.stl.serialize({ binary: true }, finalShape);
  const bufferParts = rawData.map(chunk => Buffer.from(chunk));
  return Buffer.concat(bufferParts);
}

module.exports = { generateRingSTL };