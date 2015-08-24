'use strict';

var gulp = require('gulp'),
    using = require('gulp-using'),
    connect = require('gulp-connect'),
    jade = require('gulp-jade'),
    minifyHTML = require('gulp-minify-html'),
    stylus = require('gulp-stylus'),
    autoprefixer = require('autoprefixer-stylus'),
    uglifycss = require('gulp-uglifycss'),
    sourcemaps = require('gulp-sourcemaps'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    zip = require('gulp-zip'),
    gcallback = require('gulp-callback'),
    del = require('del'),
    fs = require('fs'),
    AWS = require('aws-sdk'),
    pakage = require('./package.json');

/**
 * Elimina la cartella dei raw se non specificato alcun parametro
 * --dist: elimina le cartelle dist
 * --all: elimina le cartelle dist e raw
 */
gulp.task('clean', function () {
    del.sync('dist', {force:true});
});

/**
 * compila il jade
 */
gulp.task('jade', function () {
    return gulp.src([
        'src/views/pages/*.jade',
        '!src/views/pages/_*.jade'
    ])
        .pipe(jade()).on('error', console.log)
        .pipe(minifyHTML())
        .pipe(gulp.dest('dist/'))
        .pipe(connect.reload())
        .pipe(using());
});

/**
 * compila lo stylus aggiungendo la sourcemap inline e linenos (solo per il raw)
 * --dist: viene anche minifizzato
 */
gulp.task('stylus', function () {
    gulp.src([
        'src/styles/*.styl',
        '!src/styles/_*.styl'
    ])
        .pipe(sourcemaps.init())
        .pipe(stylus({
            'include css': true,
            use: [autoprefixer()],
            compress : true
        })).on('error', console.log)
        .pipe(uglifycss())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/public/styles'))
        .pipe(connect.reload())
        .pipe(using());
});

/**
 *
 */
gulp.task('js', function () {
    gulp.src([
        'src/public/scripts/**/*.js',
        '!src/public/scripts/**/_*.js'
    ])
        .pipe(sourcemaps.init())
        .pipe(concat('scripts.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/public/'));
});

/**
 * costruisce la soluzione
 */
gulp.task('build', function(){
    gulp.start(['clean', 'stylus', 'jade', 'js']);
});

/**
 * attiva i watcher di jade, stylus e js
 */
gulp.task('watch', function () {
    gulp.watch(['src/views/**/*.jade'], ['jade']);
    gulp.watch(['src/styles/**/*.styl'], ['stylus']);
    gulp.watch(['src/scripts/*.js'], ['js']);
});

/**
 * crea il webserver
 */
gulp.task('connect', ['build'], function() {
    connect.server({
        root: 'dist/',
        port: pakage.custom.port ? pakage.custom.port : 8080,
        livereload: true,
        fallback: 'dist/home.html'
    });
});

/**
 * crea il pacchetto zip dei dist
 */
gulp.task("zip", function(next){
    gulp.start('build')

            gcallback(function(){console.log('ciao')})
        //console.log('cioa');
        //gulp.src("dist/**/*")
        //    .pipe(zip(pakage.name+'.zip'))
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
        Key:/* pakage.name + '/' +*/ pakage.name + '.zip',
        Body: fs.createReadStream('dist/' + pakage.name + '.zip')
    };

    s3.upload(params, function(err, data) {
        console.log(err, data);
    });
});

gulp.task('default', ['connect', 'watch']);
