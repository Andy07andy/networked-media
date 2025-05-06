const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const { Solar } = require("lunar-javascript");
const axios = require("axios");
const ingredientElementMap = require("./ingredientMap");

const app = express();
const PORT = 3000;
const USERS_FILE = "database.txt";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "bazi_demo_secret",
  resave: false,
  saveUninitialized: false,
}));

function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function ensureLoggedIn(req, res, next) {
  if (req.session.username) return next();
  res.redirect("/preferences");
}

// 五行逻辑
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

async function fetchDrinks(alcoholPreference = "Alcoholic") {
  try {
    let url = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?a=${alcoholPreference}`;
    const res = await axios.get(url);
    return res.data.drinks || [];
  } catch {
    return [];
  }
}

async function fetchDrinkDetail(id) {
  try {
    const url = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`;
    const res = await axios.get(url);
    const drink = res.data.drinks?.[0];
    if (!drink) return null;

    const ingredients = [];
    for (let i = 1; i <= 15; i++) {
      const ing = drink[`strIngredient${i}`];
      if (ing) ingredients.push(ing);
    }

    return {
      name: drink.strDrink,
      image: drink.strDrinkThumb,
      ingredients,
    };
  } catch {
    return null;
  }
}

// Routes
app.get("/", (req, res) => res.redirect("/login"));

app.get("/signup", (req, res) => res.render("index", { error: null }));

app.post("/signup", (req, res) => {
  const { username, password, year, month, day, hour } = req.body;
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.render("index", { error: "用户名已存在" });
  }

  users.push({
    username,
    password,
    birthday: { year, month, day, hour },
    previous: [],
  });

  saveUsers(users);
  req.session.username = username;
  req.session.username = username;
res.redirect("/preferences"); 

});

app.get("/login", (req, res) => res.render("login", { error: null }));
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log("🔐 登录请求:", username, password);
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  console.log("👤 匹配结果:", user);

  if (!user) {
    console.log("❌ 登录失败：用户名或密码错误");
    return res.render("login", { error: "用户名或密码错误" });
  }

  req.session.username = username;
  console.log("✅ 登录成功，跳转至 /preferences");
  res.redirect("/preferences");
});



app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// 用户每日偏好页面
app.get("/preferences", ensureLoggedIn, (req, res) => {
  res.render("preferences");
});
app.get("/result", ensureLoggedIn, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.username);
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = user.previous.find(p => p.date === today);

  if (!todayRecord) {
    // 如果当天还没推荐过，就让用户回去填偏好
    return res.redirect("/preferences");
  }

  // 从历史中读取数据并显示
  const solar = Solar.fromYmdHms(
    Number(user.birthday.year),
    Number(user.birthday.month),
    Number(user.birthday.day),
    Number(user.birthday.hour),
    0,
    0
  );
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  const dayGanZhi = eightChar.getDay();
  const monthGanZhi = eightChar.getMonth();
  const dayGan = dayGanZhi.charAt(0);
  const monthBranch = monthGanZhi.charAt(1);
  const userElement = elementMap[dayGan];
  const monthElement = branchElementMap[monthBranch];

  let bodyStatus = "普通";
  if (monthElement === userElement || generateMap[monthElement] === userElement) {
    bodyStatus = "身强";
  } else if (overcomeMap[monthElement] === userElement || generateMap[userElement] === monthElement) {
    bodyStatus = "身弱";
  }

  let neededElement = userElement;
  if (bodyStatus === "身强") neededElement = generateMap[userElement];
  else if (bodyStatus === "身弱") {
    const reverse = Object.fromEntries(Object.entries(generateMap).map(([k, v]) => [v, k]));
    neededElement = reverse[userElement];
  }

  res.render("result", {
    dayGan,
    userElement,
    monthBranch,
    monthElement,
    bodyStatus,
    neededElement,
    recommendedDrink: todayRecord.drink,
  });
});

app.post("/result", ensureLoggedIn, async (req, res) => {

  const users = loadUsers();
  const user = users.find(u => u.username === req.session.username);
  const { year, month, day, hour } = user.birthday;

    // 获取每日饮品偏好
// 保存用户每日偏好到 session
req.session.alcoholPreference = req.body.alcoholPreference || "Alcoholic";
req.session.allergies = Array.isArray(req.body.allergies)
  ? req.body.allergies
  : req.body.allergies ? [req.body.allergies] : [];

  const alcoholPreference = req.session.alcoholPreference || "Alcoholic";
  const allergyList = req.session.allergies || [];

  const solar = Solar.fromYmdHms(Number(year), Number(month), Number(day), Number(hour), 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  const dayGanZhi = eightChar.getDay();
  const monthGanZhi = eightChar.getMonth();
  const dayGan = dayGanZhi.charAt(0);
  const monthBranch = monthGanZhi.charAt(1);
  const userElement = elementMap[dayGan];
  const monthElement = branchElementMap[monthBranch];

  

  let bodyStatus = "普通";
  if (monthElement === userElement || generateMap[monthElement] === userElement) {
    bodyStatus = "身强";
  } else if (overcomeMap[monthElement] === userElement || generateMap[userElement] === monthElement) {
    bodyStatus = "身弱";
  }

  let neededElement = userElement;
  if (bodyStatus === "身强") neededElement = generateMap[userElement];
  else if (bodyStatus === "身弱") {
    const reverse = Object.fromEntries(Object.entries(generateMap).map(([k, v]) => [v, k]));
    neededElement = reverse[userElement];
  }

  const today = new Date().toISOString().slice(0, 10);
  let todayRecord = user.previous.find(p => p.date === today);

  if (!todayRecord) {
    const drinkList = await fetchDrinks(alcoholPreference);
    let recommendedDrink = null;

    for (let drink of drinkList) {
      const detail = await fetchDrinkDetail(drink.idDrink);
      if (!detail) continue;
      const hasAllergy = detail.ingredients.some(ing =>
        allergyList.includes(ing.toLowerCase())
      );
      if (hasAllergy) continue;
      
      const hasNeeded = detail.ingredients.some(ing =>
        ingredientElementMap[ing] === neededElement
      );
      if (hasNeeded) {
        recommendedDrink = detail;
        break;
      }
      
    }

    todayRecord = {
      date: today,
      drink: {
        name: recommendedDrink?.name || "暂无推荐",
        image: recommendedDrink?.image || "",
        ingredients: recommendedDrink?.ingredients || [],
      },
    };

    user.previous.push(todayRecord);
    saveUsers(users);
  }

  res.render("result", {
    dayGan,
    userElement,
    monthBranch,
    monthElement,
    bodyStatus,
    neededElement,
    recommendedDrink: todayRecord.drink,
  });
});

app.get("/previous", ensureLoggedIn, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.username);
  res.render("previous", { previous: user.previous || [] });
});


app.get("/about", ensureLoggedIn, (req, res) => {
  res.render("about");
});


app.listen(PORT, () => {
  console.log(`Server run @ http://localhost:${PORT}`);
});
