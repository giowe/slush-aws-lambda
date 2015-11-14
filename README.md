# slush-aws-lambda
<div>
	<a href="https://www.npmjs.com/package/slush-aws-lambda"><img src='http://img.shields.io/npm/v/slush-aws-lambda.svg?style=flat'></a>
	<a href="https://www.npmjs.com/package/slush-aws-lambda"><img src='https://img.shields.io/npm/dm/slush-aws-lambda.svg?style=flat-square'></a>
	<a href="https://ci.appveyor.com/project/giowe/slush-aws-lambda"><img src='https://ci.appveyor.com/api/projects/status/kdf2m4yas4kkrxel?svg=true'></a>
	<a href="https://david-dm.org/giowe/slush-aws-lambda"><img src='https://david-dm.org/giowe/slush-aws-lambda.svg'></a>
	<a href="https://www.youtube.com/watch?v=Sagg08DrO5U"><img src='http://img.shields.io/badge/gandalf-approved-61C6FF.svg'></a>
</div>

A slush generator to scaffold an AWS Lambda function package and upload it to AWS.

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
To use the slush-aws-lambda solution it's important that you have properly installed the [aws-cli](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) and
configured it with your credentials.

Then, from the folder of your project, run the command
```
gulp configure
```
You can set-up all settings of your AWS Lambda right now, or later at any time by calling this command again, or directly modifying the **lambda_config.json** and the **package.json** in lambda src folder

## Usage
All you have to do is program you function inside the **src** folder; when you are done you can run the following commands:
* `gulp create` - wraps everything inside the src folder in a zip file (after uglifying all of the .js files) and uploads it to AWS to create your new AWS Lambda using the configuration information you set in the **lambda_config.json** file;
* `gulp update` - works exactly the same as the previous command, but on an existing AWS Lambda;
* `gulp update-code` - same as above, but it only updates the code of your AWS Lambda without modifying the configuration;
* `gulp update-code` - only changes your AWS Lambda configuration, but not the code;

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