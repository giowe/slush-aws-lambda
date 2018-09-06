/* eslint-disable no-console */
const { promisify } = require("util")
const clc = require("cli-color")
const zipdir = promisify(require("zip-dir"))
const gulp = require("gulp")
const usage = require("gulp-help-doc")
const install = require("gulp-install")
const { writeFileSync } = require("fs")
const { join } = require("path")
const inquirer = require("inquirer")
const AWS = require("aws-sdk")
const CwLogs = require("aws-cwlogs")
const { env = "staging", debug } = require("simple-argv")
const {
  role: { create: createRole, delete: deleteRole, basicAssumeRolePolicy },
  policy: { create: createPolicy, attachRolePolicy, basicLambdaPolicy, detachRolePolicy, delete: deletePolicy, getPolicyArn, updateDocument: updatePolicyDocument }
} = require("./utils/iam.js")
const {
  create: createLambda,
  delete: deleteLambda,
  updateConfiguration: updateLambdaConfiguration
} = require("./utils/lambda.js")
const success = (...args) => console.log("[" + clc.green("SUCCESS") + "]", ...args)
const error = err => console.error("[" + clc.red("ERROR") + "]", err.message, debug ? err.stack : "")

let lambdaConfig
const getLambdaConfig = () => {
  if (!lambdaConfig) {
    try {
      lambdaConfig = require(join(__dirname, "lambda-config.js"))(env)
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
let lambdaPolicy
const getLambdaPolicy = () => {
  if (!lambdaPolicy) {
    try {
      lambdaPolicy = require(join(__dirname, "lambda-policy.js"))(env)
      console.log(`Using ${env === "production" ? clc.yellow(env) : clc.green(env)} lambda-policy.js`)
    } catch (err) {
      if (err.message.indexOf("Cannot find module") !== -1) {
        throw new Error(`WARNING! lambda policy not found, run command ${clc.cyan("gulp configure")}`)
      } else {
        throw err
      }
    }
  }
  return lambdaPolicy
}

let credentials
try {
  credentials = require(join(__dirname, ".credentials.json"))
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

      writeFileSync(join(__dirname, ".credentials.json"), JSON.stringify(credentials, null, 2))
    })
    .catch(error)
})

/**
 * Set-up all settings of your AWS Lambda;
 * @task {configure}
 * @order {2}
 */
gulp.task("configure", next => {
  let lambdaConfig
  let lambdaPolicy
  try {
    lambdaConfig = require(join(__dirname, "lambda-config.js"))("${env}")
    lambdaPolicy = require(join(__dirname, "lambda-policy.js"))("${env}")
  } catch(_) {}

  inquirer.prompt([
    { type: "input", name: "FunctionName", message: "Function name:", default: lambdaConfig ? lambdaConfig.ConfigOptions.FunctionName : "my-lambda-${env}" },
    { type: "input", name: "Region", message: "Region:",  default: lambdaConfig ? lambdaConfig.Region : "eu-west-1" },
    { type: "input", name: "Description", message: "Description:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.Description : null },
    { type: "input", name: "Handler", message: "Handler:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.Handler : "index.handler" },
    { type: "input", name: "RoleName", message: "RoleName:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.RoleName : "my-lambda-${env}" },
    { type: "input", name: "PolicyName", message: "PolicyName:",  default: lambdaPolicy ? lambdaPolicy.PolicyName : "my-lambda-${env}-lambda" },
    { type: "input", name: "MemorySize", message: "MemorySize:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.MemorySize : "128" },
    { type: "input", name: "Timeout", message: "Timeout:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.Timeout : "3" },
    { type: "input", name: "Runtime", message: "Runtime:",  default: lambdaConfig ? lambdaConfig.ConfigOptions.Runtime : "nodejs8.10" }
  ]).then(config_answers => {
    const lambdaConfigFile =
`module.exports = env => ({
  Region: "${config_answers.Region}",
  ConfigOptions: {
    FunctionName: \`${config_answers.FunctionName}\`,
    Description: "${config_answers.Description}",
    Handler: "${config_answers.Handler}",
    RoleName: \`${config_answers.RoleName}\`,
    MemorySize: ${config_answers.MemorySize},
    Timeout: ${config_answers.Timeout},
    Runtime: "${config_answers.Runtime}",
    Environment: {
      Variables: {
        NODE_ENV: env
      }
    }
  }
})`
    const lambdaPackage = require(join(__dirname, "src/package.json"))
    lambdaPackage.name = config_answers.FunctionName
    lambdaPackage.description = config_answers.Description
    writeFileSync(join(__dirname, "/src/package.json"), JSON.stringify(lambdaPackage, null, 2))
    writeFileSync(join(__dirname, "/lambda-config.js"), lambdaConfigFile)
    const lambdaPolicyFile =
`module.exports = env => ({
  PolicyName: \`${config_answers.PolicyName}\`,
  Prefix: \`/\${env}/\`,
${JSON.stringify({
    PolicyDocument: basicLambdaPolicy
  }, null, 2).slice(2, -2)}
})`
    writeFileSync(join(__dirname, "/lambda-policy.js"), lambdaPolicyFile)
    success("Lambda configuration saved")
    next()
  })
    .catch(error)
})

/**
 *  Install npm packages inside the src folder
 *  @task {install}
 *  @order {3}
 */
gulp.task("install", () => {
  return gulp.src(join(__dirname, "src/package.json"))
    .pipe(install())
})

/**
 *  Wrap everything inside the src folder in a zip file and upload
 *  it to AWS to create your new AWS Lambda using the configuration
 *  information you set in the lambda_config.json file;
 *  @task {create}
 *  @order {4}
 */
gulp.task("create", () => {
  return zipdir(join(__dirname, "src"))
    .then(ZipFile => {
      const { ConfigOptions, Region: region } = getLambdaConfig()
      const { PolicyName, PolicyDocument, Prefix: policyPrefix } = getLambdaPolicy()
      const state = {}
      const promises = [
        createRole(ConfigOptions.RoleName, `${ConfigOptions.FunctionName} lambda role`, basicAssumeRolePolicy, `/${env}/`, credentials, region)
          .then(({ Role: { RoleName: roleName, Arn: roleArn } }) => {
            state.roleArn = roleArn
            success(`Role ${roleName} created`)
          }),
        createPolicy(PolicyName, `Lambda "${ConfigOptions.FunctionName}" project policy attached to "${ConfigOptions.RoleName}"`, PolicyDocument, policyPrefix, credentials, region)
          .then(({ Policy: { Arn: policyArn } }) => {
            Object.assign(state, { policyArn })
            success(`Policy ${PolicyName} created`)
          })
      ]
      return Promise.all(promises)
        .then(() => attachRolePolicy(state.policyArn, ConfigOptions.RoleName, credentials, region))
        .then(() => {
          success(`Policy ${PolicyName} attached to ${ConfigOptions.RoleName}`)
          return createLambda(ConfigOptions.FunctionName, region, ConfigOptions.Description, ConfigOptions.Handler, ConfigOptions.MemorySize, ConfigOptions.Timeout, ConfigOptions.Runtime, state.roleArn, ZipFile, credentials)
        })
        .then(() => success(`lambda ${ConfigOptions.FunctionName} created`))
        .catch(error)
    })
    .catch(error)
})

/**
 *  Update lambda policy, wrap everything inside the src folder in a zip file and upload
 *  it to AWS to update your existing AWS Lambda using the configuration
 *  information you set in the lambda-config.json file;
 *  @task {update}
 *  @order {5}
 */
gulp.task("update", ["update-policy", "update-config", "update-code"])

/**
 *  Wrap everything inside the src folder in a zip file and upload
 *  it to AWS to update the code of your existing AWS Lambda;
 *  @task {update-code}
 *  @order {6}
 */
gulp.task("update-code", next => {
  return zipdir(join(__dirname, "src"))
    .then(ZipFile => {
      const { Region: region, ConfigOptions: { FunctionName } } = getLambdaConfig()
      const lambda = new AWS.Lambda({ credentials, region })
      lambda.updateFunctionCode({ FunctionName, ZipFile }).promise()
        .then(data => {
          success("lambda", clc.cyan(data.FunctionName), "code updated")
          console.log(data)
          // next()
        })
        .catch(err => {
          error(err)
          next(err)
        })
    })
    .catch(error)
})

/**
 *  Change your AWS Lambda configuration using the information
 *  you set in the lambda-config.json file;
 *  @task {update-config}
 *  @order {7}
 */
gulp.task("update-config", () => {
  const { Region: region, ConfigOptions } = getLambdaConfig()
  const { FunctionName: functionName } = ConfigOptions
  delete ConfigOptions.FunctionName
  delete ConfigOptions.RoleName

  return updateLambdaConfiguration(functionName, ConfigOptions, credentials, region).then(() => success("Lambda config updated"))
    .catch(error)
})

/**
 *  Update Lambda policy document using the information
 *  you set in the lambda-policy.js file;
 *  @task {update-policy}
 *  @order {8}
 */
gulp.task("update-policy", () => {
  const { Region: region } = getLambdaConfig()
  const { PolicyName, Prefix, PolicyDocument } = getLambdaPolicy()

  return updatePolicyDocument(PolicyName, Prefix, PolicyDocument, credentials, region).then(() => success("Lambda policy document updated"))
    .catch(error)
})

/**
 *  Delete your AWS Lambda function;
 *  @task {delete}
 *  @order {9}
 */
gulp.task("delete", () => {
  const { Region: region, ConfigOptions: { FunctionName, RoleName } } = getLambdaConfig()
  const { PolicyName, Prefix } = getLambdaPolicy()
  const state = {}
  return getPolicyArn(PolicyName, Prefix, credentials, region)
    .then(policyArn => {
      state.policyArn = policyArn
      const promises = [
        detachRolePolicy(policyArn, RoleName, credentials, region).then(() => success(`Policy ${PolicyName} detached`)),
        deleteLambda(FunctionName, region, credentials).then(() => success(`lambda ${FunctionName} deleted`))
      ]
      return Promise.all(promises)
    })
    .then(() => {
      const deletes = [
        deleteRole(RoleName, credentials, region).then(() => success(`Role ${RoleName} deleted`)),
        deletePolicy(state.policyArn, credentials, region).then(() => success(`Policy ${PolicyName} deleted`))
      ]
      return Promise.all(deletes)
    })
    .catch(error)
})

/**
 *  Print in the console all logs generated by you Lambda
 *  function in Amazon CloudWatch;
 *  @task {logs}
 *  @order {10}
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
 * Invoke the Lambda function passing test-payload.js as
 * payload and printing the response to the console;
 * @task {invoke}
 * @order {11}
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
  return lambda.invoke({
    FunctionName,
    InvocationType: "RequestResponse",
    LogType: "None",
    Payload
  }).promise()
    .then(data => {
      success("lambda invocation done")
      try {
        console.log(JSON.parse(data.Payload))
      } catch (_) {
        console.log(data.Payload)
      }
    })
    .catch(error)
})

/**
 * Invoke the Lambda function LOCALLY passing test-payload.js
 * as payload and printing the response to the console;
 * @task {invoke-local}
 * @order {12}
 */
gulp.task("invoke-local", next => {
  require(join(__dirname, "utils", "test-local.js"))(next)
})
