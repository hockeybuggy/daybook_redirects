import { addDays, format, formatISO9075, getISODay, subDays } from "date-fns";
import NotionClient from "./clients/notion";

interface Page {
  name: string;
  url: string;
}

interface PageGenerationError {
  msg: string;
  error: Error;
}

// Exported for testing
export interface FileInterface {
  writeFileSync: (path: string, body: string) => void;
  existsSync: (path: string) => boolean;
  rmSync: (path: string, options: any) => void;
  mkdirSync: (path: string) => void;
  copySync: (path: string, otherPath: string) => void;
}

type Result<T> = T | PageGenerationError;

const dayOfWeekMap = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thur: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

class GenerateSiteService {
  notion: NotionClient;
  today: Date;
  fs: FileInterface;

  constructor(deps: { today: Date; notionClient: NotionClient; fs: any }) {
    this.notion = deps.notionClient;
    this.today = deps.today;
    this.fs = deps.fs;
  }

  fromBaseTemplate(now: Date, body: string) {
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

  async generateNotFoundPage(
    buildDir: string,
    now: Date,
    daybookRootUrl: string | null
  ) {
    let inner = `
      <h1>Daybook Redirects - Not found</h1>

      <p>
        <a href="https://app.netlify.com/sites/daybook-redirects/deploys?filter=main">
          Whoops? Something wrong with the build?
        </a>
      </p>`;
    if (daybookRootUrl) {
      inner =
        inner +
        `
      <p>
        <a href="${daybookRootUrl}">
          Daybooks home page
        </a>
      </p>`;
    }
    const contents = this.fromBaseTemplate(now, inner);

    console.log("Generating not-found page.");
    this.fs.writeFileSync(`${buildDir}/not-found.html`, contents);
  }

  async generateIndexPage(
    buildDir: string,
    now: Date,
    daybookRootUrl: string,
    links: Array<{ name: string; url: string }>
  ) {
    const linksUl = links.reduce((acc, curr) => {
      const link = `<li><a href="${curr.url}">${curr.name}</a></li>\n`;
      return acc + link;
    }, "");

    let daybookRootLink = "";
    if (daybookRootUrl) {
      daybookRootLink = `
      <p>
        <a href="${daybookRootUrl}">
          Daybooks home page
        </a>
      </p>`;
    }

    const contents = this.fromBaseTemplate(
      now,
      `
      <h1>Daybook Redirects</h1>

      <ul>
        ${linksUl}
      </ul>

      ${daybookRootLink}
    `
    );
    console.log("Generating index page.");
    this.fs.writeFileSync(`${buildDir}/index.html`, contents);
  }

  generateRedirectPage(name: string, targetUrl: string) {
    return `
<!DOCTYPE html>
<meta charset="utf-8">
<title>Redirecting to ${name}: ${targetUrl}</title>
<meta http-equiv="refresh" content="0; URL=${targetUrl}">
<link rel="shortcut icon" type="image/png" href="favicon.png"/>
<link rel="canonical" href="${targetUrl}">
`;
  }

  async fetchAndWriteRedirect(buildDir: string, name: string, dayStr: string) {
    console.log(`Generating ${name} page: ${dayStr}`);

    // This works because the pages match the naming scheme of yyyy-MM-dd
    const dayBookSearchResponse = await this.notion.searchByQuery(dayStr);

    console.log(dayBookSearchResponse);
    // if (dayBookSearchResponse !== {}) {
    //   return;
    // }

    // TODO assert that the results are non empty
    // TODO assert that the results are the correct page type
    const targetUrl = dayBookSearchResponse.results[0].url;

    const contents = this.generateRedirectPage(name, targetUrl);

    this.fs.writeFileSync(`${buildDir}/${name}.html`, contents);
  }

  async generateTodayPage(buildDir: string, now: Date): Promise<Result<Page>> {
    const name = "today";
    const todayStr = format(now, "yyyy-MM-dd");
    try {
      await this.fetchAndWriteRedirect(buildDir, name, todayStr);
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return { name, url: `./${name}.html` };
  }

  async generateYesterdayPage(
    buildDir: string,
    now: Date
  ): Promise<Result<Page>> {
    const name = "yesterday";
    const todayStr = format(subDays(now, 1), "yyyy-MM-dd");
    try {
      await this.fetchAndWriteRedirect(buildDir, name, todayStr);
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return { name, url: `./${name}.html` };
  }

  async generateTomorrowPage(
    buildDir: string,
    now: Date
  ): Promise<Result<Page>> {
    const name = "tomorrow";
    const todayStr = format(addDays(now, 1), "yyyy-MM-dd");
    try {
      await this.fetchAndWriteRedirect(buildDir, name, todayStr);
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return { name, url: `./${name}.html` };
  }

  async generateNextMondayPage(
    buildDir: string,
    now: Date
  ): Promise<Result<Page>> {
    const name = "next-monday";
    const offsetDays = 7 - (getISODay(now) - dayOfWeekMap["Mon"]);
    const day = addDays(now, offsetDays);
    try {
      await this.fetchAndWriteRedirect(
        buildDir,
        name,
        format(day, "yyyy-MM-dd")
      );
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return { name, url: `./${name}.html` };
  }

  async generateThisWeekendPage(
    buildDir: string,
    now: Date
  ): Promise<Result<Page>> {
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
    try {
      await this.fetchAndWriteRedirect(
        buildDir,
        name,
        format(day, "yyyy-MM-dd")
      );
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return { name, url: `./${name}.html` };
  }

  async generateNextWeekendPage(
    buildDir: string,
    now: Date
  ): Promise<Result<Page>> {
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
    try {
      await this.fetchAndWriteRedirect(
        buildDir,
        name,
        format(day, "yyyy-MM-dd")
      );
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return { name, url: `./${name}.html` };
  }

  async generateLastFriday(buildDir: string, now: Date): Promise<Result<Page>> {
    const name = "last-friday";
    const offsetDays = -(getISODay(now) - dayOfWeekMap["Fri"]);
    const day = addDays(now, offsetDays);
    try {
      await this.fetchAndWriteRedirect(
        buildDir,
        name,
        format(day, "yyyy-MM-dd")
      );
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return { name, url: `./${name}.html` };
  }

  async generate(): Promise<null> {
    const now = this.today;
    console.log(`Running at: ${now}`);

    // TODO drop this (consider moving the .users.me() example)
    // const meResponse = await this.notion.users.me({});
    // console.log(`User id: ${meResponse.id}`);

    // Find the Notion database where all daybooks are kept
    let daybookRootUrl = null;
    const daybookRootPageQuery = await this.notion.searchByQuery("day books");
    if (
      daybookRootPageQuery.results &&
      daybookRootPageQuery.results.length === 1
    ) {
      daybookRootUrl = daybookRootPageQuery.results[0].url;
    }

    const buildDir = "./build";
    console.log(`Setting up build directory: ${buildDir}`);
    if (this.fs.existsSync(buildDir)) {
      this.fs.rmSync(buildDir, { recursive: true });
    }
    this.fs.mkdirSync(buildDir);

    const results = [];
    results.push(await this.generateYesterdayPage(buildDir, now));
    results.push(await this.generateTodayPage(buildDir, now));
    results.push(await this.generateTomorrowPage(buildDir, now));
    results.push(await this.generateNextMondayPage(buildDir, now));
    results.push(await this.generateThisWeekendPage(buildDir, now));
    results.push(await this.generateNextWeekendPage(buildDir, now));
    results.push(await this.generateLastFriday(buildDir, now));

    const pages = results.filter(
      (r) => r !== null && (r as Page).name !== undefined
    ) as Array<Page>;
    const generationErrors = results.filter(
      (r) => r !== null && (r as PageGenerationError).msg !== undefined
    ) as Array<Page>;
    console.log(generationErrors);

    await this.generateNotFoundPage(buildDir, now, daybookRootUrl);
    await this.generateIndexPage(buildDir, now, daybookRootUrl, pages);

    console.log("Copying static files into build directory");
    this.fs.copySync("./static", buildDir);

    console.log("Done");
    return null;
  }
}

export { GenerateSiteService };
