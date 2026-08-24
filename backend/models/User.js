const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Both are unique. Normalising here as well as in the controller means a
  // stray space or capital cannot create a second account for one person.
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true }, // Will store the bcrypt hash
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);