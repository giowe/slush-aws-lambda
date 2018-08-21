const AWS = require("aws-sdk")

const e = module.exports

const wait = (time = 1000) => new Promise(resolve => setTimeout(resolve, time))
e.generateRetryFn = (promiseFnWrapper, retries = 3) => async function retryFn(maxRetries = retries) {
  try {
    return await promiseFnWrapper()
  } catch(err) {
    if (maxRetries > 0) {
      await wait()
      return await retryFn(maxRetries - 1)
    }
    else throw err
  }
}

const clients = {}
e.getServiceInstance = service => (credentials, region) => {
  if (clients[service]) {
    return clients[service]
  } else {
    return clients[service] = new AWS[service]({ credentials, region })
  }
}
