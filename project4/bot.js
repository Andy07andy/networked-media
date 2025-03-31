// Load environment variables
require("dotenv").config()
const m = require("masto")
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

// Initialize Mastodon client
const masto = m.createRestAPIClient({
    url: "https://networked-media.itp.io/",
    accessToken: process.env.TOKEN
})

// Fetch a random meal from the MealDB API
async function getRandomMeal() {
    const res = await fetch("https://www.themealdb.com/api/json/v1/1/random.php")
    const data = await res.json()
    const meal = data.meals[0]

    return {
        name: meal.strMeal,
        country: meal.strArea,
        instructions: meal.strInstructions.slice(0, 100) + "...",
        link: meal.strSource || meal.strYoutube || "https://www.themealdb.com/",
        emoji: "🍽️",
    }
}

// Post a status to Mastodon
async function makeStatus(text) {
    const status = await masto.v1.statuses.create({
        status: text,
        visibility: "public" 
    })

    console.log("✅ Successfully posted: " + status.url)
}

// Main logic: fetch meal data and post it
async function runBot() {
    const meal = await getRandomMeal()

    const text = `${meal.emoji} Today's featured dish: ${meal.name}
🌍 Origin: ${meal.country}
📖 Description: ${meal.instructions}
🔗 Learn more: ${meal.link}
#GlobalMeal #FoodBot #DailyDish`

    await makeStatus(text)
}

// Schedule the bot to run once every 24 hours (in milliseconds)
setInterval(runBot, 24 * 60 * 60 * 1000)

// Run once immediately on startup
runBot()
