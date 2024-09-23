const mongoose = require('mongoose');

// Definir el esquema de administrador
const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = Admin;
