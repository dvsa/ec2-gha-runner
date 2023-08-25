const aws = require('./aws');
const gh = require('./github');
const core = require('@actions/core');
const config = require('./configuration');

function setOutput(label, instanceId) { 
  core.setOutput('label', label);
  core.setOutput('ec2-instance-id', instanceId);
}

async function start() {
  const label = config.generateUniqueLabel();
  const githubRegistrationToken = await gh.getRegistrationToken();
  const instanceId = await aws.startInstance(label, githubRegistrationToken);
  setOutput(label, instanceId);
  await aws.waitForInstance(instanceId);
  await gh.waitForRunnerRegistered(label);
}

async function stop() {
  await aws.deleteInstance();
  await gh.removeRunner();
}

(async function () {
  try {
    config.input.mode === 'start' ? await start() : await stop();
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
})();
