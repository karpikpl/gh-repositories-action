# Get a report about repositories in the organization

[![GitHub Super-Linter](https://github.com/karpikpl/gh-repositories-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/karpikpl/gh-repositories-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/karpikpl/gh-repositories-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/karpikpl/gh-repositories-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/karpikpl/gh-repositories-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/karpikpl/gh-repositories-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

Produce a CSV file with information about repositories. :rocket:

## Usage

Reading repositories information requires following permissions:

- Token classic with **read:enterprise, read:org, read:user, repo**

that cannot be granted to a workflow. Please either use a PAT or Application
token:

- Make sure provided PAT has the appropriate scope for the organization the
  action is used for.

or

- [Create and install an GitHub App with appropriate scope](GitHubApp.md).

### Using PAT

```yaml
steps:
  - name: GH Repositories Report
    id: gh_repo_report
    uses: karpikpl/gh-repositories-action@v1
    with:
      github-org: your-org-name
      github-pat: ${{ secrets.PAT_NAME_HERE }}
```

### Using App token

```yml
- uses: actions/create-github-app-token@v1
  id: app-token
  with:
    app-id: ${{ vars.APP_ID }}
    private-key: ${{ secrets.PRIVATE_KEY }}

- name: GH Repositories Report
  id: gh_repo_report
  uses: karpikpl/gh-repositories-action@v1
  with:
    github-org: your-org-name
    github-pat: ${{ steps.app-token.outputs.token }}
```

### Detailed example

Example with report upload and action summary.

```yml
name: Create Repositories Report

on:
  # Run automatically when main updated
  push:
    branches:
      - main
  # Run nightly at 5a UTC / 11p CT
  schedule:
    - cron: '0 5 * * *'
  # Permit manual trigger
  workflow_dispatch:

jobs:
  get_repositories_report:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/create-github-app-token@v1
        id: app-token
        with:
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.PRIVATE_KEY }}

      - name: GH Repositories Report
        id: gh_repo_report
        uses: karpikpl/gh-repositories-action@v1
        with:
          github-org: your-org-name
          github-pat: ${{ steps.app-token.outputs.token }}

      # upload artifacts
      - name: Upload repositories report
        uses: actions/upload-artifact@v4
        with:
          name: gh-repo-report
          path: ${{ steps.gh_repo_report.outputs.file }}

      # create a github summary using github script
      - name: Add Summary
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            // read summary file
            const data = fs.readFileSync('${{ steps.gh_repo_report.outputs.file }}', 'utf8');
            const csv = data.split('\n').map(row => row.split(','))
            // header
            for (let i = 0; i < csv[0].length; i++) {
                csv[0][i] = { data: csv[0][i], header: true };
            }

            await core.summary
            .addHeading('GH repositories data')
            .addTable(csv)
            .write()
```

## Inputs

### `github-pat`

**Required** GitHub personal access token or application token with permissions
to **read:enterprise, read:org, read:user, repo**.

### `github-org`

**Required** Name of the GitHub organization.

## Outputs

### `file`

Name of the CSV file
