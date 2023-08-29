const AWS = require('aws-sdk');
const core = require('@actions/core');
const config = require('./configuration');

function buildUserDataScript(label, githubRegistrationToken) {
  return [
    '#!/bin/bash',
    'mkdir actions-runner && cd actions-runner',
    `echo "${config.input.preRunnerScript}" > pre-runner-script.sh`,
    'source pre-runner-script.sh',
    'case $(uname -m) in aarch64) ARCH="arm64" ;; amd64|x86_64) ARCH="x64" ;; esac && export RUNNER_ARCH=${ARCH}',
    'curl -O -L https://github.com/actions/runner/releases/download/v2.299.1/actions-runner-linux-${RUNNER_ARCH}-2.299.1.tar.gz',
    'tar xzf ./actions-runner-linux-${RUNNER_ARCH}-2.299.1.tar.gz',
    'export RUNNER_ALLOW_RUNASROOT=1',
    `./config.sh --url https://github.com/${config.githubContext.owner}/${config.githubContext.repo} --token ${githubRegistrationToken} --labels ${label}`,
    './run.sh',
  ];
}

async function startInstance(label, githubRegistrationToken) {
  const ec2 = new AWS.EC2();
  const userData = buildUserDataScript(label, githubRegistrationToken);
  const parameters = {
    ImageId: config.input.imageId,
    InstanceType: config.input.instanceType,
    MinCount: 1,
    MaxCount: 1,
    UserData: Buffer.from(userData.join('\n')).toString('base64'),
    SubnetId: config.input.subnetId,
    SecurityGroupIds: [config.input.securityGroupId],
    IamInstanceProfile: { Name: config.input.iamRoleName },
    TagSpecifications: config.tagSpecifications,
  };

  try {
    const result = await ec2.runInstances(parameters).promise();
    const id = result.Instances[0].InstanceId;
    core.info(`AWS EC2 Instance has started, the id is ${id}`);
    return id;
  } catch (error) {
    core.error('AWS EC2 Instance has failed during startup.');
    throw error;
  }
}

async function deleteInstance() {
  const ec2 = new AWS.EC2();
  const parameters = {
    InstanceIds: [config.input.instanceId],
  };

  try {
    await ec2.terminateInstances(parameters).promise();
    core.info(`AWS EC2 instance ${config.input.instanceId} is terminated`);
    return;
  } catch (error) {
    core.error(`AWS EC2 instance ${config.input.instanceId} termination error`);
    throw error;
  }
}

async function waitForInstance(instanceId) {
  const ec2 = new AWS.EC2();
  try {
    await ec2.waitFor('instanceRunning', { InstanceIds: [instanceId] }).promise();
    core.info(`AWS EC2 instance ${instanceId} is up and running`);
    return;
  } catch (error) {
    core.error(`AWS EC2 instance ${instanceId} initialization error`);
    throw error;
  }
}

module.exports = {
  startInstance,
  deleteInstance,
  waitForInstance,
};