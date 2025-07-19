var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Blog post URL rewriting middleware
app.use('/', function(req, res, next) {
  const url = req.path;
  
  // Skip static files, API routes, and root
  if (url.startsWith('/stylesheets') || url.startsWith('/javascripts') || 
      url.startsWith('/images') || url.startsWith('/users') || url === '/' || url === '/blog') {
    return next();
  }
  
  // Remove leading slash and add .html extension
  const fileName = url.substring(1) + '.html';
  const filePath = path.join(__dirname, 'public', 'posts', fileName);
  
  // Check if HTML file exists
  if (fs.existsSync(filePath)) {
    try {
      // Read the HTML content
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      
      // Extract title from the first h1 tag
      const titleMatch = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : 'TrainerDay Blog Post';
      
      // Extract date from the date span
      const dateMatch = htmlContent.match(/<span>(\d{1,2}\/\d{1,2}\/\d{4})<\/span>/);
      const date = dateMatch ? dateMatch[1] : '';
      
      // Extract content between the blog-content div
      const contentMatch = htmlContent.match(/<div class="blog-content"[^>]*>([\s\S]*?)<\/div>/);
      const content = contentMatch ? contentMatch[1] : htmlContent;
      
      // Generate description from content
      const description = content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
      
      // Render using EJS template
      return res.render('blog-post', {
        title: title,
        date: date,
        content: content,
        description: description
      });
    } catch (error) {
      console.error('Error parsing blog post:', error);
      return res.sendFile(filePath); // Fallback to direct file serving
    }
  }
  
  // If no HTML file found, continue to next middleware
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
