const core = require('@actions/core')
const github = require('@actions/github')

async function callGitHubAPI(token, callsNeeded) {
  try {
    const octokit = github.getOctokit(token)

    // ignore eslint warning as we need to call the API in a loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // make a dummy request to get the rate limit
      const response = await octokit.request('GET /users/octocat')

      // parse the rate limit from the response headers
      const remaining = parseInt(response.headers['x-ratelimit-remaining'], 10)

      if (remaining < callsNeeded) {
        core.info('Rate limit approaching, waiting for 60 seconds...')
        await new Promise(resolve => setTimeout(resolve, 60000))
      } else {
        core.info(
          `💥 Rate limit checked. We have ${remaining} remaining, continuing...`
        )
        break
      }
    }
  } catch (error) {
    console.error(`Error calling GitHub API: ${error}`)
  }
}

/*
 * This function will call the GitHub API until the rate limit is below the threshold.
 * It will wait for 60 seconds before checking the rate limit again.
 */
async function hold_until_rate_limit_success(callsNeeded, token) {
  try {
    await callGitHubAPI(token, callsNeeded)
  } catch (error) {
    console.error(`Error calling GitHub API: ${error}`)
  }
}

module.exports = { hold_until_rate_limit_success, callGitHubAPI }
