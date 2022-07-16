import fs from "fs-extra";
import { parseISO } from "date-fns";
import { GenerateSiteService, FileInterface } from "./services";
import NotionClient from "./clients/notion";

class NotionClientDouble {
  token: string;
  constructor(token: string) {
    this.token = token;
  }

  async searchByQuery(query: string): Promise<any> {
    try {
      const data = await fs.readFile(
        `./test_fixtures/fixture-notion-query-${query}.json`,
        "utf-8"
      );

      return JSON.parse(data);
    } catch (ex) {
      throw ex;
    }
  }
}

describe("GenerateSiteService", () => {
  it("generates some files", async () => {
    // We'll use a double for the notion client that will used canned fixtures
    // for responses to queries.
    const notionClient = new NotionClientDouble("fake_token");

    // We won't write anything here, we'll just create a spy that will see what
    // would be written.
    const fsDouble = {
      writeFileSync: jest.fn(),
      existsSync: jest.fn(() => false),
      rmSync: jest.fn(),
      mkdirSync: jest.fn(),
      copySync: jest.fn(),
    };
    const service = new GenerateSiteService({
      notionClient: notionClient as unknown as NotionClient,
      today: parseISO("2021-11-28T"),
      fs: fsDouble,
    });

    await service.generate();

    expect(fsDouble.existsSync).toHaveBeenCalledWith("./build");

    // We make sure that the directory exists by calling this invariently
    expect(fsDouble.mkdirSync).toHaveBeenCalledWith("./build");
    // Since we have set `existsSync` to `false` here we don't clean up the
    // results of the directory before running.
    expect(fsDouble.rmSync).not.toHaveBeenCalled();

    // Many different html pages are generate. By using this snapshot we can
    // see what is generated based on the fixture date we're using.
    expect(fsDouble.writeFileSync.mock.calls.length).toEqual(9);
    fsDouble.writeFileSync.mock.calls.forEach((call) => {
      expect(call).toMatchSnapshot();
    });

    // Static files from the "static directory are copyied into the build directory"
    expect(fsDouble.copySync).toHaveBeenCalledWith("./static", "./build");
  });
});
