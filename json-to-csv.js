// json-to-csv.js
import fs from 'fs';

function convert() {
  // 1. 아까 만든 JSON 파일 읽어오기
  const jsonData = JSON.parse(fs.readFileSync('one.json', 'utf-8'));

  // 2. CSV 헤더(컬럼명) 작성 (Supabase DB 컬럼명과 일치해야 함)
  let csvContent = 'x,y,color\n';

  // 3. 데이터를 콤마(,)와 줄바꿈으로 연결
  jsonData.forEach(row => {
    csvContent += `${row.x},${row.y},${row.color}\n`;
  });

  // 4. CSV 파일로 저장
  fs.writeFileSync('white_seed.csv', csvContent);
  console.log(`✅ 1초 컷! 총 ${jsonData.length}개의 데이터가 csv로 변환되었습니다!`);
}

convert();