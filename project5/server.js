// 引入必要模块
const express = require('express');
const { Solar } = require('lunar-javascript');
const path = require('path');

// 初始化express
const app = express();
const PORT = 3000;

// 设置EJS模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 解析POST数据
app.use(express.urlencoded({ extended: true }));

// 五行映射表
const elementMap = {
  "甲": "木", "乙": "木",
  "丙": "火", "丁": "火",
  "戊": "土", "己": "土",
  "庚": "金", "辛": "金",
  "壬": "水", "癸": "水"
};

// 地支对应五行（主要用于月令）
const branchElementMap = {
  "子": "水", "丑": "土",
  "寅": "木", "卯": "木",
  "辰": "土", "巳": "火",
  "午": "火", "未": "土",
  "申": "金", "酉": "金",
  "戌": "土", "亥": "水"
};

// 生克关系（简化版）
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

// 饮品库（按五行分组）
const drinks = {
  "木": {
    "顺": ["绿茶", "薄荷水", "青苹果苏打"],
    "逆": ["蜂蜜柠檬茶", "椰子汁"]
  },
  "火": {
    "顺": ["桂花乌龙", "柚子茶"],
    "逆": ["红枣枸杞茶", "姜茶"]
  },
  "土": {
    "顺": ["燕麦拿铁", "豆浆"],
    "逆": ["南瓜拿铁", "薏米水"]
  },
  "金": {
    "顺": ["冰美式", "柠檬气泡水"],
    "逆": ["白茶", "银耳莲子汤"]
  },
  "水": {
    "顺": ["椰子水", "葡萄柚气泡水"],
    "逆": ["黑芝麻糊", "银耳雪梨汤"]
  }
};

// 首页路由
app.get('/', (req, res) => {
  res.render('index');
});

// 表单提交后逻辑处理
app.post('/result', (req, res) => {
  const { year, month, day, hour } = req.body;
  console.log("【收到用户输入】:", year, month, day, hour);

  const solar = Solar.fromYmdHms(Number(year), Number(month), Number(day), Number(hour), 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const dayGanZhi = eightChar.getDay(); // 日柱
  const monthGanZhi = eightChar.getMonth(); // 月柱
  const dayGan = dayGanZhi.charAt(0); // 日主
  const monthBranch = monthGanZhi.charAt(1); // 月令

  console.log("【日柱（日干支）】:", dayGanZhi);
  console.log("【日主（日干）】:", dayGan);
  console.log("【月令（月支）】:", monthBranch);

  const userElement = elementMap[dayGan];
  const monthElement = branchElementMap[monthBranch];

  console.log("【日主五行】:", userElement);
  console.log("【月令五行】:", monthElement);

  // 身强 or 身弱 判断
  let bodyStatus = "";
  if (monthElement === userElement || generateMap[monthElement] === userElement) {
    bodyStatus = "身强";
  } else if (overcomeMap[monthElement] === userElement || generateMap[userElement] === monthElement) {
    bodyStatus = "身弱";
  } else {
    bodyStatus = "普通";
  }
  console.log("【身强/身弱】:", bodyStatus);

  // 确定需要补的五行
  let neededElement = "";
  if (bodyStatus === "身强") {
    neededElement = generateMap[userElement]; // 泄我
  } else if (bodyStatus === "身弱") {
    const reverseGenerate = Object.fromEntries(Object.entries(generateMap).map(([k, v]) => [v, k]));
    neededElement = reverseGenerate[userElement]; // 生我
  } else {
    neededElement = userElement; // 普通补自己
  }
  console.log("【需要补的五行】:", neededElement);

  // 获取今天的日干
  const now = new Date();
  const solarToday = Solar.fromDate(now);
  const lunarToday = solarToday.getLunar();
  const todayDayGanZhi = lunarToday.getDayInGanZhi();
  const todayStem = todayDayGanZhi.charAt(0);
  const todayElement = elementMap[todayStem];

  console.log("【今天完整日柱（日干支）】:", todayDayGanZhi);
  console.log("【今天天干】:", todayStem);
  console.log("【今天五行】:", todayElement);

  // 判断今天顺/逆
  let todayStatus = "";
  if (todayElement === neededElement) {
    todayStatus = "顺势日";
  } else {
    todayStatus = "逆势日";
  }
  console.log("【今天顺/逆势】:", todayStatus);

  // 推荐饮品（按需要补的五行分类挑）
  let recommendedDrink = "";
  if (todayStatus === "顺势日") {
    recommendedDrink = drinks[neededElement]["顺"][Math.floor(Math.random() * drinks[neededElement]["顺"].length)];
  } else {
    recommendedDrink = drinks[neededElement]["逆"][Math.floor(Math.random() * drinks[neededElement]["逆"].length)];
  }
  console.log("【推荐饮品】:", recommendedDrink);

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
    recommendedDrink
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动，访问：http://localhost:${PORT}`);
});
