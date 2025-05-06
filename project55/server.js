// server.js — BaZi Drinks Recommendation
const express = require("express");
const session = require("express-session");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const { Solar } = require("lunar-javascript");
const axios = require("axios");
const ingredientElementMap = require("./ingredientMap");

const app = express();
const PORT = 3000;
const userDB = new Datastore({ filename: "database.txt", autoload: true });

// Flavor profiles for vibes
const flavorTagsMap = {
  "Green Tea": ["Refreshing", "Earthy"],
  "Honey": ["Sweet", "Smooth"],
  "Lemon": ["Citrusy", "Refreshing"],
  "Vodka": ["Strong", "Spicy"],
  "Mint": ["Cool", "Fresh"],
  "Coffee": ["Bitter", "Bold"],
  "Milk": ["Creamy", "Soothing"],
  "Chocolate": ["Sweet", "Comforting"],
  "Blue Curacao": ["Citrusy", "Tropical"],
  "Blueberry schnapps": ["Fruity", "Sweet"],
  "7-Up": ["Sparkling", "Light"],
  "Sour mix": ["Tangy", "Zesty"]
};

// Mood guidance by Five Elements
const moodByElement = {
  "木": "For creative flow and growth",
  "火": "To uplift and energize",
  "土": "To ground and stabilize",
  "金": "For focus and clarity",
  "水": "To relax and recharge"
};

const timeSuggestionByElement = {
  "木": "Morning",
  "火": "Evening",
  "土": "Afternoon",
  "金": "Late Afternoon",
  "水": "Night"
};

const relationMap = {
  "生": "supports your energy today. Take action and feel empowered.",
  "克": "challenges your energy today. Take it slow and be mindful.",
  "同类": "mirrors your energy. A good day to reflect.",
  "泄": "may drain your energy. Rest and hydrate.",
  "耗": "may distract your focus. Stay grounded."
};

function determineRelation(dayGan, userGan) {
  if (generateMap[userGan] === dayGan) return "生";
  if (generateMap[dayGan] === userGan) return "泄";
  if (overcomeMap[userGan] === dayGan) return "克";
  if (overcomeMap[dayGan] === userGan) return "耗";
  if (userGan === dayGan) return "同类";
  return "无特定关系";
}


// Setup view engine and middlewares
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "bazi_demo_secret",
  resave: false,
  saveUninitialized: false
}));



function ensureLoggedIn(req, res, next) {
  if (req.session.username) return next();
  res.redirect("/preferences");
}

function shuffle(array) {
  //randomize drink order to avoid repeat vibes
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// BaZi mappings
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

// API wrappers
async function fetchDrinks(alcoholPreference = "Alcoholic") {
  try {
    const url = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?a=${alcoholPreference}`;
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

// ROUTES
app.get("/", (req, res) => res.render("index"));
app.get("/index", (req, res) => res.redirect("/"));

app.get("/signup", (req, res) => res.render("signup", { error: null }));
app.post("/signup", (req, res) => {
  const { username, password, year, month, day, hour } = req.body;

  userDB.findOne({ username }, (err, existingUser) => {
    if (existingUser) {
      return res.render("signup", { error: "The username already exists" });
    }

    const newUser = {
      username,
      password,
      birthday: { year, month, day, hour },
      previous: []
    };

    userDB.insert(newUser, (err, insertedUser) => {
      req.session.username = insertedUser.username;
      res.redirect("/preferences");
    });
  });
});


app.get("/login", (req, res) => res.render("login", { error: null }));
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  userDB.findOne({ username, password }, (err, user) => {
    if (!user) return res.render("login", { error: "The username or password is incorrect" });

    req.session.username = username;
    res.redirect("/preferences");
  });
});


app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

// After login, user lands here to choose today's drink mood (alcohol + allergies)
app.get("/preferences", ensureLoggedIn, (req, res) => res.render("preferences"));


app.get("/result", ensureLoggedIn, (req, res) => {
  userDB.findOne({ username: req.session.username }, (err, user) => {
    if (err || !user) return res.redirect("/login");

    const today = new Date().toISOString().slice(0, 10);
    const todayRecord = user.previous.find(p => p.date === today);
    if (!todayRecord) return res.redirect("/preferences");

    const { year, month, day, hour } = user.birthday;
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
    if (monthElement === userElement || generateMap[monthElement] === userElement) bodyStatus = "身强";
    else if (overcomeMap[monthElement] === userElement || generateMap[userElement] === monthElement) bodyStatus = "身弱";

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
      recommendedDrink: todayRecord.drink
    });
  });
});

app.post("/result", ensureLoggedIn, async (req, res) => {
  userDB.findOne({ username: req.session.username }, async (err, user) => {
    if (err || !user) return res.redirect("/login");

    const { year, month, day, hour } = user.birthday;
    const alcoholPreference = req.body.alcoholPreference || "Alcoholic";
    let allergyList = Array.isArray(req.body.allergies)
      ? req.body.allergies
      : req.body.allergies ? [req.body.allergies] : [];

    const other = req.body.otherAllergy?.trim().toLowerCase();
    if (allergyList.includes("other") && other) allergyList.push(other);
    allergyList = allergyList.filter(a => a !== "other");

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
    if (monthElement === userElement || generateMap[monthElement] === userElement) bodyStatus = "身强";
    else if (overcomeMap[monthElement] === userElement || generateMap[userElement] === monthElement) bodyStatus = "身弱";

    let neededElement = userElement;
    if (bodyStatus === "身强") neededElement = generateMap[userElement];
    else if (bodyStatus === "身弱") {
      const reverse = Object.fromEntries(Object.entries(generateMap).map(([k, v]) => [v, k]));
      neededElement = reverse[userElement];
    }

    const today = new Date().toISOString().slice(0, 10);
    let todayRecord = user.previous.find(p => p.date === today);
    if (!todayRecord) {
      todayRecord = { date: today };
      user.previous.push(todayRecord);
    }

    let drink = todayRecord.drink;
    const needsUpdate = !drink || !drink.flavorProfile || !drink.elements || !drink.mood || !drink.baziComment;

    if (needsUpdate) {
      const drinkList = await fetchDrinks(alcoholPreference);
      shuffle(drinkList);

      for (let d of drinkList) {
        const detail = await fetchDrinkDetail(d.idDrink);
        if (!detail) continue;

        const hasAllergy = detail.ingredients.some(ing => allergyList.includes(ing.toLowerCase()));
        if (hasAllergy) continue;

        const hasNeeded = detail.ingredients.some(ing => ingredientElementMap[ing] === neededElement);
        if (!hasNeeded) continue;

        const flavorSet = new Set();
        const elementsSet = new Set();
        detail.ingredients.forEach(ing => {
          if (flavorTagsMap[ing]) flavorTagsMap[ing].forEach(tag => flavorSet.add(tag));
          if (ingredientElementMap[ing]) elementsSet.add(ingredientElementMap[ing]);
        });

        const flavor = [...flavorSet];
        const elements = [...elementsSet];
        const dominantElement = elements[0] || neededElement;
        const todayGan = lunar.getDayGan();
        const relation = determineRelation(todayGan, dayGan);

        drink = {
          name: detail.name,
          image: detail.image,
          ingredients: detail.ingredients || [],
          flavorProfile: flavor.length > 0 ? flavor.join(', ') : "Balanced",
          elements: elements.length > 0 ? elements : [neededElement],
          timeOfDay: timeSuggestionByElement[neededElement] || "Afternoon",
          mood: moodByElement[dominantElement] || "To feel steady and clear",
          baziComment: `Today the energy of ${todayGan} ${relationMap[relation] || "flows neutrally."}`
        };

        todayRecord.drink = drink;
        break;
      }

      // Save updated user record
      userDB.update(
        { username: user.username },
        { $set: { previous: user.previous } },
        {},
        () => {
          res.render("result", {
            dayGan,
            userElement,
            monthBranch,
            monthElement,
            bodyStatus,
            neededElement,
            recommendedDrink: todayRecord.drink
          });
        }
      );
    } else {
      res.render("result", {
        dayGan,
        userElement,
        monthBranch,
        monthElement,
        bodyStatus,
        neededElement,
        recommendedDrink: todayRecord.drink
      });
    }
  });
});

app.get("/previous", ensureLoggedIn, (req, res) => {
  userDB.findOne({ username: req.session.username }, (err, user) => {
    if (err || !user) return res.redirect("/login");
    res.render("previous", { previous: user.previous || [] });
  });
});

app.get("/about", ensureLoggedIn, (req, res) => res.render("about"));

app.listen(PORT, () => {
  console.log(`🧋 BaZi Drinks server running at http://localhost:${PORT}`);
});
