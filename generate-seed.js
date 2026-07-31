import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Jimp = require('jimp');

// 실행할 파일명과 저장할 JSON 파일명 설정
const INPUT_IMAGE = 'one.png'; // 추출할 이미지
const OUTPUT_JSON = 'one.json'; // 저장될 이름

async function generateSeed() {
  console.log(`${INPUT_IMAGE} 이미지를 분석 중입니다...`);
  
  const image = await Jimp.read(INPUT_IMAGE);
  const data = [];

  for (let y = 0; y < image.bitmap.height; y++) {
    for (let x = 0; x < image.bitmap.width; x++) {
      const hexColor = image.getPixelColor(x, y);
      const rgba = Jimp.intToRGBA(hexColor);
      
      // 지구의 바다(isOcean) 필터링 삭제. 
      // 투명도(a)가 0인 픽셀(배경)만 제외하고 모두 추출합니다.
      if (rgba.a > 0) {
        const colorCode = '#' + 
          rgba.r.toString(16).padStart(2, '0') + 
          rgba.g.toString(16).padStart(2, '0') + 
          rgba.b.toString(16).padStart(2, '0');

        data.push({ x, y, color: colorCode });
      }
    }
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(data, null, 2));
  console.log(`✅ 성공! 총 ${data.length}개의 행성 데이터가 생성되었습니다!`);
}

generateSeed();