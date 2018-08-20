const { generateRetryFn, getServiceInstance } = require("./common.js")

const e = module.exports = { role: {}, policy: {} }

const getIamInstance = e.getIamInstance = getServiceInstance("IAM")

e.role.basicAssumeRolePolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: {
        Service: "lambda.amazonaws.com"
      },
      Action: "sts:AssumeRole"
    }
  ]
}

e.role.create = (roleName, description, assumeRolePolicy, path, credentials, region) => {
  const iam = getIamInstance(credentials, region)
  return generateRetryFn(() => {
    return iam.createRole({
      AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
      RoleName: roleName,
      Description: description,
      Path: path
    }).promise()
  }, 10)()
}

e.role.delete = (roleName, credentials, region) => {
  const iam = getIamInstance(credentials, region)
  return generateRetryFn(() => {
    return iam.deleteRole({ RoleName: roleName }).promise()
  }, 10)()
}

e.policy.basicLambdaPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Action: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      Resource: "arn:aws:logs:*:*:*"
    }
  ]
}

e.policy.create = (policyName, description, policyDocument, path, credentials, region) => {
  const iam = getIamInstance(credentials, region)
  return generateRetryFn(() => {
    return iam.createPolicy({
      PolicyName: policyName,
      PolicyDocument: JSON.stringify(policyDocument),
      Description: description,
      Path: path
    }).promise()
  }, 10)()
}

e.policy.attachRolePolicy = (policyArn, roleName, credentials, region) => {
  const iam = getIamInstance(credentials, region)
  return generateRetryFn(() => {
    return iam.attachRolePolicy({
      PolicyArn: policyArn,
      RoleName: roleName
    }).promise()
  }, 10)()
}

e.policy.detachRolePolicy = (policyArn, roleName, credentials, region) => {
  const iam = getIamInstance(credentials, region)
  return generateRetryFn(() => {
    return iam.detachRolePolicy({
      PolicyArn: policyArn,
      RoleName: roleName
    }).promise()
  }, 10)()
}

e.policy.delete = (policyArn, credentials, region) => {
  const iam = getIamInstance(credentials, region)
  return Promise.resolve()
    .then(() => iam.listPolicyVersions({ PolicyArn: policyArn }).promise())
    .then(({ Versions }) => {
      const deletes = Versions.map(({ VersionId, IsDefaultVersion }) => {
        if (IsDefaultVersion) {
          return Promise.resolve()
        }
        return generateRetryFn(() => iam.deletePolicyVersion({ PolicyArn: policyArn, VersionId }).promise(), 10)()
      })
      return Promise.all(deletes)
    })
    .then(() => {
      return generateRetryFn(() => {
        return iam.deletePolicy({ PolicyArn: policyArn }).promise()
      }, 10)()
    })
}

const getPolicyArn = e.policy.getPolicyArn = (policyName, prefix, credentials, region) => {
  const iam = getIamInstance(credentials, region)
  return Promise.resolve()
    .then(() => iam.getUser().promise())
    .then(({ User: { Arn } }) => {
      const accountId = Arn.split(":")[4]
      return `arn:aws:iam::${accountId}:policy${prefix}${policyName}`
    })
}

e.policy.updateDocument = (policyName, prefix, document, credentials, region) => {
  const iam = getIamInstance(credentials, region)
  const state = {}
  return Promise.resolve()
    .then(() => getPolicyArn(policyName, prefix, credentials, region))
    .then(policyArn => {
      state.policyArn = policyArn
      return iam.listPolicyVersions({ PolicyArn: policyArn }).promise()
    })
    .then(({ Versions }) => {
      if (Versions.length === 5) {
        return generateRetryFn(() => {
          return iam.deletePolicyVersion({ PolicyArn: state.policyArn, VersionId: Versions[4].VersionId }).promise()
        }, 10)()
      } else {
        return Promise.resolve()
      }
    })
    .then(() => {
      return iam.createPolicyVersion({
        PolicyArn: state.policyArn,
        PolicyDocument: JSON.stringify(document),
        SetAsDefault: true
      }).promise()
    })
}
