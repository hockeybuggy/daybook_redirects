import fs from "fs-extra";
import { Client } from "@notionhq/client";

// This is a way that I can capture what the results are and turn them into
// test fixtures.
const CAPTURE_SNAPSHOT = false;

// The default (and max) page size is 100. We could use smaller pages since
// we're searching for exact matches but we found that sometimes results with
// exact matches get filtered out.
const PAGE_SIZE = 100;

class NotionClient {
  notion: Client;

  constructor(token: string) {
    // Initializing a client
    this.notion = new Client({ auth: token });
  }

  async searchByQuery(query: string): Promise<any> {
    const result = await this.notion.search({
      query,
      page_size: PAGE_SIZE,
    });

    if (CAPTURE_SNAPSHOT) {
      fs.writeFileSync(
        `./build/fixture-notion-query-${query}.json`,
        JSON.stringify(result, null, 2)
      );
    }
    return result;
  }
}

export default NotionClient;
