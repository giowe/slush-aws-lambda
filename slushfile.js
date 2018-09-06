/* eslint-disable no-console */
const clc = require("cli-color")
const gulp = require("gulp")
const install = require("gulp-install")
const replace = require("gulp-replace")
const rename = require("gulp-rename")
const inquirer = require("inquirer")
const del = require("del")
const { mkdirSync, writeFileSync } = require("fs")
const { join } = require("path")

gulp.task("default", done => {
  const defaultsPath = join(__dirname, "userDefaults.json")
  let userDefaults
  try {
    userDefaults = require(defaultsPath)
  } catch(ignore) {
    userDefaults = {
      license: "MIT",
      repoType: "git"
    }
  }

  inquirer.prompt([
    { type: "input", name: "name", message: "Project name:", default: "test-lambda" },
    { type: "input", name: "version", message: "Project version:", default: "0.0.0" },
    { type: "input", name: "description", message: "Project description:" },
    { type: "input", name: "authorName", message: "Project author name:", default: userDefaults.authorName },
    { type: "input", name: "authorEmail", message: "Project author email:", default: userDefaults.authorEmail },
    { type: "input", name: "repoType", message: "Project repo type:", default: userDefaults.repoType },
    { type: "input", name: "repoUrl", message: "Project repo url:" },
    { type: "input", name: "license", message: "Project license:", default: userDefaults.license }
  ]).then(answers => {
    userDefaults = ["authorName", "authorEmail", "repoType", "license"].reduce((acc, key) => {
      acc[key] = answers[key]
      return acc
    }, {})

    writeFileSync(defaultsPath, JSON.stringify(userDefaults, null, 2))

    const projectFolder = answers.name

    const _template = src => {
      return Object.entries(answers).reduce((acc, [key, value]) => {
        const regex = new RegExp(`%${key}%`, "g")
        acc.pipe(replace(regex, value))
        return acc
      }, gulp.src(src))
    }

    const _scaffold = () => {
      mkdirSync(projectFolder)
      ;["src", "utils"].forEach(folder => mkdirSync(join(projectFolder, folder)))

      gulp.src([
        join(__dirname, "templates/.editorconfig"),
        join(__dirname, "templates/.eslintrc"),
        join(__dirname, "templates/test-payload.json")
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

      gulp.src(join(__dirname, "templates/utils/**/*"))
        .pipe(gulp.dest(join(projectFolder, "utils")))

      _template(join(__dirname, "templates/package.json"))
        .pipe(gulp.dest(projectFolder)).pipe(install())

      _template(join(__dirname, "templates/src/package.json"))
        .pipe(gulp.dest(join(projectFolder, "src")))

      _template(join(__dirname, "templates/README.md"))
        .pipe(gulp.dest(projectFolder))

      done()
    }

    try {
      _scaffold()
    } catch(err) {
      console.log(err)
      console.log(`${clc.red("!")} ${clc.cyan(answers.name)} folder already exists!`)
      inquirer.prompt({ type: "confirm", name: "confirm", message: "Do you want to delete it and continue with the new project?:", default: false })
        .then(({ confirm }) => {
          if (confirm){
            del.sync(answers.name, { force:true })
            _scaffold()
          }
          else {
            console.log(`${clc.red("!")} Scaffolding process aborted.`)
          }
        })
    }
  })
    .catch(console.log)
})
