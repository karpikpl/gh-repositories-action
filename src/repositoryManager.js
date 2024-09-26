const core = require('@actions/core')
const github = require('@actions/github')

const { hold_until_rate_limit_success } = require('./rateLimit')

class RepositoryManager {
  constructor(token) {
    this.octokit = github.getOctokit(token)
    this.token = token
  }

  async getRepositories(organization) {
    try {
      const repositories = []

      // Fetch all repositories for the organization
      // Octokit automatically handles pagination
      for await (const response of this.octokit.paginate.iterator(
        this.octokit.rest.repos.listForOrg,
        {
          org: organization,
          type: 'all' // or 'public', 'private', 'forks', 'sources', 'member'
        }
      )) {
        // Concatenate the current page of repositories
        repositories.push(...response.data)
      }

      return repositories
    } catch (error) {
      core.error(`Error getting repositories: ${error}`)
      return []
    }
  }

  // Function to process repositories
  async processRepositories(repositories) {
    const results = []

    try {
      for (const repo of repositories) {
        core.info(`Processing repository ${repo.name}...`)

        // each repo needs at least 5 API calls
        await hold_until_rate_limit_success(10, this.token)

        // Initialize variables
        const hasActions = await this.hasActions(repo.owner.login, repo.name)
        const hasSecrets = await this.hasSecrets(repo.owner.login, repo.name)
        const environments = await this.getEnvironments(
          repo.owner.login,
          repo.name
        )
        const userPermissions = await this.getUserPermissions(
          repo.owner.login,
          repo.name
        )
        const teams = await this.getTeams(repo.owner.login, repo.name)

        // Add repository to the list
        results.push({
          name: repo.name,
          full_name: repo.full_name,
          id: repo.id,
          node_id: repo.node_id,
          size: repo.size,
          visibility: repo.visibility,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          pushed_at: repo.pushed_at,
          clone_url: repo.clone_url,
          has_issues: repo.has_issues,
          has_projects: repo.has_projects,
          has_downloads: repo.has_downloads,
          has_wiki: repo.has_wiki,
          has_pages: repo.has_pages,
          has_discussions: repo.has_discussions,
          forks_count: repo.forks_count,
          mirror_url: repo.mirror_url,
          archived: repo.archived,
          disabled: repo.disabled,
          open_issues_count: repo.open_issues_count,
          license: repo.license?.name,
          allow_forking: repo.allow_forking,
          is_template: repo.is_template,
          web_commit_signoff_required: repo.web_commit_signoff_required,
          topics: repo.topics,
          forks: repo.forks,
          open_issues: repo.open_issues,
          watchers: repo.watchers,
          default_branch: repo.default_branch,
          permissions: this.formatPermissions(repo.permissions),
          Advanced_Security: repo.security_and_analysis?.advanced_security?.status || 'n/a',
          secret_scanning: repo.security_and_analysis?.secret_scanning?.status  || 'n/a',
          secret_scanning_push_protection: repo.security_and_analysis?.secret_scanning_push_protection?.status  || 'n/a',
          dependabot_security_updates: repo.security_and_analysis?.dependabot_security_updates?.status  || 'n/a',
          secret_scanning_validity_checks: repo.security_and_analysis?.secret_scanning_validity_checks?.status  || 'n/a',
          hasActions,
          teams:
            teams.length > 0
              ? teams.join(', ')
              : 'No teams or repository is empty',
          hasSecrets,
          environments: environments.join(', '),
          userPermissions: userPermissions.join(', ')
        })
      }
    } catch (error) {
      core.error(`An error occurred: ${error}`)
    }
    return results
  }

  async hasActions(owner, repo) {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.github/workflows'
      })

      // If the response is successful and the array is not empty, workflows exist
      if (
        response.data &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        core.debug(`GitHub Actions workflows found in ${owner} / ${repo}.`)
        return true
      } else {
        core.debug(`No GitHub Actions workflows found in ${owner} / ${repo}.`)
        return false
      }
    } catch (error) {
      // If the directory does not exist, a 404 error is thrown
      if (error.status === 404) {
        core.warning(
          `No GitHub Actions workflows found or the repository ${owner} / ${repo} does not exist.`
        )
      } else {
        // Handle other potential errors
        core.error(`An error occurred for ${owner} / ${repo}: ${error.message}`)
      }
    }
    return false
  }

  async hasSecrets(owner, repo) {
    try {
      const response = await this.octokit.rest.actions.listRepoSecrets({
        owner,
        repo
      })

      // Check if the response contains any secrets
      if (response.data.total_count > 0) {
        core.debug(`Secrets found in the repository ${owner} / ${repo}.`)
        return true
      } else {
        core.debug(`No secrets found in the repository ${owner} / ${repo}.`)
        return false
      }
    } catch (error) {
      core.error(
        `An error occurred while checking for secrets in ${owner} / ${repo} : ${error.message}`
      )
      return false
    }
  }

  async getEnvironments(owner, repo) {
    try {
      const response = await this.octokit.rest.repos.getAllEnvironments({
        owner,
        repo,
        per_page: 100
      })

      // Check if the response contains any environments
      if (response.data.total_count > 0) {
        core.debug(`Environments found in the repository ${owner} / ${repo}.`)
        return response.data.environments.map(env => env.name)
      } else {
        core.debug(
          `No environments found in the repository ${owner} / ${repo}.`
        )
        return []
      }
    } catch (error) {
      core.error(
        `An error occurred while checking for environments in ${owner} / ${repo} : ${error.message}`
      )
      return []
    }
  }

  async getUserPermissions(owner, repo) {
    try {
      const response = await this.octokit.rest.repos.listCollaborators({
        owner,
        repo,
        affiliation: 'all',
        per_page: 100
      })

      // Check if the response contains any collaborators
      if (response.data.length > 0) {
        core.debug(`Collaborators found in the repository ${owner} / ${repo}.`)
        return response.data.map(col => `${col.login}:${col.role_name}`)
      } else {
        core.debug(
          `No collaborators found in the repository ${owner} / ${repo}.`
        )
        return []
      }
    } catch (error) {
      core.error(
        `An error occurred while checking for collaborators in ${owner} / ${repo} : ${error.message}`
      )
      return []
    }
  }

  async getTeams(owner, repo) {
    try {
      const response = await this.octokit.rest.repos.listTeams({
        owner,
        repo,
        per_page: 100
      })

      // Check if the response contains any teams
      if (response.data.length > 0) {
        core.debug(`Teams found in the repository ${owner} / ${repo}.`)
        return response.data.map(team => `${team.name}:${team.permission}`)
      } else {
        core.debug(`No teams found in the repository ${owner} / ${repo}.`)
        return []
      }
    } catch (error) {
      core.error(
        `An error occurred while checking for teams in ${owner} / ${repo} : ${error.message}`
      )
      return []
    }
  }

  formatPermissions(permissions) {
    if (!permissions) {
      return ''
    }

    return Object.entries(permissions)
      .map(([key, value]) => `${key}:${value}`)
      .join(', ')
  }
}

module.exports = { RepositoryManager }
