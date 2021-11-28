import fs from "fs-extra";
import { GenerateSiteService } from "./services";

class NotionClientDouble {
  token: string;
  constructor(token: string) {
    this.token = token;
  }

  async searchByQuery(query: string): Promise<any> {
    if (query === "2021-11-28") {
      return {};
    }
    try {
      const data = await fs.readFile(
        `./test_fixtures/fixture-notion-query-${query}.json`,
        "utf-8"
      );

      return JSON.parse(data);
    } catch (ex) {
      // throw ex;
      return {};
    }
    // throw Error("Not a query we setup a fixture for");
  }
}

describe("GenerateSiteService", () => {
  it("generates some files", async () => {
    const notion_client = new NotionClientDouble("fake_token");
    const service = new GenerateSiteService({
      file_repo: () => {},
      notion_client,
    });

    await service.generate();
  });
});
