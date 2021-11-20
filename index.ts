import * as fs from "fs";
import { addDays, format, subDays } from "date-fns";
import { Client } from "@notionhq/client";

require("dotenv").config();

// TODO add a env var guard for `NOTION_TOKEN`. Fail when not there.
const notionToken = process.env.NOTION_TOKEN;
if (!notionToken) {
  console.error("Error. Could not find value for env var NOTION_TOKEN");
  process.exit(1);
}

// Initializing a client
const notion = new Client({ auth: notionToken });

async function generateIndexPage(buildDir: string) {
  const contents = `
<!DOCTYPE html>
<head>
<meta charset="utf-8">
<title>Daybook redirects</title>
</head>
<body>
  <h1>Daybook Redirects</h1>

  <p>TODO list all of the urls</p>
</body>
`;
  console.log("Generating Index page.");
  fs.writeFileSync(`${buildDir}/index.html`, contents);
}

function generateRedirectPage(name: string, targetUrl: string) {
  return `
<!DOCTYPE html>
<meta charset="utf-8">
<title>Redirecting to ${name}: ${targetUrl}</title>
<meta http-equiv="refresh" content="0; URL=${targetUrl}">
<link rel="canonical" href="${targetUrl}">
`;
}

async function fetchAndWriteRedirect(
  buildDir: string,
  name: string,
  dayStr: string
) {
  console.log(`Generating ${name} page: ${dayStr}`);

  // This works because the pages match the naming scheme of yyyy-MM-dd
  const dayBookSearchResponse = await notion.search({ query: dayStr });

  // TODO assert that the results are non empty
  // TODO assert that the results are the correct page type
  const targetUrl = dayBookSearchResponse.results[0].url;

  const contents = generateRedirectPage(name, targetUrl);

  fs.writeFileSync(`${buildDir}/${name}.html`, contents);
}

async function generateTodayPage(buildDir: string, now: Date) {
  const name = "today";
  const todayStr = format(now, "yyyy-MM-dd");
  fetchAndWriteRedirect(buildDir, name, todayStr);
}

async function generateYesterdayPage(buildDir: string, now: Date) {
  const name = "yesterday";
  const todayStr = format(subDays(now, 1), "yyyy-MM-dd");
  fetchAndWriteRedirect(buildDir, name, todayStr);
}

async function generateTomorrowPage(buildDir: string, now: Date) {
  const name = "tomorrow";
  const todayStr = format(addDays(now, 1), "yyyy-MM-dd");
  fetchAndWriteRedirect(buildDir, name, todayStr);
}

(async () => {
  const now = new Date();
  console.log(`Running at: ${now}`);

  const meResponse = await notion.users.me({});
  console.log(`User id: ${meResponse.id}`);

  const buildDir = "./build";
  console.log(`Setting up build directory: ${buildDir}`);
  if (fs.existsSync(buildDir)) {
    fs.rmdirSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir);

  await generateIndexPage(buildDir);
  await generateYesterdayPage(buildDir, now);
  await generateTodayPage(buildDir, now);
  await generateTomorrowPage(buildDir, now);
  console.log("Done");
})();
