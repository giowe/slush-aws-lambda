/* eslint-disable no-console */
const clc = require("cli-color")
const { join } = require("path")
const { env = "staging" } = require("simple-argv")


module.exports = next => {
  let lambdaConfig
  try {
    lambdaConfig = require(join(__dirname, "..", "lambda-config.js"))(env)
  } catch (err) {
    if (err.message.indexOf("Cannot find module") !== -1) {
      throw new Error(`WARNING! lambda config not found, run command ${clc.cyan("gulp configure")}`)
    } else {
      throw err
    }
  }
  const { Handler, Environment } = lambdaConfig.ConfigOptions

  let payload
  try {
    payload = require(join(__dirname, "..", "test-payload.js"))
  } catch (err) {
    if (err.message.indexOf("Cannot find module") !== -1) {
      throw new Error("WARNING! \"test-payload.js\" not found!")
    } else {
      throw err
    }
  }

  const fail = err => {
    console.log({ errorMessage: err })
    next(err)
    process.exit()
  }

  const succeed = data => {
    if(data) console.log(data)
    next()
    process.exit()
  }

  const done = (err, data) => {
    if (err) fail(err)
    else succeed(data)
    next()
    process.exit()
  }

  const callback = (err, data) => {
    if (err) return fail(err)
    succeed(data)
  }

  const handler = Handler.split(".")
  if (Environment && Environment.Variables) {
    Object.assign(process.env, Environment.Variables)
  }
  const lambda = require(join(__dirname, "src", handler[0]))[handler[1]]

  lambda(payload, { fail, succeed, done }, callback)
}
