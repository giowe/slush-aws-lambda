'use strict';

var gulp = require('gulp');
var connect = require('gulp-connect');
var jade = require('gulp-jade');
var stylus = require('gulp-stylus');
var using = require('gulp-using');
var zip = require('gulp-zip');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var minifyHTML = require('gulp-minify-html');
var gcallback = require('gulp-callback');
var argv = require('yargs').argv;
var del = require('del');
var fs = require('fs');
var AWS = require('aws-sdk');
var pkg = require('./package.json');

/**
 * Elimina la cartella dei raw se non specificato alcun parametro
 * --dist: elimina le cartelle dist
 * --all: elimina le cartelle dist e raw
 */
gulp.task('clean', function () {
    if (argv.all) {
        del(['dist', 'raw'], {force:true});
    }
    else {
        del.sync(argv.dist ? 'dist' : 'raw', {force:true});
    }
});

/**
 * compila il jade
 */
gulp.task('jade', function () {
    return gulp.src('src/views/pages/*.jade')
        .pipe(jade())
        .pipe(gulp.dest(argv.dist ? 'dist/' : 'raw/'))
        .pipe(connect.reload())
        .pipe(using());
});

/**
 * minifizza l'html renderizzato
 */
gulp.task('minify-html', ['jade'], function(){
    gulp.src('./static/html/*.html')
        .pipe(minifyHTML())
        .pipe(gulp.dest('dist/'))
        .pipe(using());
});

/**
 * compila lo stylus aggiungendo la sourcemap inline e linenos (solo per il raw)
 * --dist: viene anche minifizzato
 */
gulp.task('stylus', function () {
    var params = { 'include css' : true };
    var dest;
    if (argv.dist) {
        dest = 'dist';
        params.compress = true;
    }
    else {
        dest = 'raw';
        params.linenos = true;
    }

    gulp.src('src/styles/*.styl')
        .pipe(sourcemaps.init())
        .pipe(stylus(params))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(dest+'/public/styles'))
        .pipe(connect.reload())
        .pipe(using());
});

/**
 *
 */
gulp.task('js', function () {
    console.log('ciao');
});

/**
 * costruisce la soluzione
 */
gulp.task('build', function(){
    if (argv.dist) {
        gulp.start(['clean', 'stylus', 'jade', 'minify-html']);
    }
    else {
        gulp.start(['clean', 'stylus', 'jade']);
    }
});

/**
 * attiva i watcher di jade, stylus e js
 */
gulp.task('watch', function () {
    gulp.watch(['src/views/**/*.jade'], ['jade']);
    gulp.watch(['src/styles/**/*.styl'], ['stylus']);
});

/**
 * crea il webserver
 */
gulp.task('connect', ['build'], function() {
    connect.server({
        root: argv.dist ? 'dist/' : 'raw/',
        port: argv.port ? argv.port : 8080,
        livereload: true,

        fallback: argv.dist ? 'dist/home.html' : 'raw/home.html'
    });
});

/**
 * crea il pacchetto zip dei dist
 */
gulp.task("zip", function(next){
    argv.dist = true;
    gulp.start('build')

            gcallback(function(){console.log('ciao')})
        //console.log('cioa');
        //gulp.src("dist/**/*")
        //    .pipe(zip(pkg.name+'.zip'))
        //    .pipe(gulp.dest('dist'))
        //    .pipe(gcallback(function(){console.log('ciao')}));
});

/**
 * carica il pacchetto zip dei dist sul suo bucket di s3
 */
gulp.task("upload", ["zip"], function(){
    var s3 = new AWS.S3();
    var params = {
        Bucket: 'sf-dist',
        Key:/* pkg.name + '/' +*/ pkg.name + '.zip',
        Body: fs.createReadStream('dist/' + pkg.name + '.zip')
    };

    s3.upload(params, function(err, data) {
        console.log(err, data);
    });
});

gulp.task('default', ['connect', 'watch']);