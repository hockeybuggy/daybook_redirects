import fs from "fs-extra";
import { Temporal } from "@js-temporal/polyfill";
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
const localDateTime = Temporal.Now.zonedDateTimeISO(timezone);
console.log("Local datetime", localDateTime);

const generate_site_service = new GenerateSiteService({
  notionClient,
  today: localDateTime,
  fs: fs,
});

generate_site_service.generate();
