require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const Fashion = require('./database');

const app = express();

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // For future CSS/JS

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dooshi-fashion',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage });

// MongoDB Connect
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

// Routes

// Home - Store
app.get('/', async (req, res) => {
  try {
    const clothes = await Fashion.find().sort({ _id: -1 });
    res.render('index', { clothes });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Admin Panel
app.get('/admin', async (req, res) => {
  try {
    const clothes = await Fashion.find().sort({ _id: -1 });
    res.render('admin', { clothes });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Upload Item
// POST: Upload New Fashion Item
app.post('/admin', upload.single('image'), async (req, res) => {
  try {
    // 1. DEBUG: Log everything
    console.log('Form Data:', req.body);
    console.log('Uploaded File:', req.file);

    // 2. CHECK IF FILE WAS UPLOADED
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).send(`
        <div style="padding:20px; font-family:Arial; text-align:center;">
          <h3 style="color:red;">No Image Selected</h3>
          <p>Please choose an image to upload.</p>
          <a href="/admin" style="color:#007bff;">Go Back</a>
        </div>
      `);
    }

    // 3. CHECK TITLE & PRICE
    const { title, price } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).send(`
        <div style="padding:20px; font-family:Arial; text-align:center;">
          <h3 style="color:red;">Title Required</h3>
          <p>Please enter a title for the item.</p>
          <a href="/admin" style="color:#007bff;">Go Back</a>
        </div>
      `);
    }

    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).send(`
        <div style="padding:20px; font-family:Arial; text-align:center;">
          <h3 style="color:red;">Valid Price Required</h3>
          <p>Price must be a positive number.</p>
          <a href="/admin" style="color:#007bff;">Go Back</a>
        </div>
      `);
    }

    // 4. SAVE TO DATABASE
    const newItem = new Fashion({
      title: title.trim(),
      price: parseFloat(price),
      imageUrl: req.file.path,        // Cloudinary URL
      cloudinaryId: req.file.filename // For deletion
    });

    await newItem.save();
    console.log('Item Saved:', newItem);

    // 5. SUCCESS: Redirect with flash message (optional)
    // Or just redirect
    res.redirect('/admin');

  } catch (err) {
    // 6. CATCH ALL ERRORS
    console.error('Upload Failed:', err.message || err);

    res.status(500).send(`
      <div style="padding:20px; font-family:Arial; text-align:center; color:#721c24; background:#f8d7da; border:1px solid #f5c6cb; border-radius:8px; margin:20px;">
        <h3>Upload Failed</h3>
        <p><strong>Error:</strong> ${err.message || 'Unknown error'}</p>
        <p>Please try again. If the problem continues, check your Cloudinary keys.</p>
        <a href="/admin" style="color:#007bff; font-weight:bold;">Go Back</a>
      </div>
    `);
  }
});

// Delete Item
app.get('/delete/:id', async (req, res) => {
  try {
    const item = await Fashion.findById(req.params.id);
    if (!item) return res.redirect('/admin');

    await cloudinary.uploader.destroy(item.cloudinaryId);
    await Fashion.deleteOne({ _id: item._id });
    res.redirect('/admin');
  } catch (err) {
    console.error('Delete Error:', err);
    res.redirect('/admin');
  }
});

// 404
app.use((req, res) => {
  res.status(404).send('Page Not Found');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});