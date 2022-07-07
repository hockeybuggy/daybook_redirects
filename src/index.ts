import fs from "fs-extra";
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

const generate_site_service = new GenerateSiteService({
  notionClient,
  today: new Date(),
  fs: fs,
});

generate_site_service.generate();
