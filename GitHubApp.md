# About

Setting up GitHub App.

## Create a new App

Go to Organization -> Settings -> GitHub Apps -> New App

## Set the scopes

Set all required scopes for the app.

- Read all repositories
- "Metadata" repository permissions (read)
- "Contents" repository permissions (read)
- "Secrets" repository permissions (read)
- "Environments" repository permissions (read)

For Orgs:

- "Members" (read)

## Generate a private key

Create a private key - it will get downloaded to your machine.

![key](img/image-key.png)

## Install the app in the org

Install the application.

![install](img/image-org.png)

## Note the application ID

Note the ID.

![ID](img/image-id.png)

## Create repository action secrets

Create secrets for the workflow:

- `APP_ID` - ID of the application
- `PRIVATE_KEY` - private key generated in the earlier step
