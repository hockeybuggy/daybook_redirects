import fs from "fs-extra";
import { addDays, format, subDays } from "date-fns";
import { Client } from "@notionhq/client";

require("dotenv").config();

const notionToken = process.env.NOTION_TOKEN;
if (!notionToken) {
  console.error("Error. Could not find value for env var NOTION_TOKEN");
  process.exit(1);
}

// Initializing a client
const notion = new Client({ auth: notionToken });

async function generateIndexPage(
  buildDir: string,
  links: Array<{ name: string; url: string }>
) {
  const linksUl = links.reduce((acc, curr) => {
    const link = `<li><a href="${curr.url}">${curr.name}</a></li>\n`;
    return acc + link;
  }, "");

  const contents = `
<!DOCTYPE html>
<head>
<meta charset="utf-8">
<title>Daybook redirects</title>

<style>
  body {
    font-family: Courier, sans-serif;
  }
</style>

</head>
<body>
  <h1>Daybook Redirects</h1>

  <ul>
    ${linksUl}
  </ul>
</body>
`;
  console.log("Generating index page.");
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

async function generateTodayPage(
  buildDir: string,
  now: Date
): Promise<{ name: string; url: string }> {
  const name = "today";
  const todayStr = format(now, "yyyy-MM-dd");
  fetchAndWriteRedirect(buildDir, name, todayStr);

  return { name, url: `./${name}.html` };
}

async function generateYesterdayPage(
  buildDir: string,
  now: Date
): Promise<{ name: string; url: string }> {
  const name = "yesterday";
  const todayStr = format(subDays(now, 1), "yyyy-MM-dd");
  fetchAndWriteRedirect(buildDir, name, todayStr);

  return { name, url: `./${name}.html` };
}

async function generateTomorrowPage(
  buildDir: string,
  now: Date
): Promise<{ name: string; url: string }> {
  const name = "tomorrow";
  const todayStr = format(addDays(now, 1), "yyyy-MM-dd");
  fetchAndWriteRedirect(buildDir, name, todayStr);

  return { name, url: `./${name}.html` };
}

(async () => {
  const now = new Date();
  console.log(`Running at: ${now}`);

  const meResponse = await notion.users.me({});
  console.log(`User id: ${meResponse.id}`);

  const buildDir = "./build";
  console.log(`Setting up build directory: ${buildDir}`);
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir);

  const pages = [];
  pages.push(await generateYesterdayPage(buildDir, now));
  pages.push(await generateTodayPage(buildDir, now));
  pages.push(await generateTomorrowPage(buildDir, now));
  await generateIndexPage(buildDir, pages);

  console.log("Copying static files into build directory");
  fs.copySync("./static", buildDir);

  console.log("Done");
})();
