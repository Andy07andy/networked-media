// 引入必要模块
const express = require('express');
const { Solar } = require('lunar-javascript');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// 设置EJS模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

// 五行映射
const elementMap = {
  "甲": "木", "乙": "木",
  "丙": "火", "丁": "火",
  "戊": "土", "己": "土",
  "庚": "金", "辛": "金",
  "壬": "水", "癸": "水"
};

const branchElementMap = {
  "子": "水", "丑": "土",
  "寅": "木", "卯": "木",
  "辰": "土", "巳": "火",
  "午": "火", "未": "土",
  "申": "金", "酉": "金",
  "戌": "土", "亥": "水"
};

const generateMap = {
  "木": "火",
  "火": "土",
  "土": "金",
  "金": "水",
  "水": "木"
};

const overcomeMap = {
  "木": "土",
  "土": "水",
  "水": "火",
  "火": "金",
  "金": "木"
};

// 简单初版 Ingredient ➔ 五行映射
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


// 拉取Drink列表（根据是否酒精）
async function fetchDrinks(alcoholPreference) {
  const url = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?a=${alcoholPreference}`;
  const res = await axios.get(url);
  return res.data.drinks;
}

// 拉取Drink详细成分
async function fetchDrinkDetail(id) {
  const url = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`;
  const res = await axios.get(url);
  const drink = res.data.drinks[0];
  
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
    ingredients: ingredients
  };
}

// 首页
app.get('/', (req, res) => {
  res.render('index');
});

// 结果页
app.post('/result', async (req, res) => {
  const { year, month, day, hour, alcoholPreference, allergies } = req.body;
  const allergyList = allergies ? allergies.split(',').map(item => item.trim().toLowerCase()) : [];

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

  let todayStatus = "";
  if (todayElement === neededElement) {
    todayStatus = "顺势日";
  } else {
    todayStatus = "逆势日";
  }

  // 拉drink列表+筛选
  let recommendedDrink = null;
  try {
    const drinkList = await fetchDrinks(alcoholPreference);
    const detailedDrinks = [];

    for (const drink of drinkList) {
      const detail = await fetchDrinkDetail(drink.idDrink);
      
      await new Promise(resolve => setTimeout(resolve, 200));

      // 检查有没有过敏成分
      const hasAllergy = detail.ingredients.some(ing => allergyList.includes(ing.toLowerCase()));
      if (hasAllergy) continue;

      // 检查ingredients有没有包含需要的五行
      const hasNeededElement = detail.ingredients.some(ing => {
        const ele = ingredientElementMap[ing];
        return ele === neededElement;
      });

      if (hasNeededElement) {
        detailedDrinks.push(detail);
      }
    }

    // 最后推荐
    if (detailedDrinks.length > 0) {
      recommendedDrink = detailedDrinks[Math.floor(Math.random() * detailedDrinks.length)];
    }
  } catch (error) {
    console.error("拉取CocktailDB数据失败：", error.message);
  }

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
    allergies,
    recommendedDrink
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动，访问：http://localhost:${PORT}`);
});
