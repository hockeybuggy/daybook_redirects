import fs from "fs-extra";
import { parseISO } from "date-fns";
import { zonedTimeToUtc, utcToZonedTime, format } from "date-fns-tz";
import NotionClient from "./clients/notion";
import { GenerateSiteService } from "./services";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

const notionToken = process.env.NOTION_TOKEN;
if (!notionToken) {
  console.error("Error. Could not find value for env var NOTION_TOKEN");
  process.exit(1);
}

const notionClient = new NotionClient(notionToken);

const timezone = "America/Halifax";
// This may be either local time or UTC (e.g. CI uses UTC)
const systemDate = new Date();
console.log("System time", systemDate);
const utcDate = zonedTimeToUtc("2018-09-01 18:01:36.386", timezone);

const generate_site_service = new GenerateSiteService({
  notionClient,
  today: utcDate,
  fs: fs,
});

generate_site_service.generate();
