// 引入必要模块
const express   = require('express');
const session   = require('express-session');
const bcrypt    = require('bcrypt');
const fs        = require('fs');
const path      = require('path');
const { Solar } = require('lunar-javascript');
const axios     = require('axios');

const app = express();
const PORT = 3000;

// 设置EJS模板
app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Session配置
app.use(session({
  secret: 'bazi_drinks_secret',
  resave: false,
  saveUninitialized: false
}));

// 用户数据管理
const usersPath = path.join(__dirname,'data','users.json');
function loadUsers() {
  return JSON.parse(fs.readFileSync(usersPath,'utf8') || '[]');
}
function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

// 登录状态检查中间件
function ensureLoggedIn(req, res, next) {
  if (req.session.username) return next();
  res.redirect('/login');
}

// 五行映射
const elementMap = {
  "甲": "木", "乙": "木",
  "丙": "火", "丁": "火",
  "戊": "土", "己": "土",
  "庚": "金", "辛": "金",
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

const ingredientElementMap = {
  "Mint": "木", "Lemon": "木", "Lime": "木", "Orange": "木", "Grapefruit Juice": "木",
  "Applejack": "木", "Apple Juice": "木", "Green Tea": "木", "Triple Sec": "木",
  "Cointreau": "木", "Vermouth": "木", "Absinthe": "木", "Peach Schnapps": "木",
  "Midori Melon Liqueur": "木", "Blue Curacao": "木", "Curacao": "木",
  "Cranberry Juice": "木", "Pineapple Juice": "木", "Herbs": "木",

  "Vodka": "火", "Rum": "火", "White Rum": "火", "Dark Rum": "火",
  "Brandy": "火", "Whisky": "火", "Bourbon": "火", "Tequila": "火", 
  "Coffee": "火", "Coffee Liqueur": "火", "Kahlua": "火", "Amaretto": "火",
  "Galliano": "火", "Baileys Irish Cream": "火", "Sambuca": "火", 
  "Mezcal": "火", "Cachaca": "火", "Sherry": "火", "Cherry Brandy": "火",
  "Frangelico": "火", "Port": "火", "Southern Comfort": "火", "Campari": "火",
  "Grenadine": "火", "Brown Sugar": "火", "Orange Bitters": "火", "Bitters": "火",

  "Milk": "土", "Cream": "土", "Half-and-half": "土", "Chocolate": "土",
  "White Chocolate Liqueur": "土", "Coconut Cream": "土", "Banana Liqueur": "土",
  "Yoghurt": "土", "Egg": "土", "Honey": "土", "Peanut Butter": "土",
  "Oreo Cookie": "土", "Butterscotch Schnapps": "土", "Irish Cream": "土",
  "Vanilla Ice Cream": "土", "Advocaat": "土",

  "Gin": "金", "Champagne": "金", "Tonic Water": "金",
  "Soda Water": "金", "Sparkling Water": "金", "Dry Vermouth": "金",
  "Prosecco": "金", "White Wine": "金", "Light Rum": "金",
  "Club Soda": "金", "Lillet Blanc": "金",

  "Coconut Water": "水", "Grape Juice": "水", "Sprite": "水",
  "Cola": "水", "Root Beer": "水", "Dr. Pepper": "水",
  "Pearl Barley Water": "水", "Aloe Vera Juice": "水",
  "Energy Drink": "水", "Coconut Milk": "水", "Perrier": "水",
  "7-Up": "水", "Blackcurrant Cordial": "水", "Red Bull": "水",
  "Water": "水", "Tamarind Juice": "水"
};

async function fetchDrinks(alcoholPreference = "Alcoholic") {
  try {
    let url = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?a=${alcoholPreference}`;
    let res = await axios.get(url);
    let drinks = res.data.drinks;

    if (!drinks || drinks.length === 0) {
      console.warn(`⚠️ No drinks found for "${alcoholPreference}", fallback to search.php?f=a`);
      // fallback 用 a-z 开头的 drink
      res = await axios.get("https://www.thecocktaildb.com/api/json/v1/1/search.php?f=a");
      drinks = res.data.drinks || [];
    }

    return drinks;
  } catch (err) {
    console.error("fetchDrinks error:", err.message);
    return [];
  }
}

async function fetchDrinkDetail(id) {
  try {
    const url = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`;
    const res = await axios.get(url);
    const drink = res.data.drinks?.[0];
    if (!drink) throw new Error("No drinks found");

    const ingredients = [];
    for (let i = 1; i <= 15; i++) {
      const ingredient = drink[`strIngredient${i}`];
      if (ingredient) {
        ingredients.push(ingredient);
      }
    }

    return {
      name: drink.strDrink,
      image: drink.strDrinkThumb,
      ingredients
    };
  } catch (err) {
    console.error("fetchDrinkDetail error:", err.message);
    return null; // 返回 null 以便主函数做 null 检查
  }
}

// 1) 注册页  
app.get('/', (req, res) => {
  res.redirect('/login');
});
app.get('/signup', (req, res) => {
  res.render('index', { error: null });
});

app.post('/signup', async (req, res) => {
  const { username, password, confirmPassword, year, month, day, hour } = req.body;
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.render('index', { error: '用户名已存在' });
  }
  if (password !== confirmPassword) {
    return res.render('index', { error: '两次输入的密码不一致' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  users.push({
    username,
    passwordHash,
    birthday: { year, month, day, hour },
    previous: []
  });
  saveUsers(users);
  // 自动登录  
  req.session.username = username;
  res.redirect('/result');
});

// 2) 登录页  
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.render('login', { error: '用户名或密码错误' });
  }
  req.session.username = username;
  res.redirect('/result');
});

// 3) 登出  
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// 4) 今日推荐页  
app.get('/result', ensureLoggedIn, async (req, res) => {
  const username = req.session.username;
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  const { year, month, day, hour } = user.birthday;
  const allergyList = user.allergies || [];
  const alcoholPreference = user.alcoholPreference || "Alcoholic";

  // 八字分析
  const solar = Solar.fromYmdHms(Number(year), Number(month), Number(day), Number(hour), 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const dayGanZhi = eightChar.getDay();
  const monthGanZhi = eightChar.getMonth();
  const dayGan = dayGanZhi.charAt(0);
  const monthBranch = monthGanZhi.charAt(1);

  const userElement = elementMap[dayGan];
  const monthElement = branchElementMap[monthBranch];

  let bodyStatus = "";
  if (monthElement === userElement || generateMap[monthElement] === userElement) {
    bodyStatus = "身强";
  } else if (overcomeMap[monthElement] === userElement || generateMap[userElement] === monthElement) {
    bodyStatus = "身弱";
  } else {
    bodyStatus = "普通";
  }

  let neededElement = "";
  if (bodyStatus === "身强") {
    neededElement = generateMap[userElement];
  } else if (bodyStatus === "身弱") {
    const reverseGenerate = Object.fromEntries(Object.entries(generateMap).map(([k, v]) => [v, k]));
    neededElement = reverseGenerate[userElement];
  } else {
    neededElement = userElement;
  }

  const now = new Date();
  const solarToday = Solar.fromDate(now);
  const lunarToday = solarToday.getLunar();
  const todayDayGanZhi = lunarToday.getDayInGanZhi();
  const todayStem = todayDayGanZhi.charAt(0);
  const todayElement = elementMap[todayStem];

  let todayStatus = todayElement === neededElement ? "顺势日" : "逆势日";

  // —— 检查是否已有当天推荐 ——  
  const today = new Date().toISOString().slice(0, 10);
  let todayRecord = user.previous.find(p => p.date === today);

  if (!todayRecord) {
    let recommendedDrink = null;
    let tryCount = 0;
    const MAX_TRIES = 3;

    while (!recommendedDrink && tryCount < MAX_TRIES) {
      tryCount++;
      const drinkList = await fetchDrinks(alcoholPreference);
      const detailedDrinks = [];

      for (const drink of drinkList) {
        const detail = await fetchDrinkDetail(drink.idDrink);
        await new Promise(resolve => setTimeout(resolve, 200));
        if (!detail) continue;

        const hasAllergy = detail.ingredients.some(ing => allergyList.includes(ing.toLowerCase()));
        if (hasAllergy) continue;

        const hasNeededElement = detail.ingredients.some(ing => {
          const ele = ingredientElementMap[ing];
          return ele === neededElement;
        });

        if (hasNeededElement) {
          detailedDrinks.push(detail);
        }
      }

      if (detailedDrinks.length > 0) {
        recommendedDrink = detailedDrinks[Math.floor(Math.random() * detailedDrinks.length)];
      }
    }

    // fallback：记录推荐为空
    todayRecord = {
      date: today,
      drink: {
        name: recommendedDrink?.name || "暂无推荐",
        image: recommendedDrink?.image || "",
        ingredients: recommendedDrink?.ingredients || []
      }
    };

    user.previous.push(todayRecord);
    saveUsers(users);
  }

  // ✅ 控制台调试输出
  console.log("🌿 用户五行：", userElement, "| 身势：", bodyStatus, "| 所需五行：", neededElement);
  console.log("☀️ 今日天干：", todayStem, "| 五行：", todayElement, "| 是否顺势：", todayStatus);
  console.log("🎯 推荐饮品：", todayRecord.drink.name);

  // 渲染页面
  res.render('result', {
    dayGan,
    userElement,
    monthBranch,
    monthElement,
    bodyStatus,
    neededElement,
    todayDayGanZhi,
    todayStem,
    todayElement,
    todayStatus,
    alcoholPreference,
    allergies: allergyList,
    recommendedDrink: todayRecord.drink
  });
});



// 5) 历史推荐页  
app.get('/previous', ensureLoggedIn, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.username);
  res.render('previous', { previous: user.previous || [] });
});

app.listen(PORT, () => console.log(`Server run @ http://localhost:${PORT}`));




