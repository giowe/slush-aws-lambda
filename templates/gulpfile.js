'use strict';

require('colors');
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
    del = require('del'),
    fs = require('fs'),
    AWS = require('aws-sdk');

var pakage = require('./package.json');

gulp.task('clean', function () {
    del.sync('dist', {force:true});
});

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

gulp.task('js', function () {
    gulp.src([
        'src/public/scripts/vendor/*.js',
        /* PLACE HERE THE LINKS OF ALL VENDOR'S SCRIPTS THAT ARE NOT IN VENDOR FOLDER (EX. INSTALLED VIA NPM) */
        'src/public/scripts/*.js',
        '!src/public/scripts/**/_*.js'
    ])
        .pipe(sourcemaps.init())
        .pipe(concat('scripts.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/public/'));
});

gulp.task('build',['clean', 'stylus', 'jade', 'js']);

gulp.task('watch', function () {
    gulp.watch(['src/views/**/*.jade'], ['jade']);
    gulp.watch(['src/styles/**/*.styl'], ['stylus']);
    gulp.watch(['src/scripts/**/*.js'], ['js']);
});

gulp.task("zip", ['build'], function(){
    return gulp.src("dist/**/*")
        .pipe(zip(pakage.name+'.zip'))
        .pipe(gulp.dest('dist'));
});

gulp.task("upload", ["zip"], function(){
    var s3 = new AWS.S3(),
        params = {
            Bucket: 'sf-dist',
            Key: pakage.name + '/' + pakage.name + '.zip',
            Body: fs.createReadStream('dist/' + pakage.name + '.zip')
        };

    s3.upload(params, function(err, data) {
        if (err) {
            console.log('['+ 'gulp'.red +']', 'Upload filed with error:',  err);
        } else {
            console.log('['+ 'gulp'.green +']', (pakage.name + '.zip').cyan, 'succesfully uploaded to Aws S3 buket', params.Bucket.cyan, 'in the following location:', data.Location.cyan);
        }
    });
});

gulp.task('connect', ['build'], function() {
    connect.server({
        root: 'dist/',
        port: pakage.custom.port ? pakage.custom.port : 8080,
        livereload: true,
        fallback: 'dist/home.html'
    });
});

gulp.task('default', ['connect', 'watch']);