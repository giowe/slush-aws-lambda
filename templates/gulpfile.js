'use strict';

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    plumber = require('gulp-plumber'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    browsersync  = require('browser-sync'),
    jade = require('gulp-jade'),
    minifyHTML = require('gulp-minify-html'),
    stylus = require('gulp-stylus'),
    autoprefixer = require('autoprefixer-stylus'),
    uglifycss = require('gulp-uglifycss'),
    sourcemaps = require('gulp-sourcemaps'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    argv = require('yargs').argv,
    ifElse = require('gulp-if-else'),
    zip = require('gulp-zip'),
    del = require('del'),
    fs = require('fs'),
    AWS = require('aws-sdk');

var npmPackage = require('./package.json');

if (argv.pretty) gutil.log(gutil.colors.bgMagenta('Pretty mode ON. All files will not be uglified.'));

gulp.task('clean', function () {
    del.sync('dist', {force:true});
});

gulp.task('jade', function () {
    return gulp.src([
        'src/views/pages/*.jade',
        '!src/views/pages/_*.jade'
    ])
        .pipe(plumber())
        .pipe(jade({
            pretty: argv.pretty
        })).on('error', function(err){
            gutil.log(gutil.colors.dim.white(err));
        })
        .pipe(ifElse(!argv.pretty, minifyHTML))
        .pipe(plumber.stop())
        .pipe(gulp.dest('dist/'))
        .pipe(browsersync.reload({stream: true}));
});

gulp.task('stylus', function () {
    gulp.src([
        'src/styles/*.styl'
    ])
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(stylus({
            'include css': true,
            use: [autoprefixer({ browsers: ['last 3 versions', '> 5%'] })],
            compress : !argv.pretty,
            linenos : argv.pretty
        })).on('error', console.log)
        .pipe(ifElse(!argv.pretty, uglifycss))
        .pipe(sourcemaps.write('.'))
        .pipe(plumber.stop())
        .pipe(gulp.dest('dist/public/styles'))
        .pipe(browsersync.reload({stream: true}));
});

gulp.task('js', function () {
    gulp.src([
        'src/scripts/vendor/*.js',
        /* PLACE HERE THE LINKS OF ALL VENDOR'S SCRIPTS THAT ARE NOT IN VENDOR FOLDER (EX. INSTALLED VIA NPM) */
        'src/scripts/**/*.js'
    ])
        .pipe(sourcemaps.init())
        .pipe(concat('scripts.js'))
        .pipe(ifElse(!argv.pretty, uglify))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/public/scripts'))
        .pipe(browsersync.reload({stream: true}));
});

gulp.task('images', function(){
    gulp.src('src/images/**/*.*')
        .pipe(imagemin({
            optimizationLevel: 3, //png
            progressive: true,    //jpg
            intralaced: false,    //gif
            mutlipass: false,     //svg
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest('dist/public/images'));
});

gulp.task('fonts', function(){
    gulp.src('src/fonts/**/*.*')
        .pipe(gulp.dest('dist/public/fonts'));
});

gulp.task('build',['clean', 'stylus', 'jade', 'js', 'images', 'fonts']);

gulp.task('watch', function () {
    gulp.watch(['src/views/**/*.jade'], ['jade']);
    gulp.watch(['src/styles/**/*.*'], ['stylus']);
    gulp.watch(['src/scripts/**/*.js'], ['js']);
    gulp.watch(['src/images/**/*.*'], ['images']);
    gulp.watch(['src/fonts/**/*.*'], ['fonts']);
});

gulp.task("zip", ['build'], function(){
    return gulp.src("dist/**/*")
        .pipe(zip(npmPackage.name+'.zip'))
        .pipe(gulp.dest('dist'));
});

gulp.task("upload", ["zip"], function(){
    var s3 = new AWS.S3(),
        params = {
            Bucket: npmPackage.custom.s3_bucket,
            Key: npmPackage.name + '/' + npmPackage.name + '.zip',
            Body: fs.createReadStream('dist/' + npmPackage.name + '.zip')
        };

    s3.upload(params, function(err, data) {
        if (err) {
            gutil.log('Upload filed!', err);
        } else {
            gutil.log(gutil.colors.cyan(npmPackage.name + '.zip'), 'succesfully uploaded to Aws S3 buket', gutil.colors.cyan(params.Bucket), 'in the following location:', gutil.colors.cyan(data.Location));
        }
    });
});

gulp.task('serve', ['build', 'watch'], function(){
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

gulp.task('default', ['serve']);