/*
 * slush-aws-lambda
 * https://github.com/giowe/slush-aws-lambda
 *
 * Copyright (c) 2016, Giovanni Bruno
 * Licensed under the MIT license.
 */

'use strict';
require('colors');
const gulp     = require('gulp');
const install  = require('gulp-install');
const replace  = require('gulp-replace');
const rename   = require('gulp-rename');
const inquirer = require('inquirer');
const del      = require('del');
const fs       = require('fs');
const path     = require('path');

gulp.task('default', function(done) {
  console.log('default tast');
  try {
    var userDefaults = require('./user_defaults.json');
  } catch(err) {
    userDefaults = null;
  }

  inquirer.prompt([
    {type: 'input', name: 'project_name', message: 'Project name:', default: 'test-lambda'},
    {type: 'input', name: 'project_version', message: 'Project version:', default: '0.0.0'},
    {type: 'input', name: 'project_description', message: 'Project description:'},
    {type: 'input', name: 'project_author_name', message: 'Project author name:', default: userDefaults? userDefaults.project_author_name:null},
    {type: 'input', name: 'project_author_email', message: 'Project author email:', default: userDefaults? userDefaults.project_author_email : null},
    {type: 'input', name: 'project_repo_type', message: 'Project repo type:', default: userDefaults? userDefaults.project_repo_type : 'git'},
    {type: 'input', name: 'project_repo_url', message: 'Project repo url:'},
    {type: 'input', name: 'project_license', message: 'Project license:', default: userDefaults? userDefaults.project_license : 'MIT'}
  ]).then(
    function (answers) {
      userDefaults = {
        project_author_name : answers.project_author_name,
        project_author_email : answers.project_author_email,
        project_repo_type : answers.project_repo_type,
        project_license : answers.project_license
      };

      fs.writeFile(path.join(__dirname, '/user_defaults.json'), JSON.stringify(userDefaults, null, 4), function(err) {
        if(err) console.log(err.red);
      });

      var projectFolder = answers.project_name;
      var folders = [
        'src'
      ];

      function scaffold() {
        fs.mkdirSync(projectFolder);
        for (var i = 0; i < folders.length; i++) {
          fs.mkdirSync(path.join(projectFolder, folders[i]));
        }

        gulp.src(path.join(__dirname, 'templates/.template-gitignore'))
          .pipe(rename({basename:".gitignore"}))
          .pipe(gulp.dest(projectFolder));
        gulp.src(path.join(__dirname, 'templates/*.js'))
          .pipe(gulp.dest(projectFolder));

        gulp.src([
          path.join(__dirname, 'templates/src/**/*'),
          path.join(`!${__dirname}`, 'templates/src/package.json')
        ])
          .pipe(gulp.dest(path.join(projectFolder, 'src')));

        gulp.src(path.join(__dirname, 'templates/package.json'))
          .pipe(replace(/%name%/g, answers.project_name))
          .pipe(replace(/%version%/g, answers.project_version))
          .pipe(replace(/%description%/g, answers.project_description))
          .pipe(replace(/%author_name%/g, answers.project_author_name))
          .pipe(replace(/%author_email%/g, answers.project_author_email))
          .pipe(replace(/%repoType%/g, answers.project_repo_type))
          .pipe(replace(/%repoUrl%/g, answers.project_repo_url))
          .pipe(replace(/%license%/g, answers.project_license))
          .pipe(gulp.dest(projectFolder)).pipe(install());

        gulp.src(path.join(__dirname, '/templates/src/package.json'))
          .pipe(replace(/%author_name%/g, answers.project_author_name))
          .pipe(replace(/%author_email%/g, answers.project_author_email))
          .pipe(gulp.dest(path.join(projectFolder, 'src')));

        gulp.src(path.join(__dirname, '/templates/README.MD'))
          .pipe(replace(/%name%/g, answers.project_name))
          .pipe(gulp.dest(projectFolder));
      }

      try {
        scaffold();
      } catch(err) {
        console.log(err);

        console.log(`${'!'.red} ${answers.project_name.cyan} folder already exists!`);
        inquirer.prompt({ type: "confirm", name: 'delete_folder', message: 'Do you want to delete it and continue with the new project?:', default: false}, function(delete_answer){
          if (delete_answer.delete_folder){
            del.sync(answers.project_name, {force:true});
            scaffold();
          }
          else {
            console.log(`${'!'.red} Scaffolding process aborted.`);
          }
        })
      }
    });
});
