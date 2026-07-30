export const GLOBE_RADIUS = 12; 
export const MAP_WIDTH = 600;
export const MAP_HEIGHT = 300;
export const GRID_SCALE = 80;
export const VOXEL_SIZE = GLOBE_RADIUS / GRID_SCALE;

export const BASIC_PALETTE = [
  '#000000', '#262626', '#595959', '#A6A6A6', '#FFFFFF',
  '#2A1710', '#633820', '#9E5B32', '#D99B6A', '#F7C59F',
  '#7A001E', '#E60033', '#FF5A52', '#FF7B00', '#FFB700', '#FFE600',
  '#0B3C1B', '#1C8A43', '#39FF14', '#A3E000',
  '#001A4D', '#0044FF', '#3B9EFF', '#9CE3FF', '#004D47', '#00F0FF',
  '#2E004F', '#8B00FF', '#C275FF', '#E6007A', '#FF69B4', '#FFC0CB'
];

export const THEME_PACKS = [
  // --- 감성 테마 팩 ---
  { name: "Abyssal Ocean Trench", type: "theme", colors: ['#000B1E', '#001E3D', '#00F5D4', '#054A29', '#FF6F59', '#E8F1F2', '#FF88D1', '#B2F7EF'] },
  { name: "Y2K Matcha & Berry", type: "theme", colors: ['#FFB8C6', '#B5E2FA', '#C7F9CC', '#FFF1C5', '#E2C2FF', '#D8B4E2', '#FFD1B3', '#8C6D62'] },
  { name: "Martian Terraforma", type: "theme", colors: ['#8B0000', '#C1440E', '#D2691E', '#4A0E00', '#4D7C0F', '#0284C7', '#EAB308', '#E0F2FE'] },
  { name: "Cyberpunk City Lights", type: "theme", colors: ['#CCFF01', '#FF0055', '#00FFC8', '#3A0066', '#FFEE00', '#FF4466', '#00FF41', '#00E5FF'] },
  { name: "Vaporwave Sunset", type: "theme", colors: ['#8A2BE2', '#FF007F', '#2E004E', '#FF7518', '#FFD701', '#00FFFF', '#FFB6C1', '#4B0081'] },
  { name: "8-Bit Retro Arcade", type: "theme", colors: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F', '#00FF67', '#E60000', '#0033CC', '#808080'] },
  { name: "Deep Space Nebula", type: "theme", colors: ['#4B0082', '#0B0033', '#F0F8FF', '#FF1493', '#FF8C00', '#00CED1', '#05050D', '#C71585'] },
  { name: "Toxic Slime Glow", type: "theme", colors: ['#39FF15', '#CCFF00', '#A3E001', '#00FF66', '#2E4600', '#FF5500', '#9900FF', '#0A1F0A'] },
  { name: "Nordic Aurora Borealis", type: "theme", colors: ['#00FFA3', '#00B37E', '#00C8FF', '#E0F7FA', '#0F2027', '#2C3E50', '#0B132B', '#7B2CBF'] },
  { name: "Desert Oasis Gold", type: "theme", colors: ['#D4AF37', '#EDC9AF', '#C86432', '#00A896', '#5C4033', '#F4A261', '#028090', '#B22222'] },
  { name: "Enchanted Blossom Forest", type: "theme", colors: ['#FFB6C4', '#4A7C59', '#9B5DE5', '#3D262B', '#A8DADC', '#E63946', '#FFD166', '#1D3557'] },
  { name: "Volcanic Magma Core", type: "theme", colors: ['#FF0000', '#FF4500', '#FFA500', '#121212', '#3A3A3A', '#555555', '#E6FF00', '#2B1B17'] },
  // --- 국가 팩 ---
  { name: "South Korea", type: "country", colors: ['#CD2E3A', '#0047A0', '#111111', '#FDFDFD', '#007A33', '#E05A2B', '#FF8DA1', '#D4AF38'] },
  { name: "USA", type: "country", colors: ['#B22234', '#3C3B6E', '#F4F6F8', '#81D8D0', '#006A4E', '#8B4514', '#DAA520', '#F04A00'] },
  { name: "Japan", type: "country", colors: ['#BC002D', '#FFFAFA', '#FFC1CC', '#1D2A44', '#2D4739', '#A100FF', '#E60034', '#7BA05B'] },
  { name: "United Kingdom", type: "country", colors: ['#00247D', '#CC0000', '#F0F0F0', '#FFD702', '#E32636', '#1A3B2B', '#6B5B45', '#8B5A2B'] },
  { name: "France", type: "country", colors: ['#002395', '#ED2939', '#F8F9FA', '#E6E6FA', '#007FFF', '#F7E7CE', '#722F37', '#B0C4DE'] },
  { name: "Germany", type: "country", colors: ['#1A1A1C', '#DD0000', '#FFCC00', '#0B3B17', '#1C3B5E', '#0080FF', '#D97707', '#4A5568'] },
  { name: "Brazil", type: "country", colors: ['#009B3A', '#FEDF00', '#002776', '#FCFCFC', '#8A2BE3', '#FF6F00', '#4A2E12', '#F3E5AB'] },
  { name: "Italy", type: "country", colors: ['#009246', '#F9F6F0', '#CE2B37', '#00A897', '#CC7722', '#E5A93D', '#C41E3A', '#556B2F'] },
  { name: "Canada", type: "country", colors: ['#FE0000', '#FDFEFE', '#1E4620', '#A5F2F3', '#5A6B7C', '#E5A93E', '#D97708', '#00FF99'] },
  { name: "Australia", type: "country", colors: ['#003366', '#B83A24', '#FEFDFD', '#00A8A8', '#5B8C5A', '#FFCD00', '#F4D03F', '#8B261C'] },
  { name: "Spain", type: "country", colors: ['#AA152F', '#F1BF00', '#D4AF39', '#008080', '#1A1A1A', '#9B111E', '#0055A5', '#808000'] },
  { name: "India", type: "country", colors: ['#FF9933', '#000080', '#138808', '#FFFDF9', '#FF69B5', '#E5A93F', '#8B4515', '#008081'] },
  { name: "China", type: "country", colors: ['#EE1C25', '#FFDE00', '#00A86B', '#1B4D89', '#C8102E', '#C45B28', '#E07A5F', '#0F1115'] },
  { name: "Mexico", type: "country", colors: ['#006847', '#F4F5F4', '#CE1126', '#00A3A6', '#FF9900', '#4B6B38', '#A0522D', '#800080'] },
  { name: "Argentina", type: "country", colors: ['#74ACDF', '#F6B40E', '#FAFAFA', '#4F772D', '#A61C1C', '#B0E0E6', '#8B5A2B', '#C0C0C0'] }
];

export interface PixelData {
  x: number;
  y: number;
  color: string;
}
