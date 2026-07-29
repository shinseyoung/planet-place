// generate-seed.js
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Jimp = require('jimp');

async function generateSeed() {
  console.log('🌍 earth_map.png (600x300) 이미지를 분석 중입니다...');
  
  const image = await Jimp.read('earth_map.png');
  const data = [];

  for (let y = 0; y < image.bitmap.height; y++) {
    for (let x = 0; x < image.bitmap.width; x++) {
      const hexColor = image.getPixelColor(x, y);
      const rgba = Jimp.intToRGBA(hexColor);
      
      // 파란색(B)이 유독 높으면 바다로 간주하고 과감히 버립니다.
      const isOcean = rgba.b > rgba.r + 20 && rgba.b > rgba.g + 20;

      if (!isOcean && rgba.a > 0) {
        const colorCode = '#' + 
          rgba.r.toString(16).padStart(2, '0') + 
          rgba.g.toString(16).padStart(2, '0') + 
          rgba.b.toString(16).padStart(2, '0');

        data.push({ x, y, color: colorCode });
      }
    }
  }

  fs.writeFileSync('earth_seed.json', JSON.stringify(data, null, 2));
  console.log(`✅ 성공! 총 ${data.length}개의 고해상도 대륙 데이터가 생성되었습니다!`);
}

generateSeed();