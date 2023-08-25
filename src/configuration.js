const core = require('@actions/core');
const github = require('@actions/github');

class Configuration {
  constructor() {
    this.input = {
      mode: core.getInput('mode'),
      githubToken: core.getInput('github-token'),
      imageId: core.getInput('ec2-image-id'),
      instanceType: core.getInput('ec2-instance-type'),
      subnetId: core.getInput('subnet-id'),
      securityGroupId: core.getInput('security-group-id'),
      label: core.getInput('label'),
      instanceId: core.getInput('ec2-instance-id'),
      iamRoleName: core.getInput('iam-role-name'),
      runnerHomeDir: core.getInput('runner-home-dir'),
      preRunnerScript: core.getInput('pre-runner-script'),
    };

    const tags = JSON.parse(core.getInput('aws-resource-tags'));

    this.tagSpecifications = null;

    if (tags.length > 0) {
      this.tagSpecifications = [{ ResourceType: 'instance', Tags: tags }, { ResourceType: 'volume', Tags: tags }];
    }

    this.githubContext = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
    };

    if (!this.input.mode) {
      throw new Error(`The 'mode' input is not specified`);
    }

    if (!this.input.githubToken) {
      throw new Error(`The 'github-token' input is not specified`);
    }

    if (this.input.mode === 'start') {
      if (!this.input.imageId || !this.input.instanceType || !this.input.subnetId || !this.input.securityGroupId) {
        throw new Error(`Not all the required inputs are provided for the 'start' mode`);
      }
    } else if (this.input.mode === 'stop') {
      if (!this.input.label || !this.input.instanceId) {
        throw new Error(`Not all the required inputs are provided for the 'stop' mode`);
      }
    } else {
      throw new Error('Wrong mode. Allowed values: start, stop.');
    }
  }

  generateUniqueLabel() {
    return Math.random().toString(36).substr(2, 5);
  }
}

try {
  module.exports = new Configuration();
} catch (error) {
  core.error(error);
  core.setFailed(error.message);
}