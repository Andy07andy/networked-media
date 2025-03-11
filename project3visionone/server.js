// Import required modules
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// Set up EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware for parsing POST requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to read products from JSON
function readProducts() {
    const data = fs.readFileSync(path.join(__dirname, 'products.json'), 'utf-8');
    return JSON.parse(data);
}

// Helper function to read reviews from JSON
function readReviews() {
    const data = fs.readFileSync(path.join(__dirname, 'reviews.json'), 'utf-8');
    return JSON.parse(data);
}

// Landing Page (first page users see)
app.get('/', (req, res) => {
    res.render('landing', { title: "Welcome to the Product Comparison Platform" });
});

// Product List Page (sorted by highest rating first)
app.get('/products', (req, res) => {
    const filterCategory = req.query.category || "ALL";
    const filterFeature = req.query.feature || "ALL";
    const products = readProducts();
    const reviews = readReviews();

    // Compute average rating for each product
    const updatedProducts = products.map(product => {
        const productReviews = reviews.filter(r => r.productId === product.id);
        const total = productReviews.reduce((sum, r) => sum + Number(r.rating), 0);
        const avgRating = productReviews.length > 0 ? total / productReviews.length : 0;
        return { ...product, avgRating: parseFloat(avgRating.toFixed(1)) };
    });

    let filteredProducts = updatedProducts;
    if (filterCategory !== "ALL") {
        filteredProducts = filteredProducts.filter(p => p.category === filterCategory);
    }
    if (filterFeature !== "ALL") {
        filteredProducts = filteredProducts.filter(p => p.MainFunction && p.MainFunction.includes(filterFeature));
    }

    // Sort products by highest rating first
    filteredProducts.sort((a, b) => b.avgRating - a.avgRating);

    // Extract unique categories and features
    const categories = [...new Set(products.map(p => p.category))];
    const features = [...new Set(products.flatMap(p => p.MainFunction || []))];

    res.render('index', {
        title: "Product Comparison",
        products: filteredProducts,
        categories,
        features,
        currentCategory: filterCategory,
        currentFeature: filterFeature
    });
});



// Product Details Page
app.get('/product/:id', (req, res) => {
    const productId = req.params.id;
    const products = readProducts();
    const product = products.find(p => p.id === productId);

    if (!product) {
        return res.status(404).send("Product not found.");
    }

    const reviews = readReviews();
    const productReviews = reviews.filter(r => r.productId === productId);
    productReviews.sort((a, b) => b.likes - a.likes);

    const totalLikes = productReviews.reduce((sum, review) => sum + review.likes, 0);
    const totalReviews = productReviews.length;

    res.render('product', {
        title: product.name,
        product,
        reviews: productReviews,
        totalLikes,
        totalReviews
    });
});

// Submit a new review
app.post('/review', (req, res) => {
    const { productId, rating, text } = req.body;
    if (!productId || !rating || !text) {
        return res.status(400).send("Incomplete review data.");
    }
    const reviews = readReviews();
    const newReview = {
        id: Date.now().toString(),
        productId,
        rating: Number(rating),
        text,
        likes: 0,
        createdAt: new Date().toISOString()
    };
    reviews.push(newReview);
    fs.writeFileSync(path.join(__dirname, 'reviews.json'), JSON.stringify(reviews, null, 2));
    res.redirect(`/product/${productId}`);
});

// Like a review
app.post('/review/:id/like', (req, res) => {
    const reviewId = req.params.id;
    const reviews = readReviews();
    const review = reviews.find(r => r.id === reviewId);
    if (!review) {
        return res.status(404).send("Review not found.");
    }
    review.likes += 1;
    fs.writeFileSync(path.join(__dirname, 'reviews.json'), JSON.stringify(reviews, null, 2));
    res.redirect(`/product/${review.productId}`);
});

// Start the server
app.listen(3004, ()=>{
    console.log('server is live at http://127.0.0.1:3004')
})
