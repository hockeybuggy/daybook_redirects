# Daybook redirects

https://daybook-redirects.hockeybuggy.com/

This is a simple static site that creates redirect pages for my "daybooks" (my
daily task list "system").

## Setup

Setup env:
- Notion

## TODO

- [ ] Setup workflow for rebuilding

- [ ] Set Node version

- [ ] Document
    - What does this do
        Once a day this project is rebuilt. Each time it generates pages, when
        loaded, will redirect to a specific notion page. This pages have a
        specific name pattern of yyyy-MM-dd.
    - Clone repo
    - How to generate Notion API key 
    - How to setup Netlify
        - Env: Notion API key
    - Configure GitHub
        - New repository secret
        - Add secret: name: NETLIFY_BUILD_HOOK value: from creating the build hook
    - How to setup Netlify
        - Env: Notion API key

- [ ] Links
  - [X] Today
  - [X] Yesterday
  - [X] Tomorrow
  - [ ] Next Monday
  - [ ] Last Friday
  - [ ] This weekend

- [ ] Licence

- [ ] CI
  - [ ] Linting?
  - [ ] Tests?

- Fancy
  - [ ] Icon
  - [ ] Nicer looking home page
  - [ ] 404 page

- Way to create link to create bookmarks?
