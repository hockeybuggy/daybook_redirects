import fs from "fs-extra";
import { Temporal } from "@js-temporal/polyfill";
import { GenerateSiteService } from "./services";
import NotionClient from "./clients/notion";

class NotionClientDouble {
  token: string;
  constructor(token: string) {
    this.token = token;
  }

  async searchByQuery(query: string): Promise<any> {
    const data = await fs.readFile(
      `./test_fixtures/fixture-notion-query-${query}.json`,
      "utf-8"
    );

    return JSON.parse(data);
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
      today: Temporal.ZonedDateTime.from({
        year: 2021,
        month: 11,
        day: 28,
        hour: 5,
        minute: 1,
        timeZone: "America/Halifax",
      }),
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
    expect(fsDouble.writeFileSync.mock.calls.length).toEqual(11);
    fsDouble.writeFileSync.mock.calls.forEach((call) => {
      expect(call).toMatchSnapshot();
    });

    // Static files from the "static directory are copyied into the build directory"
    expect(fsDouble.copySync).toHaveBeenCalledWith("./static", "./build");
  });

  it("tollerates not being able to find", async () => {
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
      today: Temporal.ZonedDateTime.from({
        year: 2022,
        month: 7,
        day: 16,
        hour: 5,
        minute: 1,
        timeZone: "America/Halifax",
      }),
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
    expect(fsDouble.writeFileSync.mock.calls.length).toEqual(5);
    fsDouble.writeFileSync.mock.calls.forEach((call) => {
      expect(call).toMatchSnapshot();
    });

    // Static files from the "static directory are copyied into the build directory"
    expect(fsDouble.copySync).toHaveBeenCalledWith("./static", "./build");
  });
});
