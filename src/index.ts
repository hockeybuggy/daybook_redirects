import NotionClient from "./clients/notion";
import { GenerateSiteService } from "./services";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

const notionToken = process.env.NOTION_TOKEN;
if (!notionToken) {
  console.error("Error. Could not find value for env var NOTION_TOKEN");
  process.exit(1);
}

const notion_client = new NotionClient(notionToken);

const file_repo = () => {};

const generate_site_service = new GenerateSiteService({
  notion_client,
  file_repo,
  today: new Date(),
});

generate_site_service.generate();
