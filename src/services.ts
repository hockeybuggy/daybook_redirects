import { Temporal } from "@js-temporal/polyfill";
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
  today: Temporal.ZonedDateTime;
  fs: FileInterface;

  constructor(deps: {
    today: Temporal.ZonedDateTime;
    notionClient: NotionClient;
    fs: any;
  }) {
    this.notion = deps.notionClient;
    this.today = deps.today;
    this.fs = deps.fs;
  }

  fromBaseTemplate(
    now: Temporal.ZonedDateTime,
    title: null | string,
    body: string
  ) {
    const humanFormattedNow = now.toString({ timeZoneName: "never" });
    return `
<!DOCTYPE html>

<html lang="en">
<head>
<meta charset="utf-8">
<title>Daybook redirects${title ? ` - ${title}` : ""}</title>
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
    <p><em>Updated: ${humanFormattedNow}</em></p>
  <footer>
</body>
</html>
`;
  }

  async generateNotFoundPage(
    buildDir: string,
    now: Temporal.ZonedDateTime,
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
    const contents = this.fromBaseTemplate(now, "Not found", inner);

    console.log("Generating not-found page.");
    this.fs.writeFileSync(`${buildDir}/not-found.html`, contents);
  }

  async generateIndexPage(
    buildDir: string,
    now: Temporal.ZonedDateTime,
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
      null,
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

  async fetchAndWriteRedirect(
    buildDir: string,
    name: string,
    dayStr: string,
    options?: { mobilePage: boolean }
  ) {
    console.log(`Generating ${name} page: ${dayStr}`);

    // This works because the pages match the naming scheme of yyyy-MM-dd
    const dayBookSearchResponse = await this.notion.searchByQuery(dayStr);

    if (dayBookSearchResponse.results.length === 0) {
      throw Error(`Found no results for ${dayStr}`);
    }

    const selectedResult = dayBookSearchResponse.results.find((result: any) => {
      if (!result.properties.Name) {
        return false;
      }
      return dayStr === result.properties.Name.title[0].plain_text;
    });

    if (!selectedResult) {
      throw Error(`Could not find result with title ${dayStr} in results`);
    }
    const targetUrl = selectedResult.url;

    const contents = this.generateRedirectPage(name, targetUrl);
    this.fs.writeFileSync(`${buildDir}/${name}.html`, contents);

    if (options && options.mobilePage) {
      const mobileUrl = targetUrl.replace("https://", "notion://");
      const contents = this.generateRedirectPage(name, mobileUrl);
      this.fs.writeFileSync(`${buildDir}/${name}-mobile.html`, contents);
    }
  }

  async generateDaybooksPage(buildDir: string, url: string) {
    const name = "daybooks";
    console.log(`Generating ${name} page`);

    const contents = this.generateRedirectPage(name, url);

    this.fs.writeFileSync(`${buildDir}/${name}.html`, contents);

    return [{ name, url: `./${name}.html` }];
  }

  async generateTodayPage(
    buildDir: string,
    now: Temporal.ZonedDateTime
  ): Promise<Result<Array<Page>>> {
    const name = "today";
    const todayStr = now.toPlainDate().toString();
    try {
      await this.fetchAndWriteRedirect(buildDir, name, todayStr, {
        mobilePage: true,
      });
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return [
      { name, url: `./${name}.html` },
      { name, url: `./${name}-mobile.html` },
    ];
  }

  async generateYesterdayPage(
    buildDir: string,
    now: Temporal.ZonedDateTime
  ): Promise<Result<Array<Page>>> {
    const name = "yesterday";
    const yesterdayStr = now.subtract({ days: 1 }).toPlainDate().toString();
    try {
      await this.fetchAndWriteRedirect(buildDir, name, yesterdayStr);
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return [{ name, url: `./${name}.html` }];
  }

  async generateTomorrowPage(
    buildDir: string,
    now: Temporal.ZonedDateTime
  ): Promise<Result<Array<Page>>> {
    const name = "tomorrow";
    const tomorrowStr = now.add({ days: 1 }).toPlainDate().toString();
    try {
      await this.fetchAndWriteRedirect(buildDir, name, tomorrowStr);
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return [{ name, url: `./${name}.html` }];
  }

  async generateNextMondayPage(
    buildDir: string,
    now: Temporal.ZonedDateTime
  ): Promise<Result<Array<Page>>> {
    const name = "next-monday";
    const offsetDays = 7 - (now.dayOfWeek - dayOfWeekMap["Mon"]);
    const dayStr = now.add({ days: offsetDays }).toPlainDate().toString();
    try {
      await this.fetchAndWriteRedirect(buildDir, name, dayStr);
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return [{ name, url: `./${name}.html` }];
  }

  async generateThisWeekendPage(
    buildDir: string,
    now: Temporal.ZonedDateTime
  ): Promise<Result<Array<Page>>> {
    const name = "this-weekend";
    let offsetDays: number;
    if (now.dayOfWeek === dayOfWeekMap["Sat"]) {
      offsetDays = 0;
    } else if (now.dayOfWeek === dayOfWeekMap["Sun"]) {
      offsetDays = 1;
    } else {
      offsetDays = 7 - (now.dayOfWeek - dayOfWeekMap["Sat"]);
    }
    const dayStr = now.add({ days: offsetDays }).toPlainDate().toString();
    try {
      await this.fetchAndWriteRedirect(buildDir, name, dayStr);
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return [{ name, url: `./${name}.html` }];
  }

  async generateNextWeekendPage(
    buildDir: string,
    now: Temporal.ZonedDateTime
  ): Promise<Result<Array<Page>>> {
    const name = "next-weekend";
    if (
      now.dayOfWeek !== dayOfWeekMap["Sat"] &&
      now.dayOfWeek !== dayOfWeekMap["Sun"]
    ) {
      // This only generates if it's the weekend.
      return null;
    }

    const offsetDays = 7 - (now.dayOfWeek - dayOfWeekMap["Sun"]);
    const dayStr = now.add({ days: offsetDays }).toPlainDate().toString();
    try {
      await this.fetchAndWriteRedirect(buildDir, name, dayStr);
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return [{ name, url: `./${name}.html` }];
  }

  async generateLastFriday(
    buildDir: string,
    now: Temporal.ZonedDateTime
  ): Promise<Result<Array<Page>>> {
    const name = "last-friday";
    const offsetDays = -(now.dayOfWeek - dayOfWeekMap["Fri"]);
    const dayStr = now.add({ days: offsetDays }).toPlainDate().toString();
    try {
      await this.fetchAndWriteRedirect(buildDir, name, dayStr);
    } catch (e) {
      return { msg: `Could not generate ${name} page`, error: e };
    }

    return [{ name, url: `./${name}.html` }];
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
    results.push(await this.generateDaybooksPage(buildDir, daybookRootUrl));
    results.push(await this.generateYesterdayPage(buildDir, now));
    results.push(await this.generateTodayPage(buildDir, now));
    results.push(await this.generateTomorrowPage(buildDir, now));
    results.push(await this.generateNextMondayPage(buildDir, now));
    results.push(await this.generateThisWeekendPage(buildDir, now));
    results.push(await this.generateNextWeekendPage(buildDir, now));
    results.push(await this.generateLastFriday(buildDir, now));

    const pages = results
      .flat()
      .filter(
        (r) => r !== null && (r as Page).name !== undefined
      ) as Array<Page>;
    const generationErrors = results
      .flat()
      .filter(
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
