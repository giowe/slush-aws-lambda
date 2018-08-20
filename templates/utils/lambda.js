const { getServiceInstance, generateRetryFn } = require("./common.js")

const e = module.exports

const getLambdaInstance = e.getLambdaInstance = getServiceInstance("Lambda")

e.create = (functionName, region, description, handler, memorySize, timeout, runtime, roleArn, distBuffer, credentials) => {
  const lambda = getLambdaInstance(credentials, region)
  return generateRetryFn(() => {
    return lambda.createFunction({
      FunctionName: functionName,
      Description: description,
      Handler: handler,
      MemorySize: memorySize,
      Timeout: timeout,
      Runtime: runtime,
      Role: roleArn,
      Code: { ZipFile: distBuffer }
    }).promise()
  }, 10)()
}

e.delete = (functionName, region, credentials) => {
  const lambda = getLambdaInstance(credentials, region)
  return generateRetryFn(() => {
    return lambda.deleteFunction({ FunctionName: functionName }).promise()
  }, 10)()
}

e.updateConfiguration = (functionName, configuration, credentials, region) => {
  const lambda = getLambdaInstance(credentials, region)

  return generateRetryFn(() => {
    const params = Object.assign(configuration, { FunctionName: functionName })
    return lambda.updateFunctionConfiguration(params).promise()
  }, 10)()
}
