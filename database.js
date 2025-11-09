// database.js
const mongoose = require('mongoose');

const fashionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  cloudinaryId: { type: String, required: true }
});

module.exports = mongoose.model('Fashion', fashionSchema);