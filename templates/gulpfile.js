'use strict';

var gulp = require('gulp-help')(require('gulp')),
    pngquant = require('imagemin-pngquant'),
    browsersync  = require('browser-sync'),
    autoprefixer = require('autoprefixer-stylus'),
    argv = require('yargs').argv,
    del = require('del'),
    fs = require('fs'),
    path = require('path'),
    AWS = require('aws-sdk');

var $ = require('gulp-load-plugins')({
  lazy: true,
  scope: ['devDependencies'],
  rename: {
    'gulp-if-else': 'ifElse',
    'gulp-minify-html': 'minifyHTML'
  }
});

var npmPackage = require('./package.json');

if (argv.pretty) $.util.log($.util.colors.bgMagenta('Pretty mode ON. All files will not be uglified.'));

gulp.task('clean', 'Cleans your dist/ folder', function () {
    del.sync('dist', {force:true});
});

gulp.task('jade', 'Compiles and minifies your jade views', function () {
    return gulp.src([
        'src/views/pages/*.jade',
        '!src/views/pages/_*.jade'
    ])
        .pipe($.plumber())
        .pipe($.data(function(file) {
            return { page: (path.parse(file.path)).name}
        }))
        .pipe($.jade({
            pretty: argv.pretty
        })).on('error', function(err){ $.util.log($.util.colors.dim.white(err)); })
        .pipe($.ifElse(!argv.pretty, function(){return $.minifyHTML({
            conditionals: true,
            quotes:true
        })}))
        .pipe($.plumber.stop())
        .pipe($.size())
        .pipe(gulp.dest('dist/'))
        .pipe(browsersync.reload({stream: true}));
});

gulp.task('stylus', 'Compiles and optimize your Stylus structure', function () {
    return gulp.src([
        'src/styles/*.styl'
    ])
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.stylus({
            'include css': true,
            use: [autoprefixer({ browsers: ['last 3 versions', '> 5%'] })],
            compress : !argv.pretty,
            linenos : argv.pretty
        })).on('error', function(err){ $.util.log($.util.colors.dim.white(err)); })
        .pipe($.ifElse(!argv.pretty, $.uglifycss))
        .pipe($.sourcemaps.write('.'))
        .pipe($.plumber.stop())
        .pipe($.size())
        .pipe(gulp.dest('dist/public/styles'))
        .pipe(browsersync.reload({stream: true}));
});

gulp.task('js', 'Minifies your javascript into a single, concatenated file for all js files that non have the "_" char as a prefix. All js prefixed with "_" char are minified and copied to the dist folder as separated files.', function () {
    gulp.src([
        '!src/scripts/**/_*.js',
        'src/scripts/vendor/*.js',
        'src/scripts/**/*.js'
        /* PLACE HERE THE LINKS OF ALL VENDOR'S SCRIPTS THAT ARE NOT IN VENDOR FOLDER (EX. INSTALLED VIA NPM) */
    ])
        .pipe($.ifElse(argv.pretty, function(){$.sourcemaps.init()}))
        .pipe($.concat('scripts.js'))
        .pipe($.ifElse(!argv.pretty, $.uglify))
        .pipe($.ifElse(argv.pretty, function(){$.sourcemaps.write('.')}))
        .pipe($.size())
        .pipe(gulp.dest('dist/public/scripts'))
        .pipe(browsersync.reload({stream: true}));

    gulp.src([
        'src/scripts/**/_*.js'
    ])
        .pipe($.ifElse(!argv.pretty, $.uglify))
        .pipe($.size())
        .pipe(gulp.dest('dist/public/scripts'))
        .pipe(browsersync.reload({stream: true}));

});

gulp.task('images', 'Optimize your images: png, jpg, gif and svg', function(){
    return gulp.src('src/images/**/*.*')
        .pipe($.imagemin({
            optimizationLevel: 3, //png
            progressive: true,    //jpg
            intralaced: false,    //gif
            mutlipass: false,     //svg
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe($.size())
        .pipe(gulp.dest('dist/public/images'));
});

gulp.task('fonts', 'Moves your fonts to the dist/ folder', function(){
    gulp.src('src/fonts/**/*.*')
        .pipe(gulp.dest('dist/public/fonts'));
});

gulp.task('build', 'Build task, calls:', ['clean', 'stylus', 'jade', 'js', 'fonts', 'images']);

gulp.task('watch', 'Watch for changes on your project files', function () {
    gulp.watch(['src/views/**/*.jade'], ['jade']);
    gulp.watch(['src/styles/**/*.*'], ['stylus']);
    gulp.watch(['src/scripts/**/*.js'], ['js']);
    gulp.watch(['src/images/**/*.*'], ['images']);
    gulp.watch(['src/fonts/**/*.*'], ['fonts']);
});

gulp.task("zip", 'zip your dist/ folder, calls:', ['build'], function(){
    return gulp.src("dist/**/*")
        .pipe($.zip(npmPackage.name+'.zip'))
        .pipe($.size())
        .pipe(gulp.dest('dist'));
});

gulp.task("upload", 'Upload your project on AWS, calls:', ["zip"], function(){
    var s3 = new AWS.S3(),
        params = {
            Bucket: npmPackage.custom.s3_bucket,
            Key: npmPackage.name + '/' + npmPackage.name + '.zip',
            Body: fs.createReadStream('dist/' + npmPackage.name + '.zip')
        };

    s3.upload(params, function(err, data) {
        if (err) {
            $.util.log('Upload filed!', err);
        } else {
            $.util.log($.util.colors.cyan(npmPackage.name + '.zip'), 'succesfully uploaded to Aws S3 buket', $.util.colors.cyan(params.Bucket), 'in the following location:', $.util.colors.cyan(data.Location));
        }
    });
});

gulp.task('serve', 'Build a web server and live-reload on change, calls:', ['build', 'watch'], function(){
    browsersync.init(null, {
        server: {
            baseDir: 'dist/',
            index: "index.html"
        },
        logPrefix: npmPackage.name,
        open: true,
        notify: false,
        port: npmPackage.custom.port ? npmPackage.custom.port : 8080
    });
});

gulp.task('default', 'Default Task, calls:', ['serve']);
