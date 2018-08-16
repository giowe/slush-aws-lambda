const clc = require("cli-color")
const zipdir = require("zip-dir")
const gulp = require("gulp")
const usage = require("gulp-help-doc")
const install = require("gulp-install")
const fs = require("fs")
const path = require("path")
const inquirer = require("inquirer")
const AWS = require("aws-sdk")
const CwLogs = require("aws-cwlogs")
const { env = "staging" } = require("simple-argv")

const getLambdaConfig = (() => {
  let lambdaConfig
  return () => {
    if (!lambdaConfig) {
      try {
        lambdaConfig = require(path.join(__dirname, "lambda-config.js"))(env)
        console.log(`Using ${env === "production" ? clc.yellow(env) : clc.green(env)} lambda-config.js`)
      } catch (err) {
        if (err.message.indexOf("Cannot find module") !== -1) {
          throw new Error(`WARNING! lambda config not found, run command ${clc.cyan("gulp configure")}`)
        } else {
          throw err
        }
      }
    }
    return lambdaConfig
  }
})()

let credentials
try {
  credentials = require(path.join(__dirname, ".credentials.json"))
} catch(ignore) {
  console.log("project specific AWS credentials not found, using global credentials; run \"gulp credentials\" to setup project specific credentials;")
}

/**
 * List all gulp tasks and their descriptions;
 * @task {help}
 * @order {0}
 */
gulp.task("help", () => usage(gulp))

gulp.task("default", ["help"])

/**
 * Set-up all settings of your AWS Lambda;
 * @task {credentials}
 * @order {1}
 */
gulp.task("credentials", () => {
  if (!credentials) credentials = {}
  const obfuscate = (str) => typeof str === "string" ? str.split("").map((char, i) => i < str.length - 4 ? "*" : char).join("") : ""
  return inquirer.prompt([
    { type: "input", name: "accessKeyId", message: `AWS Access Key ID [${obfuscate(credentials.accessKeyId)}]:` },
    { type: "input", name: "secretAccessKey", message: `AWS Secret Access Key [${obfuscate(credentials.secretAccessKey)}]:` }
  ])
    .then(({ accessKeyId, secretAccessKey }) => {
      if (accessKeyId) credentials.accessKeyId = accessKeyId
      if (secretAccessKey) credentials.secretAccessKey = secretAccessKey

      fs.writeFileSync(path.join(__dirname, ".credentials.json"), JSON.stringify(credentials, null, 2))
    })
    .catch(console.log)
})

/**
 * Set-up all settings of your AWS Lambda;
 * @task {configure}
 * @order {2}
 */
gulp.task("configure", next => {
  let lambdaConfig
  try {
    lambdaConfig = getLambdaConfig()
  } catch(_) {}

  inquirer.prompt([
    { type: "input", name: "FunctionName", message: "Function name:", default: lambdaConfig ? lambdaConfig.ConfigOptions.FunctionName : "my-lambda-${env}" },
    { type: "input", name: "Region", message: "Region:",  default: lambdaConfig ? lambdaConfig.Region : "eu-west-1" },
    { type: "input", name: "Description", message: "Description:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.Description : null },
    { type: "input", name: "Role", message: "Role arn:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.Role : null },
    { type: "input", name: "Handler", message: "Handler:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.Handler : "index.handler" },
    { type: "input", name: "MemorySize", message: "MemorySize:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.MemorySize : "128" },
    { type: "input", name: "Timeout", message: "Timeout:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.Timeout : "3" },
    { type: "input", name: "Runtime", message: "Runtime:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.Runtime : "nodejs8.10" }
  ]).then(config_answers => {
    const lambdaConfigFile =
`module.exports = env => ({
  Region: '${config_answers.Region}',
  ConfigOptions: {
    FunctionName: \`${config_answers.FunctionName}\`,
    Description: '${config_answers.Description}',
    Role: '${config_answers.Role}',
    Handler: '${config_answers.Handler}',
    MemorySize: ${config_answers.MemorySize},
    Timeout: ${config_answers.Timeout},
    Runtime: '${config_answers.Runtime}',
    Environment: {
      Variables: {
        NODE_ENV: env
      }
    }
  }
});`
    const lambdaPackage = require(path.join(__dirname, "src/package.json"))
    lambdaPackage.name = config_answers.FunctionName
    lambdaPackage.description = config_answers.Description
    fs.writeFileSync(path.join(__dirname, "/src/package.json"), JSON.stringify(lambdaPackage, null, 2))
    fs.writeFileSync(path.join(__dirname, "/lambda-config.js"), lambdaConfigFile)
    console.log(clc.green("Lambda configuration saved"))
    next()
  })
    .catch(console.log)
})

/**
 *  Installs npm packages inside the src folder
 *  @task {install}
 *  @order {3}
 */
gulp.task("install", () => {
  return gulp.src(path.join(__dirname, "src/package.json"))
    .pipe(install())
})

/**
 *  Wraps everything inside the src folder in a zip file and uploads
 *  it to AWS to create your new AWS Lambda using the configuration
 *  information you set in the lambda_config.json file;
 *  @task {create}
 *  @order {4}
 */
gulp.task("create", next => {
  zipdir(path.join(__dirname, "src"), (err, ZipFile) => {
    const { ConfigOptions, Region: region } = getLambdaConfig()

    if (err) return console.log(clc.red("FAILED"), "-", clc.red(err))
    const params = ConfigOptions
    const lambda = new AWS.Lambda({ credentials, region })
    params.Code = { ZipFile }

    lambda.createFunction(params, (err, data) => {
      if (err){
        console.log(clc.red("FAILED"), "-", clc.red(err.message))
        console.log(err)
      }
      else console.log(clc.green("SUCCESS"), "- lambda", clc.cyan(data.FunctionName), "created")
      next()
    })
  })
})

/**
 *  Wraps everything inside the src folder in a zip file and uploads
 *  it to AWS to update your existing AWS Lambda using the configuration
 *  information you set in the lambda-config.json file;
 *  @task {update}
 *  @order {5}
 */
gulp.task("update", ["update-config", "update-code"])

/**
 *  Wraps everything inside the src folder in a zip file and uploads
 *  it to AWS to update the code of your existing AWS Lambda;
 *  @task {update-code}
 *  @order {6}
 */
gulp.task("update-code", next => {
  zipdir(path.join(__dirname, "src"), (err, ZipFile) => {
    if (err) return console.log(clc.red("FAILED"), "-", clc.red(err))
    const { Region: region, ConfigOptions: { FunctionName } } = getLambdaConfig()
    const lambda = new AWS.Lambda({ credentials, region })
    lambda.updateFunctionCode({ FunctionName, ZipFile }).promise()
      .then(data => {
        console.log(clc.green("SUCCESS"), "- lambda", clc.cyan(data.FunctionName), "code updated")
        console.log(data)
        next()
      })
      .catch(err => {
        console.log(clc.red("FAILED"), "-", clc.red(err.message))
        next(err)
      })
  })
})

/**
 *  Changes your AWS Lambda configuration using the information
 *  you set in the lambda-config.json file;
 *  @task {update-config}
 *  @order {7}
 */
gulp.task("update-config", next => {
  const { Region: region, ConfigOptions } = getLambdaConfig()
  const lambda = new AWS.Lambda({ credentials, region })

  lambda.updateFunctionConfiguration(ConfigOptions).promise()
    .then(data => {
      console.log(clc.green("SUCCESS"), "- lambda", clc.cyan(data.FunctionName), "config updated")
      console.log(data)
      next()
    })
    .catch(err => {
      console.log(clc.red("FAILED"), "-", clc.red(err.message))
      next(err)
    })
})

/**
 *  Deletes your AWS Lambda function;
 *  @task {update-config}
 *  @order {8}
 */
gulp.task("delete", next => {
  const { Region: region, ConfigOptions: { FunctionName } } = getLambdaConfig()
  const lambda = new AWS.Lambda({ credentials, region })
  lambda.deleteFunction({ FunctionName }).promise()
    .then(() => {
      console.log(clc.green("SUCCESS"), "- lambda deleted")
      next()
    })
    .catch(err => {
      console.log(clc.red("FAILED"), "-", clc.red(err.message))
      next(err)
    })
})

/**
 *  Prints in the console all logs generated by you Lambda
 *  function in Amazon CloudWatch;
 *  @task {logs}
 *  @order {9}
 */
gulp.task("logs", () => {
  const { ConfigOptions: { FunctionName }, Region: region } = getLambdaConfig()
  const cwlogs = new CwLogs({
    logGroupName:`/aws/lambda/${FunctionName}`,
    region,
    momentTimeFormat: "hh:mm:ss:SSS",
    logFormat: "lambda",
    credentials
  })

  cwlogs.start()
})

/**
 * Invokes the Lambda function passing test-payload.js as
 * payload and printing the response to the console;
 * @task {invoke}
 * @order {10}
 */
gulp.task("invoke", next => {
  const { Region: region, ConfigOptions: { FunctionName } } = getLambdaConfig()

  const lambda = new AWS.Lambda({ credentials, region })

  let Payload
  try {
    Payload = JSON.stringify(require("./test-payload.js"))
  } catch(err) {
    return next(err)
  }
  lambda.invoke({
    FunctionName,
    InvocationType: "RequestResponse",
    LogType: "None",
    Payload
  }).promise()
    .then(data => {
      console.log(clc.green("SUCCESS"), "- lambda invocation done")
      try {
        console.log(JSON.parse(data.Payload))
      } catch (_) {
        console.log(data.Payload)
      }
      next()
    })
    .catch(err => {
      console.log(clc.red("FAILED"), "-", clc.red(err.message))
      next(err)
    })
})

/**
 * Invokes the Lambda function LOCALLY passing test-payload.js
 * as payload and printing the response to the console;
 * @task {invoke-local}
 * @order {11}
 */
gulp.task("invoke-local", next => {
  require(path.join(__dirname, "test-local.js"))(next)
})
