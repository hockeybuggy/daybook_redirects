import fs from "fs-extra";
import { Client } from "@notionhq/client";

class NotionClient {
  notion: Client;

  constructor (token: string) {
    // Initializing a client
    this.notion = new Client({ auth: token });
  }

  async searchByQuery(query: string): Promise<any> {
    const result = await this.notion.search({ query });
    // fs.writeFileSync(`./build/fixture-notion-query-${query}.json`, JSON.stringify(result, null, 2));
    return result;
  }
}

export default NotionClient;
