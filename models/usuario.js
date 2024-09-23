const mongoose = require('mongoose');

// Definir el esquema de usuario
const UsuarioSchema = new mongoose.Schema({
  nombre: String,
  imagen: String,
  password: String
});

// Exportar el modelo Usuario
module.exports = mongoose.model('Usuario', UsuarioSchema);
