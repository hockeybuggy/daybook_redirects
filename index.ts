import fs from "fs-extra";
import { addDays, format, formatISO9075, getISODay, subDays } from "date-fns";
import { Client } from "@notionhq/client";

require("dotenv").config();

const notionToken = process.env.NOTION_TOKEN;
if (!notionToken) {
  console.error("Error. Could not find value for env var NOTION_TOKEN");
  process.exit(1);
}

// Initializing a client
const notion = new Client({ auth: notionToken });

function fromBaseTemplate(now: Date, body: string) {
  return `
<!DOCTYPE html>

<html lang="en">
<head>
<meta charset="utf-8">
<title>Daybook redirects - Not Found</title>
<link rel="shortcut icon" type="image/png" href="favicon.png"/>

<style>
  html {
    height: 100%;
  }

  body {
    height: 100%;

    font-family: Courier, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  main
</style>

</head>

<body>
  <main>
    ${body}
  </main>

  <footer>
    <p><em>Updated: ${formatISO9075(now)}</em></p>
  <footer>
</body>
</html>
`;
}

async function generateNotFoundPage(buildDir: string, now: Date) {
  const contents = fromBaseTemplate(
    now,
    `
      <h1>Daybook Redirects - Not found</h1>

      <p>
        <a href="https://app.netlify.com/sites/daybook-redirects/deploys?filter=main">
          Whoops? Something  wrong with the build?
        </a>
      </p>
      );
    `
  );

  console.log("Generating not-found page.");
  fs.writeFileSync(`${buildDir}/not-found.html`, contents);
}

async function generateIndexPage(
  buildDir: string,
  now: Date,
  links: Array<{ name: string; url: string }>
) {
  const linksUl = links.reduce((acc, curr) => {
    const link = `<li><a href="${curr.url}">${curr.name}</a></li>\n`;
    return acc + link;
  }, "");

  const contents = fromBaseTemplate(
    now,
    `
      <h1>Daybook Redirects</h1>

      <ul>
        ${linksUl}
      </ul>
    `
  );
  console.log("Generating index page.");
  fs.writeFileSync(`${buildDir}/index.html`, contents);
}

function generateRedirectPage(name: string, targetUrl: string) {
  return `
<!DOCTYPE html>
<meta charset="utf-8">
<title>Redirecting to ${name}: ${targetUrl}</title>
<meta http-equiv="refresh" content="0; URL=${targetUrl}">
<link rel="shortcut icon" type="image/png" href="favicon.png"/>
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

const dayOfWeekMap = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thur: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

async function generateNextMondayPage(
  buildDir: string,
  now: Date
): Promise<{ name: string; url: string }> {
  const name = "next-monday";
  const offsetDays = 7 - (getISODay(now) - dayOfWeekMap["Mon"]);
  const day = addDays(now, offsetDays);
  fetchAndWriteRedirect(buildDir, name, format(day, "yyyy-MM-dd"));

  return { name, url: `./${name}.html` };
}

async function generateThisWeekendPage(
  buildDir: string,
  now: Date
): Promise<{ name: string; url: string }> {
  const name = "this-weekend";
  let offsetDays: number;
  if (getISODay(now) === dayOfWeekMap["Sat"]) {
    offsetDays = 0;
  } else if (getISODay(now) === dayOfWeekMap["Sun"]) {
    offsetDays = 1;
  } else {
    offsetDays = 7 - (getISODay(now) - dayOfWeekMap["Sat"]);
  }
  const day = addDays(now, offsetDays);
  fetchAndWriteRedirect(buildDir, name, format(day, "yyyy-MM-dd"));

  return { name, url: `./${name}.html` };
}

async function generateNextWeekendPage(
  buildDir: string,
  now: Date
): Promise<{ name: string; url: string }> {
  const name = "next-weekend";
  if (
    getISODay(now) !== dayOfWeekMap["Sat"] &&
    getISODay(now) !== dayOfWeekMap["Sun"]
  ) {
    // This only generates if it's the weekend.
    return null;
  }

  const offsetDays = 7 - (getISODay(now) - dayOfWeekMap["Sun"]);
  const day = addDays(now, offsetDays);
  fetchAndWriteRedirect(buildDir, name, format(day, "yyyy-MM-dd"));

  return { name, url: `./${name}.html` };
}

async function generateLastFriday(
  buildDir: string,
  now: Date
): Promise<{ name: string; url: string }> {
  const name = "last-friday";
  console.log(getISODay(now));
  const offsetDays = -(getISODay(now) - dayOfWeekMap["Fri"]);
  const day = addDays(now, offsetDays);
  console.log(offsetDays, day);
  fetchAndWriteRedirect(buildDir, name, format(day, "yyyy-MM-dd"));

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
  pages.push(await generateNextMondayPage(buildDir, now));
  pages.push(await generateThisWeekendPage(buildDir, now));
  const nextWeekend = await generateNextWeekendPage(buildDir, now);
  if (nextWeekend) {
    pages.push(nextWeekend);
  }
  pages.push(await generateLastFriday(buildDir, now));

  await generateNotFoundPage(buildDir, now);
  await generateIndexPage(buildDir, now, pages);

  console.log("Copying static files into build directory");
  fs.copySync("./static", buildDir);

  console.log("Done");
})();
