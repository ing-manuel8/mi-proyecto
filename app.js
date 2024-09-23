const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const mongoose = require('mongoose');
const Usuario = require('./models/usuario'); // Importar el modelo de usuario

const app = express();

// Conectar a MongoDB
const mongoURI = 'mongodb+srv://usuariosbase:dpu5qjgHImGUvwHV@usuario.7dqxf.mongodb.net/usuarios?retryWrites=true&w=majority';
mongoose.connect(mongoURI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Configurar el motor de vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para manejar formularios y datos en URL
app.use(express.urlencoded({ extended: true }));

// Middleware para servir archivos estáticos (CSS, imágenes, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Configurar Multer para almacenar imágenes temporalmente en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ruta para mostrar la lista de usuarios
app.get('/usuarios', async (req, res) => {
  try {
    // Obtener la lista de usuarios desde MongoDB
    const usuarios = await Usuario.find();
    res.render('usuarios', { usuarios });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).send('Error al obtener usuarios');
  }
});

// Ruta para mostrar el formulario de nuevo usuario
app.get('/usuarios/nuevo', (req, res) => {
  res.render('nuevo_usuario'); // Renderiza el formulario de nuevo usuario
});

// Ruta para manejar la subida y optimización de la imagen
app.post('/usuarios', upload.single('imagen'), async (req, res) => {
  const { nombre, password } = req.body;
  let imagenPath = '/uploads/default.png'; // Imagen por defecto

  // Si se subió una imagen
  if (req.file) {
    const uniqueName = `${Date.now()}-${req.file.originalname}`;
    const outputPath = path.join(__dirname, 'public', 'uploads', uniqueName);

    try {
      // Optimizar la imagen usando sharp
      await sharp(req.file.buffer)
        .resize(300, 300)
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      imagenPath = `/uploads/${uniqueName}`;
    } catch (err) {
      console.error('Error al optimizar la imagen:', err);
      return res.status(500).send('Error al procesar la imagen');
    }
  }

  // Insertar el nuevo usuario en la base de datos MongoDB
  try {
    await Usuario.create({ nombre, imagen: imagenPath, password });
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).send('Error al crear usuario');
  }
});

// Ruta para editar un usuario (muestra el formulario de edición)
app.get('/usuarios/editar/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);

    if (usuario) {
      res.render('editar_usuario', { usuario });
    } else {
      res.status(404).send('Usuario no encontrado');
    }
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).send('Error al obtener usuario');
  }
});

// Ruta para manejar la edición del usuario
app.post('/usuarios/editar/:id', upload.single('imagen'), async (req, res) => {
  const { nombre, password } = req.body;
  let imagenPath;

  // Si se subió una imagen nueva
  if (req.file) {
    const uniqueName = `${Date.now()}-${req.file.originalname}`;
    const outputPath = path.join(__dirname, 'public', 'uploads', uniqueName);

    try {
      await sharp(req.file.buffer)
        .resize(300, 300)
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      imagenPath = `/uploads/${uniqueName}`;
    } catch (err) {
      console.error('Error al optimizar la imagen:', err);
      return res.status(500).send('Error al procesar la imagen');
    }
  }

  // Actualizar el usuario en MongoDB
  try {
    const updateData = {
      nombre,
      password: password || undefined
    };

    if (imagenPath) {
      updateData.imagen = imagenPath;
    }

    await Usuario.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).send('Error al actualizar usuario');
  }
});

// Ruta para eliminar un usuario
app.post('/usuarios/eliminar/:id', async (req, res) => {
  try {
    await Usuario.findByIdAndDelete(req.params.id);
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).send('Error al eliminar usuario');
  }
});

// Iniciar servidor en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor en funcionamiento en http://localhost:3000');
});
