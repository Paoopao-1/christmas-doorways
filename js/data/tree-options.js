// 圣诞树的三种画风与挂饰配色（创建者在「装饰圣诞树」里选择）
export const TREE_STYLES = {
  painted:   { label: '手绘油画', desc: '水粉笔触的松针与彩球' },
  handmade:  { label: '复古手作', desc: '纸艺、布料、邮票挂饰' },
  starlight: { label: '梦幻星光', desc: '细腻粒子与环绕灯光' },
};
export const DEFAULT_TREE = 'painted';

export const PALETTES = {
  classic: { label: '经典红绿', colors: ['#B62935', '#F1D47B', '#F5EBD8', '#315B46'] },
  dusty:   { label: '雪蓝复古', colors: ['#87A9BC', '#F5EBD8', '#B62935', '#795747'] },
  market:  { label: '圣诞市集', colors: ['#B62935', '#F1D47B', '#315B46', '#87A9BC', '#795747'] },
};
export const DEFAULT_PALETTE = 'classic';

export const STARS = {
  classic: { label: '五角星', icon: 'star' },
  snow:    { label: '雪花之星', icon: 'snowflake' },
  heart:   { label: '心形之星', icon: 'heart' },
};
