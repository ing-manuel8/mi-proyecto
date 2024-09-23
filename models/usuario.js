const mongoose = require('mongoose');

// Definir el esquema de usuario
const UsuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  imagen: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);

module.exports = Usuario;
