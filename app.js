const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const session = require('express-session');
const Usuario = require('./models/usuario'); // Importar el modelo de usuario
const Admin = require('./models/admin'); // Importar el modelo de admin

const app = express();

// Conectar a MongoDB
const mongoURI = process.env.MONGO_URI;
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

// Configuración del middleware de sesión
app.use(session({
  secret: 'mi-secreto-super-seguro', // Cambia esto por una clave secreta fuerte
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Cambia a true si usas HTTPS
}));

// Configurar Multer para almacenar imágenes temporalmente en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next(); // Continuar si está autenticado
  } else {
    res.redirect('/login'); // Redirigir al login si no está autenticado
  }
}

// Ruta para mostrar el formulario de inicio de sesión
app.get('/login', (req, res) => {
  res.render('login'); // Renderiza la vista de login
});

// Ruta para manejar el inicio de sesión
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Buscar al administrador en la base de datos
    const admin = await Admin.findOne({ username });

    if (admin && admin.password === password) {
      req.session.isAuthenticated = true;
      req.session.adminId = admin._id; // Almacenar el ID del administrador en la sesión
      res.redirect('/usuarios'); // Redirigir a la página de usuarios
    } else {
      res.status(401).send('Credenciales incorrectas');
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).send('Error al iniciar sesión');
  }
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy(); // Destruir la sesión
  res.redirect('/login'); // Redirigir al login
});

// Ruta para mostrar la lista de usuarios, solo si está autenticado
app.get('/usuarios', isAuthenticated, async (req, res) => {
  try {
    // Obtener los usuarios asociados al administrador autenticado
    const usuarios = await Usuario.find({ admin: req.session.adminId }); // Filtrar por administrador
    res.render('usuarios', { usuarios });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).send('Error al obtener usuarios');
  }
});

// Ruta para mostrar el formulario de nuevo usuario
app.get('/usuarios/nuevo', isAuthenticated, (req, res) => {
  res.render('nuevo_usuario'); // Renderiza el formulario de nuevo usuario
});

// Ruta para manejar la subida y optimización de la imagen, y crear un nuevo usuario
app.post('/usuarios', isAuthenticated, upload.single('imagen'), async (req, res) => {
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

  // Insertar el nuevo usuario en la base de datos MongoDB, asociado al administrador autenticado
  try {
    await Usuario.create({
      nombre,
      imagen: imagenPath,
      password,
      admin: req.session.adminId // Asociar al administrador autenticado
    });
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).send('Error al crear usuario');
  }
});

// Ruta para editar un usuario (muestra el formulario de edición)
app.get('/usuarios/editar/:id', isAuthenticated, async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ _id: req.params.id, admin: req.session.adminId }); // Verificar que el usuario pertenezca al administrador

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
app.post('/usuarios/editar/:id', isAuthenticated, upload.single('imagen'), async (req, res) => {
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

    await Usuario.findOneAndUpdate({ _id: req.params.id, admin: req.session.adminId }, updateData); // Asegurar que el administrador solo edite sus usuarios
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).send('Error al actualizar usuario');
  }
});

// Ruta para eliminar un usuario
app.post('/usuarios/eliminar/:id', isAuthenticated, async (req, res) => {
  try {
    // Solo eliminar si el usuario pertenece al administrador autenticado
    await Usuario.findOneAndDelete({ _id: req.params.id, admin: req.session.adminId });
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).send('Error al eliminar usuario');
  }
});

// Redirigir la raíz (/) a la página de inicio de sesión
app.get('/', (req, res) => {
  res.redirect('/login');
});


// Iniciar servidor en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor en funcionamiento en http://localhost:3000');
});
