const core = require('@actions/core')
const { RepositoryManager } = require('./repositoryManager')
const { toCSV } = require('./csvHelper')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const org = core.getInput('github-org', { required: true })
    const token = core.getInput('github-token', { required: true })

    const repoManager = new RepositoryManager(token)
    const repositories = await repoManager.getRepositories(org, token)
    const results = await repoManager.processRepositories(repositories)
    const fileName = toCSV(results, org)

    // Set outputs for other workflow steps to use
    core.setOutput('file', fileName)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
