const { Parser } = require('@json2csv/plainjs')
const core = require('@actions/core')
const fs = require('fs')

function toCSV(data, organization) {
  const opts = {}
  const parser = new Parser(opts)
  const csv = parser.parse(data)
  const csvPath = `github_${organization}_output.csv`

  core.info('Checking for existence of previous CSV file...')
  if (fs.existsSync(csvPath)) {
    core.info(`Found file at ${csvPath}, deleting...`)
    fs.unlinkSync(csvPath)
    core.info(`Deleted file at ${csvPath}`)
  }

  fs.writeFileSync(csvPath, csv)
  return csvPath
}

module.exports = { toCSV }
