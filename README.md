# slush-aws-lambda
[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Dependency Status][dependencies-image]][dependencies-url] [![Gandalf Status][gandalf-image]][gandalf-url]

[npm-url]: https://www.npmjs.com/package/slush-aws-lambda
[npm-image]: http://img.shields.io/npm/v/slush-aws-lambda.svg?style=flat
[downloads-image]: https://img.shields.io/npm/dm/slush-aws-lambda.svg?style=flat-square
[dependencies-url]: href="https://david-dm.org/giowe/slush-aws-lambda
[dependencies-image]: https://david-dm.org/giowe/slush-aws-lambda.svg
[gandalf-url]: https://www.youtube.com/watch?v=Sagg08DrO5U
[gandalf-image]: http://img.shields.io/badge/gandalf-approved-61C6FF.svg

A slush generator to scaffold an AWS Lambda function package and upload it to AWS.

This generator helps you to:
* scaffold your AWS Lambda solution;
* create / update / delete the AWS Lambda on your AWS account;
* invoke locally your AWS Lambda with a test payload;
* realtime log into your console all AWS CloudWatch Logs related to your AWS Lambda execution;

## Installation
First of all you have to globally install [Slush](http://slushjs.github.io/#/), the streaming scaffolding system.
```
npm install -g slush
```
then you have to install globally the slush-aws-lambda generator
```
npm install -g slush-aws-lambda
```

## Deployment
To create your solution you simply have to call the generator via the slush cli from the directory where you want to deploy your project
```
slush aws-lambda
```
Now you must provide some info about the project.
You can always insert this information manually later by modifying the solution package.json (both in the project and in the lambda src folder)

## Configuration
To use the slush-aws-lambda solution you can chose between one of this 2 options:
 
1. Run the command
   ```
   gulp credentials
   ```
   to specify a set of project specific AWS credentials that are saved in the project folder and automatically ignored
   in the .gitignore file.

2. install the [aws-cli](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) and run the command `aws configure`


Then, from the folder of your project, run the command
```
gulp configure
```
You can set-up all the configurations of your AWS Lambda right now, or later at any time by calling this command again, or directly modifying the **lambda-config.json** and the **package.json** in lambda src folder

## Usage
All you have to do is to program your function inside the **src** folder; when you are done you can run the following commands:
* `gulp` || `gulp help` - List all gulp tasks and their descriptions;
* `gulp credentials` - Set-up AWS project specific credentials;
* `gulp configure` - Set-up all AWS Lambda configurations;
* `gulp install` - Install npm packages inside the src folder;
* `gulp create [--env staging || production]` - create lambda role and policy, wrap everything inside the src folder in a zip file and upload it to AWS to create your new AWS Lambda using the configuration information you set in the **lambda-config.json** file;
* `gulp update [--env staging || production]` - work exactly the same as the previous command, but on an existing AWS Lambda;
* `gulp update-code [--env staging || production]` - same as above, but it only update the code of your AWS Lambda without modifying the configuration;
* `gulp update-config [--env staging || production]` - only change your AWS Lambda configuration, but not the code;
* `gulp update-config [--env staging || production]` - only change your AWS Lambda policy, but not the code;
* `gulp delete [--env staging || production]` - delete your AWS Lambda function;
* `gulp logs [--env staging || production]` - print in the console all logs generated by you Lambda function in Amazon CloudWatch;
* `gulp invoke [--env staging || production]` - invoke the Lambda function passing test-payload.json as payload and printing the response to the console;
* `gulp invoke-local` ||  `npm test` ||  `node . [--env staging || production]` - invoke the Lambda function LOCALLY passing test-payload.json as payload and printing the response to the console;

## License

The MIT License (MIT)

Copyright (c) 2016 Giovanni Bruno

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
