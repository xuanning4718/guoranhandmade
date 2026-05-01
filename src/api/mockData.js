const CLOUD_BASE = 'https://636c-cloud1-6geuw2dr3aa3bd50-1421195402.tcb.qcloud.la/GGHANDMADE'

const categories = [
  { id: 1, name: '涂涂画画', icon: '🎨', color: '#FFE4B5', emoji: '🎨' },
  { id: 2, name: '素描画作', icon: '✏️', color: '#E8E8E8', emoji: '✏️' },
  { id: 3, name: '旅行图册', icon: '🗺️', color: '#B5D5E8', emoji: '🗺️' },
  { id: 4, name: '仿真食玩', icon: '🍜', color: '#FFE0CC', emoji: '🍜' },
  { id: 5, name: '冰箱贴', icon: '🧲', color: '#D5E8D4', emoji: '🧲' },
  { id: 6, name: '手画书签', icon: '🔖', color: '#E8D4E5', emoji: '🔖' },
  { id: 7, name: '泥塑玩偶', icon: '🧸', color: '#F0E4D4', emoji: '🧸' },
  { id: 8, name: '更多好物', icon: '🎁', color: '#D4DCE8', emoji: '🎁' }
]

const categoryDetails = [
  { cateId: 1, detId: 101, detName: '自由畅想', sortNo: 1 },
  { cateId: 1, detId: 102, detName: '线描淡彩', sortNo: 2 },
  { cateId: 1, detId: 103, detName: '创意剪贴画', sortNo: 3 },
  { cateId: 1, detId: 104, detName: '涂鸦速写', sortNo: 4 },
  { cateId: 2, detId: 201, detName: '静物素描', sortNo: 1 },
  { cateId: 2, detId: 202, detName: '人物素描', sortNo: 2 },
  { cateId: 2, detId: 203, detName: '风景素描', sortNo: 3 }
]

const creators = [
  { id: 1, name: '小画童', avatar: '', bio: '儿童美术教育 | 用画笔记录童年想象', coverImage: '', level: '认证创作者', followers: 526, worksCount: 24, location: '上海', wechatQR: '' },
  { id: 2, name: '墨白', avatar: '', bio: '素描画师 | 铅笔下的光影世界', coverImage: '', level: '热门创作者', followers: 1280, worksCount: 38, location: '北京', wechatQR: '' },
  { id: 3, name: '行走的画笔', avatar: '', bio: '旅行插画师 | 用画笔丈量世界', coverImage: '', level: '认证创作者', followers: 867, worksCount: 32, location: '广州', wechatQR: '' },
  { id: 4, name: '食光手作', avatar: '', bio: '仿真食玩创作者 | 以假乱真的美味', coverImage: '', level: '认证创作者', followers: 689, worksCount: 20, location: '成都', wechatQR: '' },
  { id: 5, name: '泥小匠', avatar: '', bio: '泥塑手艺人 | 指尖上的童话世界', coverImage: '', level: '热门创作者', followers: 945, worksCount: 28, location: '天津', wechatQR: '' },
  { id: 6, name: '菓菓', avatar: '', bio: '陈梓菡', coverImage: '', level: '认证创作者', followers: 3344, worksCount: 108, location: '杭州', wechatQR: '' }
]

const products = [
  { id: 1, title: '儿童水彩画 | 我的家', price: 100, originalPrice: null, images: [`${CLOUD_BASE}/儿童水彩画-我的家.jpg`], category: 1, detId: 101, tags: ['儿童画', '水彩', '原创'], creatorId: 1, description: '5岁小朋友以"我的家"为主题创作的水彩画。大胆的色彩运用，充满了童真和想象力。', stock: 1, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-15' },
  { id: 2, title: '儿童创意画 | 海底世界', price: 95, originalPrice: null, images: [`${CLOUD_BASE}/儿童创意画-海底世界.jpg`], category: 1, detId: 101, tags: ['儿童画', '创意', '原创'], creatorId: 1, description: '6岁小朋友以"我家附近的海"为主题创作。色彩丰富，充满了童趣和想象力。', stock: 2, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-18' },
  { id: 3, title: '阳光下的骑行者', price: 90, originalPrice: null, images: [`${CLOUD_BASE}/阳光下的骑行者1.jpg`, `${CLOUD_BASE}/阳光下的骑行者2.jpg`, `${CLOUD_BASE}/阳光下的骑行者3.jpg`], category: 8, detId: null, tags: ['少女', '彩铅', '复古'], creatorId: 7, description: '用彩铅描绘夕阳下骑车的少年，带着一丝复古的诗意与自由感。', stock: 1, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-10' },
  { id: 4, title: '海边的影子', price: 88, originalPrice: null, images: [`${CLOUD_BASE}/海边的影子.jpg`], category: 8, detId: null, tags: ['剪影', '暖色调', '风景'], creatorId: 7, description: '丘陵、大树、海滩、小屋，一副带着暖色调的剪影世界。', stock: 1, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-12' },
  { id: 5, title: '夏日午后', price: 86, originalPrice: null, images: [`${CLOUD_BASE}/夏日午后.jpg`], category: 2, detId: 203, tags: ['铅笔', '生活', '风景'], creatorId: 7, description: '阳台上晒的衣服、脚踏车、小草地，用黑白铅笔记录下平凡生活中的诗意。', stock: 1, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-16' },
  { id: 6, title: '大理手绘图册', price: 95, originalPrice: null, images: [`${CLOUD_BASE}/大理手绘图册1.jpg`, `${CLOUD_BASE}/大理手绘图册2.jpg`, `${CLOUD_BASE}/大理手绘图册3.jpg`, `${CLOUD_BASE}/大理手绘图册4.jpg`], category: 3, detId: null, tags: ['旅行', '插画', '大理'], creatorId: 3, description: '以原创插画的形式，记录大理的苍山、湖泊和古城风貌。', stock: 15, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-01' },
  { id: 7, title: '仿真拉面', price: 92, originalPrice: null, images: [`${CLOUD_BASE}/仿真拉面.jpg`], category: 4, detId: null, tags: ['仿真', '拉面', '日式'], creatorId: 4, description: '精心制作的仿真拉面模型，连海苔、叉烧、蛋的细节都栩栩如生。', stock: 3, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-05' },
  { id: 8, title: '仿真蜜雪冰', price: 90, originalPrice: null, images: [`${CLOUD_BASE}/仿真蜜雪冰.jpg`], category: 4, detId: null, tags: ['仿真', '甜食', '日式'], creatorId: 4, description: '还原经典日式甜食蜜雪冰，透明感、冰沙质感都处理得非常细腻。', stock: 2, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-08' },
  { id: 9, title: '可爱小熊冰箱贴', price: 88, originalPrice: null, images: [`${CLOUD_BASE}/可爱小熊冰箱贴.jpg`], category: 5, detId: null, tags: ['可爱', '小熊', '泥塑'], creatorId: 5, description: '可爱的小熊兽泥塑冰箱贴，手工上色，适合各类冰箱、白板、铁门。', stock: 12, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-10' },
  { id: 10, title: '水壶水果静物素描', price: 100, originalPrice: null, images: [`${CLOUD_BASE}/素描-静物-水果.jpg`], category: 2, detId: 201, tags: ['静物素描', '水壶', '水果'], creatorId: 6, description: '静物素描，金属水壶搭配梨、苹果、画笔，光影扎实，质感刻画细腻', stock: 1, views: 0, favorites: 0, sales: 0, createdAt: '2026-04-11' },
  { id: 11, title: '酒瓶水果静物', price: 100, originalPrice: null, images: [`${CLOUD_BASE}/素描-静物-综合2.jpg`], category: 2, detId: 201, tags: ['静物素描', '酒瓶', '水果'], creatorId: 6, description: '静物素描，酒瓶、苹果、柿子、玻璃杯等组合，构图饱满，光影层次丰富，质感刻画精准。', stock: 1, views: 0, favorites: 0, sales: 0, createdAt: '2026-04-11' },
  { id: 12, title: '桃花粉猫咪书签', price: 85, originalPrice: null, images: [`${CLOUD_BASE}/桃花粉猫咪书签.jpg`], category: 6, detId: null, tags: ['线描', '猫咪', '桃花'], creatorId: 6, description: '随笔画的猫咪配上桃花元素，粉嫩的配色让人少女心爆棚。', stock: 30, views: 0, favorites: 0, sales: 0, createdAt: '2026-03-20' }
]

const banners = [
  { id: 1, title: '菓然手作', subtitle: '发现生活中的美好' },
  { id: 2, title: '原创作品', subtitle: '每一件都独一无二' },
  { id: 3, title: '温暖手作', subtitle: '用心感受每一份创意' }
]

const comments = {}

export const mockData = {
  categories,
  categoryDetails,
  creators,
  products,
  banners,
  comments
}
