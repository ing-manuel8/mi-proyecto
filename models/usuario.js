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
  },
  // Agregar referencia al administrador
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', // Hace referencia al modelo Admin
    required: true
  }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);

module.exports = Usuario;
