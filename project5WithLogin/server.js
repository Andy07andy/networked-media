const express = require('express');
const session = require('express-session');
const { Solar } = require('lunar-javascript');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'bazi_drinks_secret',
  resave: false,
  saveUninitialized: false
}));

const usersPath = path.join(__dirname, 'data', 'users.json');

// === 五行映射 ===
const elementMap = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火",
  "戊": "土", "己": "土", "庚": "金", "辛": "金",
  "壬": "水", "癸": "水"
};
const branchElementMap = {
  "子": "水", "丑": "土", "寅": "木", "卯": "木",
  "辰": "土", "巳": "火", "午": "火", "未": "土",
  "申": "金", "酉": "金", "戌": "土", "亥": "水"
};
const generateMap = {
  "木": "火", "火": "土", "土": "金", "金": "水", "水": "木"
};
const overcomeMap = {
  "木": "土", "土": "水", "水": "火", "火": "金", "金": "木"
};

// === 简化 Ingredient - 五行映射 ===
const ingredientElementMap = {
    // 木 Wood
    "Mint": "木", "Lemon": "木", "Lime": "木", "Orange": "木", "Grapefruit Juice": "木",
    "Applejack": "木", "Apple Juice": "木", "Green Tea": "木", "Triple Sec": "木",
    "Cointreau": "木", "Vermouth": "木", "Absinthe": "木", "Peach Schnapps": "木",
    "Midori Melon Liqueur": "木", "Blue Curacao": "木", "Curacao": "木",
    "Cranberry Juice": "木", "Pineapple Juice": "木", "Herbs": "木",
    
    // 火 Fire
    "Vodka": "火", "Rum": "火", "White Rum": "火", "Dark Rum": "火",
    "Brandy": "火", "Whisky": "火", "Bourbon": "火", "Tequila": "火", 
    "Coffee": "火", "Coffee Liqueur": "火", "Kahlua": "火", "Amaretto": "火",
    "Galliano": "火", "Baileys Irish Cream": "火", "Sambuca": "火", 
    "Mezcal": "火", "Cachaca": "火", "Sherry": "火", "Cherry Brandy": "火",
    "Frangelico": "火", "Port": "火", "Southern Comfort": "火", "Campari": "火",
    "Grenadine": "火", "Brown Sugar": "火", "Orange Bitters": "火",
    "Bitters": "火",
  
    // 土 Earth
    "Milk": "土", "Cream": "土", "Half-and-half": "土", "Chocolate": "土",
    "White Chocolate Liqueur": "土", "Coconut Cream": "土", "Banana Liqueur": "土",
    "Yoghurt": "土", "Egg": "土", "Honey": "土", "Peanut Butter": "土",
    "Oreo Cookie": "土", "Butterscotch Schnapps": "土", "Irish Cream": "土",
    "Vanilla Ice Cream": "土", "Advocaat": "土",
  
    // 金 Metal
    "Gin": "金", "Champagne": "金", "Tonic Water": "金",
    "Soda Water": "金", "Sparkling Water": "金", "Dry Vermouth": "金",
    "Prosecco": "金", "White Wine": "金", "Light Rum": "金",
    "Club Soda": "金", "Lillet Blanc": "金",
  
    // 水 Water
    "Coconut Water": "水", "Grape Juice": "水", "Blue Curacao": "水",
    "Sprite": "水", "Cola": "水", "Root Beer": "水",
    "Dr. Pepper": "水", "Pearl Barley Water": "水", "Aloe Vera Juice": "水",
    "Energy Drink": "水", "Coconut Milk": "水", "Perrier": "水",
    "7-Up": "水", "Blackcurrant Cordial": "水", "Red Bull": "水",
    "Water": "水", "Tamarind Juice": "水"
  };
  

// === 工具函数 ===
function readUsers() {
  if (!fs.existsSync(usersPath)) return [];
  const data = fs.readFileSync(usersPath);
  return JSON.parse(data);
}
function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}
function getUser(username) {
  return readUsers().find(u => u.username === username);
}

// === 路由逻辑 ===

// 首页（已登录用户直接使用 birthday 自动填入）
app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const user = getUser(req.session.user.username);
    res.render('index', { user });
  });
  

app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));
app.get('/about', (req, res) => res.render('about', { user: req.session.user }));

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// 注册逻辑（写入 birthday）
app.post('/register', (req, res) => {
  const { username, password, birthday } = req.body;
  const users = readUsers();

  if (users.find(u => u.username === username)) {
    return res.send('用户名已存在。<a href="/register">返回</a>');
  }

  users.push({ username, password, birthday, history: [] });
  saveUsers(users);

  req.session.user = { username };
  res.redirect('/');
});

// 登录逻辑（写入 session.user）
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = getUser(username);

  if (user && user.password === password) {
    req.session.user = { username };
    res.redirect('/');
  } else {
    res.send('登录失败，用户名或密码错误。<a href="/login">返回</a>');
  }
});

// 历史记录页
app.get('/history', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const user = getUser(req.session.user.username);
  res.render('history', { history: user?.history || [] });
});

// 推荐逻辑
app.post('/result', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

  const user = getUser(req.session.user.username);
  if (!user) return res.redirect('/login');

  // Step 1: 解析输入
  let { year, month, day, hour } = req.body;
  const { alcoholPreference, allergies } = req.body;
  const allergyList = allergies ? allergies.split(',').map(a => a.trim().toLowerCase()) : [];

  // Step 2: fallback 到用户生日
  if ((!year || !month || !day || !hour) && user.birthday) {
    console.log("🎂 正在使用用户 birthday fallback：", user.birthday);
    const parts = user.birthday.split('-');
    if (parts.length === 3) {
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2]);
      hour = 12; // 默认中午
    }
  }

  // Step 3: 验证所有字段已为数字
  year = Number(year);
  month = Number(month);
  day = Number(day);
  hour = Number(hour);

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour)) {
    console.log('❌ 出生信息不合法:', { year, month, day, hour });
    return res.send("出生信息有误，请重新提交");
  }
  
  const solar = Solar.fromYmdHms(Number(year), Number(month), Number(day), Number(hour), 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const dayGan = eightChar.getDay().charAt(0);
  const monthBranch = eightChar.getMonth().charAt(1);
  const userElement = elementMap[dayGan];
  const monthElement = branchElementMap[monthBranch];

  let bodyStatus = "普通";
  if (monthElement === userElement || generateMap[monthElement] === userElement) {
    bodyStatus = "身强";
  } else if (overcomeMap[monthElement] === userElement || generateMap[userElement] === monthElement) {
    bodyStatus = "身弱";
  }

  let neededElement = bodyStatus === "身强"
    ? generateMap[userElement]
    : Object.entries(generateMap).find(([k, v]) => v === userElement)?.[0] || userElement;

  const todayStem = Solar.fromDate(new Date()).getLunar().getDayInGanZhi().charAt(0);
  const todayElement = elementMap[todayStem];
  const todayStatus = todayElement === neededElement ? "顺势日" : "逆势日";
  const today = new Date().toISOString().split('T')[0];

  // 拉取饮品逻辑
  let allDrinks = [];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  for (const letter of alphabet) {
    try {
      const res = await axios.get(`https://www.thecocktaildb.com/api/json/v1/1/search.php?f=${letter}`);
      if (res.data.drinks) allDrinks = allDrinks.concat(res.data.drinks);
    } catch (err) {
      console.error(`拉取 ${letter} 失败：`, err.message);
    }
  }

  allDrinks = allDrinks.sort(() => 0.5 - Math.random());
  let candidates = { strict: [], similar: [], any: [] };

  for (const drink of allDrinks) {
    try {
      if ((alcoholPreference === 'Alcoholic' && drink.strAlcoholic !== 'Alcoholic') ||
          (alcoholPreference !== 'Alcoholic' && drink.strAlcoholic === 'Alcoholic')) continue;

      const detail = (await axios.get(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${drink.idDrink}`)).data.drinks[0];
      const ingredients = Array.from({ length: 15 }, (_, i) => detail[`strIngredient${i + 1}`]).filter(Boolean);
      if (ingredients.some(i => allergyList.includes(i.toLowerCase()))) continue;

      const elems = ingredients.map(i => ingredientElementMap[i]).filter(Boolean);
      const hasNeed = elems.includes(neededElement);
      const hasSimilar = elems.includes(generateMap[neededElement]) || elems.includes(overcomeMap[neededElement]);

      const obj = { name: detail.strDrink, image: detail.strDrinkThumb, ingredients };
      if (hasNeed) candidates.strict.push(obj);
      else if (hasSimilar) candidates.similar.push(obj);
      else if (elems.length > 0) candidates.any.push(obj);
    } catch (err) {
      console.warn(`跳过 ${drink.strDrink}`, err.message);
    }
  }

  const recommendedDrink = candidates.strict[0] || candidates.similar[0] || candidates.any[0] || null;

  // 保存推荐记录
  if (recommendedDrink) {
    const users = readUsers();
    const index = users.findIndex(u => u.username === user.username);
    users[index].history.push({
      date: today,
      drinkName: recommendedDrink.name,
      ingredients: recommendedDrink.ingredients,
      image: recommendedDrink.image
    });
    saveUsers(users);
  }

  res.render('result', {
    dayGan,
    userElement,
    monthBranch,
    monthElement,
    bodyStatus,
    neededElement,
    todayDayGanZhi: lunarToday.getDayInGanZhi(), 
    todayElement,
    todayStatus,
    alcoholPreference,
    allergies,
    recommendedDrink,
    user
  });
});

// 启动
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在：http://localhost:${PORT}`);
});
