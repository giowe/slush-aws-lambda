/* eslint-disable no-console */
const clc = require("cli-color")
const gulp = require("gulp")
const install = require("gulp-install")
const replace = require("gulp-replace")
const rename = require("gulp-rename")
const inquirer = require("inquirer")
const del = require("del")
const fs = require("fs")
const { join } = require("path")

gulp.task("default", done => {
  let userDefaults
  try {
    userDefaults = require("./userDefaults.json")
  } catch(ignore) {}

  inquirer.prompt([
    { type: "input", name: "name", message: "Project name:", default: "test-lambda" },
    { type: "input", name: "version", message: "Project version:", default: "0.0.0" },
    { type: "input", name: "description", message: "Project description:" },
    { type: "input", name: "authorName", message: "Project author name:", default: userDefaults ? userDefaults.authorName : null },
    { type: "input", name: "authorEmail", message: "Project author email:", default: userDefaults ? userDefaults.authorEmail : null },
    { type: "input", name: "repoType", message: "Project repo type:", default: userDefaults ? userDefaults.repoType : "git" },
    { type: "input", name: "repoUrl", message: "Project repo url:" },
    { type: "input", name: "license", message: "Project license:", default: userDefaults ? userDefaults.license : "MIT" }
  ]).then(answers => {
    userDefaults = ["authorName", "authorEmail", "repoType", "license"].reduce((key, acc) => {
      acc[key] =  answers[key]
      return acc
    }, {})

    fs.writeFile(join(__dirname, "/userDefaults.json"), JSON.stringify(userDefaults, null, 2), err => {
      if (err) {
        console.log(clc.red(err))
      }
    })

    const projectFolder = answers.name
    const folders = ["src"]

    const _template = src => {
      return Object.entries(answers).reduce((acc, [key, value]) => {
        const regex = new RegExp(`%${key}%`, "g")
        acc.pipe(replace(regex, value))
        return acc
      }, gulp.src(src))
    }

    const scaffold = () => {
      fs.mkdirSync(projectFolder)
      for (let i = 0; i < folders.length; i++) {
        fs.mkdirSync(join(projectFolder, folders[i]))
      }

      gulp.src([
        join(__dirname, "/templates/.editorconfig"),
        join(__dirname, "/templates/.eslintrc"),
        join(__dirname, "/templates/test-payload.json")
      ])
        .pipe(gulp.dest(projectFolder))

      gulp.src(join(__dirname, "templates/.template-gitignore"))
        .pipe(rename({ basename:".gitignore" }))
        .pipe(gulp.dest(projectFolder))

      gulp.src(join(__dirname, "templates/*.js"))
        .pipe(gulp.dest(projectFolder))

      gulp.src([
        join(__dirname, "templates/src/**/*"),
        join(`!${__dirname}`, "templates/src/package.json")
      ])
        .pipe(gulp.dest(join(projectFolder, "src")))

      _template(join(__dirname, "templates/package.json"))
        .pipe(gulp.dest(projectFolder)).pipe(install())

      _template(join(__dirname, "/templates/src/package.json"))
        .pipe(gulp.dest(join(projectFolder, "src")))

      _template(join(__dirname, "/templates/README.md"))
        .pipe(gulp.dest(projectFolder))

      done()
    }

    try {
      scaffold()
    } catch(err) {
      console.log(err)
      console.log(`${clc.red("!")} ${clc.cyan(answers.name)} folder already exists!`)
      inquirer.prompt({ type: "confirm", name: "confirm", message: "Do you want to delete it and continue with the new project?:", default: false })
        .then(({ confirm }) => {
          if (confirm){
            del.sync(answers.name, { force:true })
            scaffold()
          }
          else {
            console.log(`${clc.red("!")} Scaffolding process aborted.`)
          }
        })
    }
  })
    .catch(console.log)
})
