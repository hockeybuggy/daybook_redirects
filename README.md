# Daybook redirects

https://daybook-redirects.hockeybuggy.com/

This is a simple static site that creates redirect pages for my "daybooks" (my
daily task list "system"). I then use bookmark shortcuts the generated pages
and use them to quickly get to "today's daybook" or "the end of last week's
daybook" (e.g. `ctrl+n, type: td<enter>` to go to today's) 

My notion Workspace is and will remain a private
space, but this project of redirects should be safe to make public.


## What does this do

Once a day this project is rebuilt. Each time it generates pages, when
loaded, will redirect to a specific notion page. This pages have a
specific name pattern of yyyy-MM-dd.

```

                                     ┌──────────────────┐
                                     │ Notion workspace │
                                     │   via the API    │
                                     └────────┬─────────┘
                                            ▲ │
                                            │ │
                                            │ │ Fetching pages via
                                            │ │  search API
                                            │ ▼
 ┌─────────────────┐                   ┌────┴───────────┐
 │ GitHub workflow │  HTTP request     │ Netlify Build  │
 │  Once a day     │ ─────────────────►│  Hook          ├────┐
 └─────────────────┘                   └────────────────┘    │
                                                     Outputs │
                                                             │
                                                             ▼
                            ┌────────────────────────────────────┐
                            │                                    │
                            │ daybook-redirects.hockeybuggy.com/ │
                            │   - yesterday                      │
                            │   - today                          │
                            │   - tomorrow                       │
                            │   - ...                            │
                            └────────────────────────────────────┘


```


## Setup

These instructions guide you through the setup for this project.

### 1. Clone repo

This repo requires node, and yarn. The instructions assume you are running
`fnm` for managing node versions.

```
git clone git@github.com:hockeybuggy/daybook_redirects.git
fnm use
yarn install
```


### 2. Setup a Notion API key

Instructions for setup can be found here:
https://developers.notion.com/docs/getting-started#getting-started

Save the "Internal Integration Token" in the `.env` file after saving it in a
password manager.

```
cp .env.sample .env
$EDITOR .env
```


### 3. Running locally

This project should be able to be run locally with:

```
yarn run build
```


### 4. Setup Netlify

This project assumed the use of Netlify for deploying the site. Go to your
dashboard and create a new project from a Git repository (I guess a fork? Never
tried this).

You will need to set the Notion API token `NOTION_TOKEN` in Netlify.

Optionally setup a custom subdomain of my main website via Netlify (this is
mostly a vanity step)

Create a build hook. This is a url that when posted to will rebuild the site.
This will be used by a GitHub action to rebuild the page on a schedule.


### 5. Configure GitHub Actions

There is a "build" workflow that runs one a day.

Add a new New repository secret:
  - name: NETLIFY_BUILD_HOOK
  - value: <build hook url>



## TODO

- [ ] Links
  - [X] Today
  - [X] Yesterday
  - [X] Tomorrow
  - [ ] Next Monday
  - [ ] Last Friday
  - [ ] This weekend

- [ ] CI
  - [ ] Linting?
  - [ ] Tests?

- Notion request caching
  - I don't feel like every build needs to fetch fresh each time by default.

- Dependencies updating

- Fancy
  - [ ] Warnings if a page can't be built

- Way to create link to create bookmarks?
